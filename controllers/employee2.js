'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const {propNamesToLowerCase} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const BANNED_COLS = ['ID','OFFICE_SYMBOL_ALIAS','UPDATED_DATE',"UPDATED_BY_FULL_NAME","SYS_"]
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const {employeesForRegistrationAssignment,employeeByEDIPI} = require('../config/queries');

//!SELECT * FROM EMPLOYEE
exports.index = async function(req, res) {

	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(employeesForRegistrationAssignment,{},dbSelectOptions)
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

//!INSERT EMPLOYEE
exports.add = async function(req, res) { 
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert
	try{
		const {changes} = req.body.params

				let {newData} = changes[0];
				const keys = Object.keys(newData);
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EMPLOYEE'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + keys[i]
							vals = vals + comma + ' :'+ keys[i]
							insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(newData[keys[i]]) :
							(typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) :  newData[keys[i]]
						}

						if(i == keys.length - 1 && typeof edipi != 'undefined'){
							result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
							if(result.rows.length > 0){
								const registered_users_id = result.rows[0].ID
								const comma = cols ? ', ': ''
								cols = cols + comma + 'updated_by'
								vals = vals + comma + ':' + 'updated_by'
								insert_obj['updated_by'] = registered_users_id
							}
						}
					}

				}

				let query = `INSERT INTO EMPLOYEE (${cols}) VALUES (${vals})`
				result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})


				// query to select the id of the added record, to be returned as result
				query = `SELECT ID FROM EMPLOYEE WHERE ROWID = '${result.lastRowid}'`

				result = await connection.execute(query,{},{autoCommit:AUTO_COMMIT.ADD})

		
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully added new data!',
			data: result.rows
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

//!SELECT * FROM EMPLOYEE
exports.getByEDIPIWithOffice = async function(req, res) {

	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert

	try{
		let result =  await connection.execute(employeeByEDIPI(edipi),{},dbSelectOptions)
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