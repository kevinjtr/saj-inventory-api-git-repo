'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const {propNamesToLowerCase} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const { autoCommit } = require('oracledb');

const noReplaceCols = ['hra_num']
const BANNED_COLS_RU_ADD = ['','']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}

//!SELECT * FROM REGISTERED_USERS
exports.index = async function(req, res) {
	
};

//!SELECT * FROM REGISTERED_USERS
exports.getByEDIPI = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.params

	try{
		let result =  await connection.execute(`SELECT e.first_name||' '||e.last_name as FULL_NAME, ru.id,ru.edipi,ru.employee_id,ru.user_level,ru.notifications FROM REGISTERED_USERS ru
		left join employee e on e.id = ru.employee_id
		WHERE ru.EDIPI = ${edipi}`,{},dbSelectOptions)

		result.rows = propNamesToLowerCase(result.rows)
	
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

//!INSERT REGISTERED_USERS
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		const {changes} = req.body.params		
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//console.log(row)
				let {newData} = changes[row];
				const keys = Object.keys(newData);
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'REGISTERED_USERS'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_RU_ADD.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					console.log(col_names)

					for(let i=0; i<keys.length; i++){
						const key = (!noReplaceCols.includes(keys[i]) ? keys[i].replace('hra_',''): keys[i])

						if(col_names.includes(key)){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + key
							vals = vals + comma + ' :'+ keys[i]
							insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? new Date(newData[keys[i]]) :
							(typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) :  newData[keys[i]]
						}
					}

				}
				//console.log(keys)

				let query = `INSERT INTO REGISTERED_USERS (${cols}) VALUES (${vals})`
				console.log(query,insert_obj)

				result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})
				//console.log(result)
			}
		}

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully added new data!',
			data: null//req.body
		});
	}catch(err){
		console.log(err);
		res.status(200).json({
			status: 400,
			error: true,
			message: 'Error adding new data!'
		});
	}
};

//!UPDate REGISTERED_USERS
exports.notifications = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {active} = req.params

	try{
		const num = JSON.parse(active)
		console.log(`active: ${active}, user: ${req.user}`)

		let result =  await connection.execute(`UPDATE REGISTERED_USERS SET NOTIFICATIONS = :0 WHERE ID = ${req.user}`,[Number(num)],{autoCommit:false})
		
		if(result.rowsAffected > 0){
			connection.commit();

			return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully updated notifications!',
			});
		}

		console.log(err)
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'Could not update notifications!',
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
