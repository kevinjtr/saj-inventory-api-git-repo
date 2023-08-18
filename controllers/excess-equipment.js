'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const {propNamesToLowerCase, objectDifference} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {rightPermision} = require('./validation/tools/user-database')

//const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}

//!SELECT EXCESSED EQUIPMENT FROM EQUIPMENT
exports.index = async function(req, res) {
	let connection

	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
        let query = `SELECT * FROM EQUIPMENT WHERE DELETED = 1`
		let result =  await connection.execute(query,{},dbSelectOptions)
		
		//console.log(hra_employee)

		//console.log(`${hra_employee} ORDER BY FIRST_NAME,LAST_NAME`)
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)
		}

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: result.rows,
			editable: edit_rights
		});

	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],//result.rows
			editable: edit_rights
		});
		//logger.error(err)
	} finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};