'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {propNamesToLowerCase} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');

//!SELECT * FROM CONDITION
exports.index = async function(req, res) {
	let connection
	try {
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		let result =  await connection.execute('SELECT * FROM CONDITION',{},dbSelectOptions)
		result.rows = propNamesToLowerCase(result.rows)

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: result.rows
        });
        
	} catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: []
        });
        
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

//!SELECT CONDITIONL BY ID
exports.getById = async function(req, res) {
	let connection
	try {
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
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
	} catch(err){
		console.log(err)
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