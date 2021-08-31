'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {propNamesToLowerCase} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');

//!SELECT * FROM CONDITION
exports.index = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute('SELECT * FROM CONDITION',{},dbSelectOptions)
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

//!SELECT CONDITIONL BY ID
exports.getById = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`SELECT * FROM CONDITION WHERE id = :0`,[req.params.id],dbSelectOptions)
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