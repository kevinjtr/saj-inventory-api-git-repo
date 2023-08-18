'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const {propNamesToLowerCase, objectDifference} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {employee_officeSymbol, hra_employee, hra_employee_edit_rights, hra_employee_form_all, hra_employee_form_self,EQUIPMENT} = require('../config/queries')
const {rightPermision} = require('./validation/tools/user-database')
const noReplaceCols = ['hra_num']

const BANNED_COLS_HRA = ['HRA_NUM','NAME','OFFICE_SYMBOL_ALIAS','SYS_NC00004$']
const BANNED_COLS_HRA_ADD = ['NAME','OFFICE_SYMBOL_ALIAS','SYS_NC00004$']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}


//!SELECT * FROM HRA
exports.index = async function(req, res) {
	//const {edit_rights} = req
	const {edit_rights} = req
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		const newHRA = edit_rights ? hra_employee_edit_rights : hra_employee
		let result =  await connection.execute(`${newHRA} ORDER BY FIRST_NAME,LAST_NAME`,{},dbSelectOptions)

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

//!SELECT * FROM HRA
exports.form = async function(req, res) {
	const {edit_rights} = req
	const TABS = ["my_forms","hra_forms"]
	const tabsReturnObject = {}	
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		for(let i=0;i<TABS.length;i++){
			const tab_name = TABS[i]
			const hra = {}
			let auth_hras = []

			if(tab_name == "my_forms"){
				auth_hras = edit_rights ? hra_employee_form_self(req.user).replace('SELECT','SELECT\ne.id as hra_employee_id,\nur.updated_by_full_name,\n') : hra_employee_form_self(req.user)
			}

			if(tab_name == "hra_forms"){
				auth_hras = edit_rights ? hra_employee_form_all(req.user).replace('SELECT','SELECT\ne.id as hra_employee_id,\nur.updated_by_full_name,\n') : hra_employee_form_all(req.user)
			}
			
			let result = await connection.execute(`${auth_hras} ORDER BY FIRST_NAME,LAST_NAME`,{},dbSelectOptions)

			if(result.rows.length > 0){
				hra.losing = propNamesToLowerCase(result.rows)

				for(let j=0;j<hra.losing.length;j++){
					const {hra_num} = hra.losing[j]
					result = await connection.execute(`SELECT * FROM ${EQUIPMENT} WHERE HRA_NUM = :0`,[hra_num],dbSelectOptions)
					hra.losing[j].equipments = propNamesToLowerCase(result.rows)
				}

				const all_hras = edit_rights ? hra_employee_edit_rights : hra_employee
				result = await connection.execute(`${all_hras} ORDER BY FIRST_NAME,LAST_NAME`,{},dbSelectOptions)
				
				hra.gaining = propNamesToLowerCase(result.rows)

				tabsReturnObject[i] = hra
			}
		}

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: tabsReturnObject,
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

//!SELECT HRA BY HRA_NUM
exports.getById = async function(req, res) {
	const {edit_rights} = req
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		
		let result =  await connection.execute(`${hra_employee}
												WHERE hra_num = :0
												ORDER BY FIRST_NAME,LAST_NAME`,[req.params.hra_hum],dbSelectOptions)
		

		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: result.rows,
				editable: edit_rights
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: result.rows,
				editable: edit_rights
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

//!SELECT HRA BY FIELDS DATA
exports.search = async function(req, res) {
	const {edit_rights} = req
	let query_search = '';
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		const searchCriteria = filter(Object.keys(req.body),function(k){ return req.body[k] != ''});
		for(const parameter of searchCriteria){
			const db_col_name = `LOWER(TO_CHAR(${(!noReplaceCols.includes(parameter) ? parameter.replace('hra_',''): parameter)}))`

			if(db_col_name != undefined){
				const db_col_value = req.body[parameter]
				//const x = "'' ) or id = 7168 or (hra_full_name = '"
				const blacklistedSearchPatterns = ["'' ) or ","'' ) and "]

				if(db_col_value.includes(';')){
					const search_values = filter(db_col_value.split(';'),function(sv){ return sv != '' && !blacklistedSearchPatterns.includes(sv) })

					for(let i=0; i<search_values.length;i++){
						const or_ = query_search != '' ? 'OR' : ''
						//const operator = isStringColumn ? 'LIKE' : '='
						const val = `LOWER('%${search_values[i].replace(/'/,"''")}%')`

						query_search = query_search.concat(` ${or_} ${db_col_name} LIKE ${val} `)
						
						if(i == search_values.length - 1){
							query_search = `(${query_search})`
						}
					}
					

				}else{
					const and_ = query_search != '' ? 'AND' : ''
					//const operator = isStringColumn ? 'LIKE' : '='
					const val = `LOWER('%${db_col_value.replace(/'/,"''")}%')`
					
					query_search = query_search.concat(` ${and_} ${db_col_name} LIKE ${val} `)
					//const and_ = query_search != '' ? 'AND' : ''
					//query_search = query_search.concat(` ${and_} LOWER(${db_col_name}) LIKE LOWER('%${db_col_value.replace(/'/,"''")}%') `)
				}
			}
		}


		

		let query = `SELECT * from HRA WHERE ${query_search} ORDER BY FIRST_NAME,LAST_NAME`
		let resultHra =  await connection.execute(query,{},dbSelectOptions)
		
		if (resultHra.rows.length > 0) {
			resultHra.rows = propNamesToLowerCase(resultHra.rows)
			resultHra.rows = resultHra.rows.map(function(r){
				r.acquisition_price = r.acquisition_price ? r.acquisition_price.toFixed(2) : null
				return r;
			})

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: resultHra.rows,
				editable: edit_rights
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: resultHra.rows,
				editable: edit_rights
			});
		}
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
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

//!INSERT HRA
exports.add = async function(req, res) {
	const {edipi} = req.headers.cert
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		const {changes} = req.body.params		
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				let {newData} = changes[row];
				const keys = Object.keys(newData);
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'HRA'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_HRA_ADD.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					for(let i=0; i<keys.length; i++){
						const key = (!noReplaceCols.includes(keys[i]) ? keys[i].replace('hra_',''): keys[i])

						if(col_names.includes(key)){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + key
							vals = vals + comma + ' :'+ keys[i]
							insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? new Date(newData[keys[i]]) :
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

				let query = `INSERT INTO HRA (${cols}) VALUES (${vals})`
				result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})
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

//!UPDATE HRA DATA
exports.update = async function(req, res) {
	const {edipi} = req.headers.cert
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {newData} = changes[row];
				let oldData

				if(!newData.hasOwnProperty('hra_num'))
					break;

				const query_old_data = hra_employee_edit_rights
				let result_old_data = await connection.execute(`${query_old_data} where h.hra_num = :hra_num`,{hra_num: newData.hra_num},dbSelectOptions)

				if(result_old_data.rows.length === 0)
					break
				
				oldData = propNamesToLowerCase(result_old_data.rows)[0]
				let cells = {new:objectDifference(oldData,newData,'tableData'),old:oldData}
				const keys = Object.keys(cells.new)
				cells.update = {}
				let cols = ''
				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'HRA'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_HRA.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())
                    for(let i=0; i<keys.length; i++){
						const key = keys[i].replace('hra_','')

						if(col_names.includes(key)){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + key + ' = :' + key
							cells.update[key] = key.toLowerCase().includes('date') ? new Date(cells.new[keys[i]]) :
							(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) : cells.new[keys[i]]
						}

						if(i == keys.length - 1 && typeof edipi != 'undefined' && !keys.includes('updated_by')){
							result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
							if(result.rows.length > 0){
								const registered_users_id = result.rows[0].ID
								const comma =  cols ? ', ': ''
								cols = cols + comma + 'updated_by = :updated_by'
								cells.update['updated_by'] = registered_users_id
							}
						}
                    }
        
                    let query = `UPDATE HRA SET ${cols}
                                WHERE hra_num = ${cells.old.hra_num}`

								console.log(query)
                    result = await connection.execute(query,cells.update,{autoCommit:AUTO_COMMIT.UPDATE})
					
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully update data.', //+ req.params.id,
						data: [],//req.body
						rowsAffected: result.rowsAffected ? result.rowsAffected : 0
					});

				}
			}
		}
		
		return res.status(200).json({
			status: 200,
			error: true,
			message: 'Cannot delete data.', //+ req.params.id,
			data: []//req.body
		});
	}catch(err){
		console.log(err);
		return res.status(200).json({
			status: 400,
			error: true,
			message: 'Cannot delete data.' //+ req.params.id
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

//!DELETE HRA (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	let ids = ''
	const {edipi} = req.headers.cert
	let connection
	try{
		const {changes} = req.body.params
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//const {id} = changes[row].oldData
				let cols = ''

				if(typeof edipi != 'undefined'){
					let result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
					if(result.rows.length > 0){
						const registered_users_id = result.rows[0].ID
						//comma =  cols ? ', ': ''
						//cols = cols + comma + 'updated_by = :updated_by'
						cols = `, UPDATED_BY = ${registered_users_id}`
					}
				}

				let result = await connection.execute(`UPDATE HRA SET DELETED = 1 ${cols} WHERE HRA_NUM = :0`,[changes[row].oldData.hra_employee_id],{autoCommit:AUTO_COMMIT.DELETE})
				ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.hra_employee_id
			}
		}

		res.status(200).json({
			status: 200,
			error: false,
			message: `Successfully delete data with ids: ${ids}` //+ req.params.id
		});
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: `Cannot delete data. ${err}` //+ req.params.id
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