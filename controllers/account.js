'use strict';
const oracledb = require('oracledb');
const filter = require('lodash/filter');
const groupBy = require('lodash/groupBy')
const {propNamesToLowerCase,objectDifference, includes_} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {employee_officeSymbol,employee_id_auth} = require('../config/queries');
const {rightPermision} = require('./validation/tools/user-database')
const BANNED_COLS = ['ID','OFFICE_SYMBOL_ALIAS','UPDATED_DATE',"UPDATED_BY_FULL_NAME","SYS_"]
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const AUTHORIZED_ADD_USER_LEVELS = ["admin"]

//!SELECT EMPLOYEE BY ID
exports.index = async function(req, res) {
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		let result =  await connection.execute(`SELECT
		e.ID,
		e.FIRST_NAME,
		e.LAST_NAME,
		e.TITLE,
		e.WORK_PHONE,
		e.email,
		o.ALIAS as OFFICE_SYMBOL_ALIAS,
		e.OFFICE_SYMBOL,
		e.office_location_id,
		div.symbol as division_symbol,
		dis.symbol as district_symbol,
		ol.NAME as OFFICE_LOCATION_NAME
		FROM EMPLOYEE e
		LEFT JOIN OFFICE_SYMBOL o
		ON e.OFFICE_SYMBOL = o.id
		LEFT JOIN OFFICE_LOCATION ol
		on ol.id = e.office_location_id
		left join registered_users ru
		on ru.employee_id = e.id
		left join district dis
		on dis.id = e.district
		left join division div
		on div.id = e.division
		WHERE ru.id = :0`,[req.user],dbSelectOptions)

		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: result.rows[0],
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: {},
			});
		}
	}catch(err){
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

//!UPDATE EMPLOYEE DATA
exports.update = async function(req, res) {
	const {edipi} = req.headers.cert
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		const {changes} = req.body.params
		
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {

				const {newData,oldData} = changes[row];
				let cells = {new:objectDifference(oldData,newData,'tableData'),old:oldData}
				const keys = Object.keys(cells.new)
				cells.update = {}
				let cols = ''
				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EMPLOYEE'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + keys[i] + ' = :' + keys[i]
							cells.update[keys[i]] = keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? cells.new[keys[i]] !== null ? new Date(cells.new[keys[i]]) : null :
							(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) :  cells.new[keys[i]]
						}

						

						if (i == keys.length - 1 && typeof edipi != 'undefined') {
							result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0', [edipi], dbSelectOptions)

							if (result.rows.length > 0) {
								const registered_users_id = result.rows[0].ID
								const comma = cols ? ', ' : ''
								cols = cols + comma + 'updated_by = :updated_by'
								cells.update['updated_by'] = registered_users_id
							}
						}
					}

					let query = `UPDATE EMPLOYEE SET ${cols}
								WHERE ID = ${cells.old.id}`

					result = await connection.execute(query,cells.update,{autoCommit:AUTO_COMMIT.UPDATE})
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully update data', //+ req.params.id,
						data: [],//req.body
						rowsAffected: result.rowsAffected ? result.rowsAffected : 0
					});
				}
			}
		}

		return res.status(400).json({
			status: 400,
			error: true,
			message: 'Cannot updated data.', //+ req.params.id,
			data: [],//req.body
		});
	}catch(err){
		console.log(err);
		return res.status(200).json({
			status: 400,
			error: true,
			message: 'Cannot update data.', //+ req.params.id
			rowsAffected: 0
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