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
	
//!SELECT * FROM CATEGORIES
exports.index = async function(req, res) {

	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute('SELECT * FROM categories',{},dbSelectOptions)
		//console.log('index',result)
		result.rows = result.rows.map(function(r){
			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
			return r;
		})

		response.ok(result.rows, res);
	}catch(err){
		console.log(err)
		//logger.error(err)
	}

	//connection.close()
	// connection.query('SELECT * FROM categories', function(error, rows, fields) {
	// 	if (error) {
	// 		console.log(error);
	// 	} else {
	// 		response.ok(rows, res);
	// 	}
	// });
};

//!SELECT DATA BY ID
exports.getId = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`SELECT * FROM categories WHERE id = :0`,[req.params.id],dbSelectOptions)
		//console.log('getid',result)
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

	// connection.query('SELECT * FROM `categories` WHERE `id` = ?', req.params.id, function(err, results, fields) {
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

//!INSERT DATA
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	// const name = req.body.name ? req.body.name : 'no data' || ternary operator
	const { name } = req.body;

	try{
		let result =  await connection.execute(`SELECT MAX(ID) as ID FROM categories`,{},dbSelectOptions)
		const id = result.rows[0].ID ? result.rows[0].ID + 1 : 1

		result =  await connection.execute(`INSERT INTO categories (id,name) values (:0,:1)`,[id,name],{autoCommit:true})
		//console.log(result)
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

	// connection.query('INSERT INTO `categories` (name) values (?)', [ name ], function(err, results) {
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

//!UPDATE DATA CATEGORIES
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const { name } = req.body;

	if (!name) {
		res.status(300).json({
			status: 300,
			error: true,
			message: 'name needed for update!'
		});
	} else {
		try{
			//console.log(req.body)
			let result =  await connection.execute(`UPDATE categories SET name = :0 where id = :1`,[ name, req.params.id ],{autoCommit:true})
			//console.log(result)
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

	// if (!name) {
	// 	res.status(300).json({
	// 		status: 300,
	// 		error: true,
	// 		message: 'name needed for update!'
	// 	});
	// } else {
	// 	connection.query('UPDATE `categories` SET name = ? where id = ?', [ name, req.params.id ], function(
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

//!DELETE DATA PRODUCTS
exports.destroy = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(`DELETE from categories WHERE id = :0`,[req.params.id],{autoCommit:true})
		//console.log(result)
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


	// connection.query('DELETE from `categories` WHERE `id` = ?', [ req.params.id ], function(err, results) {
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
