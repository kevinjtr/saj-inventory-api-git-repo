'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {propNamesToLowerCase} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');

const arraytoObject = (array,param) => {
	let obj = {}
	for(const elem of array){
		const val = elem[param]
		obj[val] = elem
		//delete obj[val][param]
	}
	return obj
}
//!SELECT * FROM OFFICE SYMBOL
exports.index = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute('SELECT * FROM OFFICE_SYMBOL',{},dbSelectOptions)
		result.rows = propNamesToLowerCase(result.rows)
		//let new_obj = arraytoObject(result.rows,"id")

		//console.log(new_obj)

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: result.rows
        });
        
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: []
        });
        
	}
};

//!SELECT * FROM OFFICE SYMBOL
// exports.index2 = async function(req, res) {
// 	const connection =  await oracledb.getConnection(dbConfig);
// 	try{
// 		let result =  await connection.execute('SELECT * FROM OFFICE_SYMBOL',{},dbSelectOptions)
// 		result.rows = propNamesToLowerCase(result.rows)
// 		let result_obj = arraytoObject(result.rows,"id")

// 		res.status(200).json({
// 			status: 200,
// 			error: false,
// 			message: 'Successfully get single data!',
// 			data: result_obj
//         });
        
// 	}catch(err){
// 		console.log(err)
// 		res.status(400).json({
// 			status: 400,
// 			error: true,
// 			message: 'No data found!',
// 			data: {}
//         });
        
// 	}
// };

//!SELECT OFFICE SYMBOL BY ID
exports.getById = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`SELECT * FROM OFFICE_SYMBOL WHERE id = :0`,[req.params.id],dbSelectOptions)
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

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
				data: []
			});
		}
	}catch(err){
		console.log(err)
		//logger.error(err)
	}
};