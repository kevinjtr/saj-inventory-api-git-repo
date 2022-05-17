'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {propNamesToLowerCase} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');

//!SELECT * FROM HRA
exports.index = async function(req, res) {

	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(`SELECT * FROM HRA WHERE DELETED != 1`,{},dbSelectOptions)
		
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)
		}

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
			data: [],//result.rows
		});
	}
};