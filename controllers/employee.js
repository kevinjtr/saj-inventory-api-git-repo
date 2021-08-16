'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');
const {propNamesToLowerCase,objectDifference} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {employee_officeSymbol} = require('../config/queries');
const {rightPermision} = require('./validation/tools/user-database')
const BANNED_COLS = ['ID','OFFICE_SYMBOL_ALIAS']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}

//!SELECT * FROM EMPLOYEE
exports.index = async function(req, res) {
	const edit_rights = await rightPermision(req.headers.cert.edipi)
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		const newEmployee = edit_rights ? employee_officeSymbol.replace('SELECT','SELECT\ne.OFFICE_SYMBOL,\nur.updated_by_full_name,\n') : employee_officeSymbol.replace('e.ID,','')

		let result =  await connection.execute(`${newEmployee} ORDER BY FIRST_NAME,LAST_NAME`,{},dbSelectOptions)
		result.rows = propNamesToLowerCase(result.rows)

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: result.rows,
			editable: edit_rights
		});
		//response.ok(result.rows, res);
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
	}
};

//!SELECT EMPLOYEE BY ID
exports.getById = async function(req, res) {
	const edit_rights = await rightPermision(req.headers.cert.edipi)
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`SELECT * FROM employee WHERE id = :0 ORDER BY FIRST_NAME,LAST_NAME`,[req.params.id],dbSelectOptions)
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
				data: [],
				editable: edit_rights
			});
		}
	}catch(err){
		console.log(err)
		//logger.error(err)
	}
};

//!SELECT EMPLOYEE BY FIELDS DATA
exports.search = async function(req, res) {
	const edit_rights = await rightPermision(req.headers.cert.edipi)
	let query_search = '';
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		const searchCriteria = filter(Object.keys(req.body),function(k){ return req.body[k] != ''});
		for(const parameter of searchCriteria){
			const db_col_name = `LOWER(TO_CHAR(${parameter}))`

			if(db_col_name != undefined){
				const db_col_value = req.body[parameter]
				const blacklistedSearchPatterns = ["'' ) or ","'' ) and "]

				if(db_col_value.includes(';')){
					const search_values = filter(db_col_value.split(';'),function(sv){ return sv != '' && !blacklistedSearchPatterns.includes(sv) })

					for(let i=0; i<search_values.length;i++){
						const or_ = query_search != '' ? 'OR' : ''
						const val = `LOWER('%${search_values[i].replace(/'/,"''")}%')`

						query_search = query_search.concat(` ${or_} ${db_col_name} LIKE ${val} `)
						
						if(i == search_values.length - 1){
							query_search = `(${query_search})`
						}
					}
					

				}else{
					const and_ = query_search != '' ? 'AND' : ''
					const val = `LOWER('%${db_col_value.replace(/'/,"''")}%')`
					
					query_search = query_search.concat(` ${and_} ${db_col_name} LIKE ${val} `)
				}
			}
		}

		let query = `SELECT * from EMPLOYEE WHERE ${query_search} ORDER BY FIRST_NAME,LAST_NAME`
		let resultEquipment =  await connection.execute(query,{},dbSelectOptions)
		
		if (resultEquipment.rows.length > 0) {
			resultEquipment.rows = propNamesToLowerCase(resultEquipment.rows)
			resultEquipment.rows = resultEquipment.rows.map(function(r){
				r.acquisition_price = r.acquisition_price ? r.acquisition_price.toFixed(2) : null
				return r;
			})

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: resultEquipment.rows,
				editable: edit_rights
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: resultEquipment.rows,
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
	}
};

//!INSERT EMPLOYEE
exports.add = async function(req, res) { 
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert
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

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EMPLOYEE'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + keys[i]
							vals = vals + comma + ' :'+ keys[i]
							insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(newData[keys[i]]) : newData[keys[i]]
						}

						if(i == keys.length - 1 && typeof edipi != 'undefined'){
							result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
							if(result.rows.length > 0){
								const user_rights_id = result.rows[0].ID
								const comma = cols ? ', ': ''
								cols = cols + comma + 'updated_by'
								vals = vals + comma + ':' + 'updated_by'
								insert_obj['updated_by'] = user_rights_id
							}
						}
					}

				}

				//console.log(keys)
				// for(let i=0; i<keys.length; i++){
				// 	if(keys[i] != 'id'){
				// 		const comma = i ? ', ': ''
				// 		cols = cols + comma + keys[i]
				// 		vals = vals + comma + ' :'+ keys[i]
				// 	}else{
				// 		delete newData.id
				// 	}
				// }

				let query = `INSERT INTO EMPLOYEE (${cols}) VALUES (${vals})`
				//console.log(query)

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
		res.status(400).json({
			status: 400,
			message: 'Error adding new data!'
		});
	}
};

//!UPDATE EMPLOYEE DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert
	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {

				const {newData,oldData} = changes[row];
				let cells = {new:objectDifference(oldData,newData,'tableData'),old:oldData}
				const keys = Object.keys(cells.new)
				cells.update = {}
				let cols = ''
				
				console.log(cells.new)
				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EMPLOYEE'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + keys[i] + ' = :' + keys[i]
							cells.update[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(cells.new[keys[i]]) : cells.new[keys[i]]
						}

						if(i == keys.length - 1 && typeof edipi != 'undefined'  && !keys.includes('updated_by')){
							result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
							if(result.rows.length > 0){
								const user_rights_id = result.rows[0].ID
								const comma =  cols ? ', ': ''
								cols = cols + comma + 'updated_by = :updated_by'
								cells.update['updated_by'] = user_rights_id
							}
						}
					}

					let query = `UPDATE EMPLOYEE SET ${cols}
								WHERE ID = ${cells.old.id}`

					console.log(query)
					result = await connection.execute(query,cells.update,{autoCommit:AUTO_COMMIT.UPDATE})
					//console.log(result)

					connection.close()
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

		connection.close()
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'Cannot updated data.', //+ req.params.id,
			data: [],//req.body
		});
	}catch(err){
		console.log(err);
		connection.close()

		return res.status(400).json({
			status: 400,
			error: true,
			message: 'Cannot update data.', //+ req.params.id
			rowsAffected: 0
		});
	}
};

//!DELETE EQUIPMENT (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	let ids = ''
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert
	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//const {id} = changes[row].oldData
				let cols = ''

				if(typeof edipi != 'undefined'){
					let result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
					if(result.rows.length > 0){
						const user_rights_id = result.rows[0].ID
						//comma =  cols ? ', ': ''
						//cols = cols + comma + 'updated_by = :updated_by'
						cols = `, UPDATED_BY = ${user_rights_id}`
					}
				}

				let result = await connection.execute(`UPDATE EMPLOYEE SET DELETED = 1 ${cols} WHERE HRA_NUM = :0`,[changes[row].oldData.id],{autoCommit:AUTO_COMMIT.DELETE})
				ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.id
				//console.log(result)
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
	}
};