'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');

const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};

//!SELECT * FROM form_4844
exports.index = async function(req, res) {

    // console.log('here at index form_4844')

	// try{
    //     console.log('extract form_4844')
	// 	let result =  await connection.execute('SELECT * FROM form_4844',{},dbSelectOptions)
		
	// 	result.rows = result.rows.map(function(r){
	// 		r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
	// 		return r;
	// 	})

    //     console.log('rows fetched: ',result.rows.length)
	// 	response.ok(result.rows, res);
	// }catch(err){
	// 	console.log(err)
	// 	//logger.error(err)
	// }
};

//!SELECT form_4844 BY ID
exports.getById = async function(req, res) {
	// try{
	// 	let result =  await connection.execute(`SELECT * FROM form_4844 WHERE id = :0`,[req.params.id],dbSelectOptions)
	// 	console.log('getid',result)
	// 	if (result.rows.length > 0) {
	// 		result.rows = result.rows.map(function(r){
	// 			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
	// 			return r;
	// 		})
	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully get single data!',
	// 			data: result.rows
	// 		});
	// 	} else {
	// 		res.status(400).json({
	// 			status: 400,
	// 			error: true,
	// 			message: 'No data found!',
	// 			data: result.rows
	// 		});
	// 	}
	// }catch(err){
	// 	console.log(err)
	// 	//logger.error(err)
	// }
};

//!SELECT form_4844 BY FIELDS DATA
exports.search = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnForms = []

	try{
        let query = `SELECT * from form_4844` //+ where + hraFind + andCause + bartagFind

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
            const uniqFormIds = uniq(result.rows.map(x => x.FORM_ID))
            for(const form_id of uniqFormIds){
                const formEquipment = filter(result.rows,function(o){ return o.FORM_ID == form_id})
                returnForms.push(formEquipment)
            }
        }    
       
            
        if(returnForms.length > 0){
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: returnForms
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: returnForms
			});
		}
	}catch(err){
		console.log(err)
		//logger.error(err)
	}
};

//!INSERT form_4844
exports.add = async function(req, res) {
	// // const item_type = req.body.item_type ? req.body.item_type : 'no data' || ternary operator
	// const { item_type } = req.body;

	// try{
	// 	result =  await connection.execute(`INSERT INTO form_4844 (item_type) values (:0)`,[item_type],{autoCommit:true})
	// 	console.log(result)
	// 	res.status(200).json({
	// 		status: 200,
	// 		error: false,
	// 		message: 'Successfully add new data!',
	// 		data: req.body
	// 	});
	// }catch(err){
	// 	console.log(err);
	// 	res.status(400).json({
	// 		status: 400,
	// 		message: 'Error add new data!'
	// 	});
	// }
};

//!UPDATE form_4844 DATA
exports.update = async function(req, res) {
	// const { item_type } = req.body;

	// if (!item_type) {
	// 	res.status(300).json({
	// 		status: 300,
	// 		error: true,
	// 		message: 'item_type needed for update!'
	// 	});
	// } else {
	// 	try{
	// 		console.log(req.body)
	// 		let result =  await connection.execute(`UPDATE form_4844 SET item_type = :0 where id = :1`,[item_type, req.params.id],{autoCommit:true})
	// 		console.log(result)
	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully update data with id: ' + req.params.id,
	// 			data: req.body
	// 		});
	// 	}catch(err){
	// 		console.log(err);
	// 	}
	// }
};

//!DELETE form_4844 (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {

	// try{
	// 	let result =  await connection.execute(`DELETE from form_4844 WHERE id = :0`,[req.params.id],{autoCommit:true})
	// 	console.log(result)
	// 	if (result.rowsAffected > 0) {
	// 		result.rows = result.rows.map(function(r){
	// 			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
	// 			return r;
	// 		})

	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully delete data with id: ' + req.params.id
	// 		});
	// 	} else {
	// 		res.status(400).json({
	// 			status: 400,
	// 			error: true,
	// 			message: 'Cannot delete data with id: ' + req.params.id
	// 		});
	// 	}
	// }catch(err){
	// 	console.log(err);
	// }
};

//Funding dropdown
exports.funding = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnFunding = []

	try{
        let query = `SELECT * from funding` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
		
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		//logger.error(err)
}
};

//Reportable Item Control Code dropdown
exports.reportableControlCode = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnFunding = []

	try{
        let query = `SELECT * from reportable_item_control_code` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
		
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		//logger.error(err)
}
};

//Condition dropdown
exports.condition = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnCondition = []

	try{
        let query = `SELECT * from condition` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
		
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		//logger.error(err)
}
};

//Utilization dropdown
exports.utilization = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnUtilization  = []

	try{
        let query = `SELECT * from utilization` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
		
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		//logger.error(err)
}
};

//Classification dropdown
exports.classification = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnClassification  = []

	try{
        let query = `SELECT * from classification` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
		
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		//logger.error(err)
}
};

//Classification dropdown
exports.piliferableCode = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnPiliferableCode  = []

	try{
        let query = `SELECT * from piliferable_code` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    

		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
		
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		//logger.error(err)
}
};

//Logistics Control Code dropdown
exports.logisticsControlCode = async function(req, res) {
    const pool = oracledb.getPool('ADMIN');
	const connection =  await pool.getConnection();
    const returnLogisticsControlCode  = []

	try{
        let query = `SELECT * from logistics_control_code` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    

		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
		
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		//logger.error(err)
}
};