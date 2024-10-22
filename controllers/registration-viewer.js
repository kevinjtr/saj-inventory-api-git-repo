'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const { propNamesToLowerCase, objectDifference } = require('../tools/tools');
const { dbSelectOptions } = require('../config/db-options');
const { rightPermision } = require('./validation/tools/user-database')
const AUTO_COMMIT = { ADD: true, UPDATE: true, DELETE: false }
const filter = require('lodash/filter')
const {employee_registration} = require('../config/queries');

//SELECT * FROM REGISTRATIONS
exports.index = async function (req, res) {
    let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
        const {edit_rights} = req
        let result = await connection.execute(employee_registration, {}, dbSelectOptions)
        result.rows = propNamesToLowerCase(result.rows)

        res.status(200).json({
            status: 200,
            error: false,
            message: 'Successfully get single data!',
            data: result.rows,
            editable: edit_rights
        });

    } catch (err) {
        console.log(err)
        res.status(400).json({
            status: 400,
            error: true,
            message: 'No data found!',
            data: [],
            editable: false
        });

    }  finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}	
};

// Marked registration as deleted
exports.destroy = async function(req, res) {
	const {edipi} = req.headers.cert
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		const id = req.body.params

				let cols = ''

				if(typeof edipi != 'undefined'){
					let result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
					if(result.rows.length > 0){
						const registered_users_id = result.rows[0].ID
						cols = `, UPDATED_BY = ${registered_users_id}`
					}
				}

				let result = await connection.execute(`UPDATE EMPLOYEE_REGISTRATION SET DELETED = 1 ${cols} WHERE ID = :0`,[id],{autoCommit:true})	

		res.status(200).json({
			status: 200,
			error: false,
			message: `Successfully deleted data with id: ${id}` //+ req.params.id
		});
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: `Cannot delete data. ${err}` //+ req.params.id
		});
	}  finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}	
};