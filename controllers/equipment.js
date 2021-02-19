'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');

const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};

//!SELECT * FROM EQUIPMENT
exports.index = async function(req, res) {

    console.log('here at index equipment')
	const connection =  await oracledb.getConnection(dbConfig);

	try{
        console.log('extract equipment')
		let result =  await connection.execute('SELECT * FROM equipment',{},dbSelectOptions)
		
		result.rows = result.rows.map(function(r){
			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
			return r;
		})

        console.log('rows fetched: ',result.rows.length)
		response.ok(result.rows, res);
	}catch(err){
		console.log(err)
		//logger.error(err)
	}

	//connection.close()
	// connection.query('SELECT * FROM equipment', function(error, rows, fields) {
	// 	if (error) {
	// 		console.log(error);
	// 	} else {
	// 		response.ok(rows, res);
	// 	}
	// });
};

//!SELECT EQUIPMENT BY ID
exports.getById = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`SELECT * FROM equipment WHERE id = :0`,[req.params.id],dbSelectOptions)
		console.log('getid',result)
		if (result.rows.length > 0) {
			result.rows = result.rows.map(function(r){
				r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				return r;
			})
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: result.rows
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: result.rows
			});
		}
	}catch(err){
		console.log(err)
		//logger.error(err)
	}

	// connection.query('SELECT * FROM `equipment` WHERE `id` = ?', req.params.id, function(err, results, fields) {
	// 	if (err) {
	// 		console.log(err);
	// 	} else {
	// 		if (results.length > 0) {
	// 			res.status(200).json({
	// 				status: 200,
	// 				error: false,
	// 				message: 'Successfully get single data!',
	// 				data: results
	// 			});
	// 		} else {
	// 			res.status(400).json({
	// 				status: 400,
	// 				error: true,
	// 				message: 'No data found!',
	// 				data: results
	// 			});
	// 		}
	// 	}
	// });
};

//!SELECT EQUIPMENT BY FIELDS DATA
exports.search = async function(req, res) {
	const hraId = req.body.hraId;
	const bartagNum = req.body.bartagNum;
	const searchObject = {}

	const PropertyNamesToLowerCase = (data) => {
		data.map(function(r){
			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
			return r;
		})

		return data
	}


	if(hraId != ''){
		searchObject['hraId'] = hraId
	}

	if(bartagNum != ''){
		searchObject['bartagNum'] = bartagNum
	}
	
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let where = hraId != '' || bartagNum != '' ? 'WHERE ' : ''
		let hraFind = hraId != '' ? 'hra_num = :hraId ' : ''
		let bartagFind = bartagNum != '' ? 'bar_tag_num = :bartagNum ' : ''
		let andCause = hraFind  != '' & bartagNum != '' ? 'AND ' : ''

		let query = 'SELECT * FROM equipment ' + where + hraFind + andCause + bartagFind
		let resultEquipment =  await connection.execute(`${query}`,searchObject,dbSelectOptions)
		
		if (resultEquipment.rows.length > 0) {
			resultEquipment.rows = resultEquipment.rows.map(function(r){
				r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});

				return r;
			})
			
			for(let i=0;i<resultEquipment.rows.length;i++){

				// SELECT h.HRA_NUM, h.EMPLOYEE_ID, e.first_name || ' ' || e.last_name as hra_full_name
				// FROM HRA h 
				// INNER JOIN EMPLOYEE e ON h.EMPLOYEE_ID = e.ID
				// WHERE LOWER(e.first_name || ' ' || e.last_name) LIKE '%da%';

				if(resultEquipment.rows[i].hra_num != null && resultEquipment.rows[i].hra_num != ''){
					let resultHra =  await connection.execute(`SELECT h.HRA_NUM, h.EMPLOYEE_ID, e.first_name || ' ' || e.last_name as hra_full_name
																FROM HRA h 
																INNER JOIN EMPLOYEE e ON h.EMPLOYEE_ID = e.ID
																WHERE h.hra_num = :0`,[resultEquipment.rows[i].hra_num],dbSelectOptions)

					//console.log(resultHra)

					if(resultHra.rows.length > 0){
						const hraFound = resultHra.rows.map(function(r){
							r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
							return r;
						})[0]
						resultEquipment.rows[i].hra_full_name = hraFound.hra_full_name

					}else{
							resultEquipment.rows[i].hra_full_name = 'not found'
					}
				}else{
					resultEquipment.rows[i].hra_full_name = 'not found'
				}

				if(resultEquipment.rows[i].user_employee_id != null && resultEquipment.rows[i].user_employee_id != ''){
					let resultEmployee =  await connection.execute(`SELECT * FROM EMPLOYEE WHERE ID = :0`,[resultEquipment.rows[i].user_employee_id],dbSelectOptions);
					
					if(resultEmployee.rows.length > 0){
						resultEmployee.rows = resultEmployee.rows.map(function(r){
							r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
							return r;
						})

						//console.log(resultEmployee.rows[0]['first_name'])
						resultEquipment.rows[i].employee_full_name = resultEmployee.rows[0]['first_name'] + " " + resultEmployee.rows[0]['last_name']
					}else{
						resultEquipment.rows[i].employee_full_name = 'not found';
					}
				}else{
					resultEquipment.rows[i].employee_full_name = 'not found';
				}

				
			}


			console.log(resultEquipment.rows)
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: resultEquipment.rows
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: resultEquipment.rows
			});
		}
	}catch(err){
		console.log(err)
		//logger.error(err)
	}
};

//!INSERT EQUIPMENT
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	// const item_type = req.body.item_type ? req.body.item_type : 'no data' || ternary operator
	const { item_type } = req.body;

	try{
		result =  await connection.execute(`INSERT INTO equipment (item_type) values (:0)`,[item_type],{autoCommit:true})
		console.log(result)
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully add new data!',
			data: req.body
		});
	}catch(err){
		console.log(err);
		res.status(400).json({
			status: 400,
			message: 'Error add new data!'
		});
	}

	// connection.query('INSERT INTO `equipment` (item_type) values (?)', [ item_type ], function(err, results) {
	// 	if (err) {
	// 		console.log(err);
	// 		res.status(400).json({
	// 			status: 400,
	// 			message: 'Error add new data!'
	// 		});
	// 	} else {
	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully add new data!',
	// 			data: req.body
	// 		});
	// 	}
	// });
};

//!UPDATE EQUIPMENT DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const { item_type } = req.body;

	if (!item_type) {
		res.status(300).json({
			status: 300,
			error: true,
			message: 'item_type needed for update!'
		});
	} else {
		try{
			console.log(req.body)
			let result =  await connection.execute(`UPDATE equipment SET item_type = :0 where id = :1`,[item_type, req.params.id],{autoCommit:true})
			console.log(result)
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully update data with id: ' + req.params.id,
				data: req.body
			});
		}catch(err){
			console.log(err);
		}
	}

	// if (!item_type) {
	// 	res.status(300).json({
	// 		status: 300,
	// 		error: true,
	// 		message: 'item_type needed for update!'
	// 	});
	// } else {
	// 	connection.query('UPDATE `equipment` SET item_type = ? where id = ?', [ item_type, req.params.id ], function(
	// 		err,
	// 		results
	// 	) {
	// 		if (err) {
	// 			console.log(err);
	// 		} else {
	// 			res.status(200).json({
	// 				status: 200,
	// 				error: false,
	// 				message: 'Successfully update data with id: ' + req.params.id,
	// 				data: req.body
	// 			});
	// 		}
	// 	});
	// }
};

//!DELETE EQUIPMENT (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(`DELETE from equipment WHERE id = :0`,[req.params.id],{autoCommit:true})
		console.log(result)
		if (result.rowsAffected > 0) {
			result.rows = result.rows.map(function(r){
				r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				return r;
			})

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully delete data with id: ' + req.params.id
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'Cannot delete data with id: ' + req.params.id
			});
		}
	}catch(err){
		console.log(err);
	}


	// connection.query('DELETE from `equipment` WHERE `id` = ?', [ req.params.id ], function(err, results) {
	// 	if (err) {
	// 		console.log(err);
	// 	} else {
	// 		if (results.affectedRows > 0) {
	// 			res.status(200).json({
	// 				status: 200,
	// 				error: false,
	// 				message: 'Successfully delete data with id: ' + req.params.id
	// 			});
	// 		} else {
	// 			res.status(400).json({
	// 				status: 400,
	// 				error: true,
	// 				message: 'Cannot delete data with id: ' + req.params.id
	// 			});
	// 		}
	// 	}
	// });
};
