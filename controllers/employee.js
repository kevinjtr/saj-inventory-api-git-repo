'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const groupBy = require('lodash/groupBy')
const {propNamesToLowerCase,objectDifference, includes_} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {employee_officeSymbol,employee_id_auth} = require('../config/queries');
const {rightPermision} = require('./validation/tools/user-database')
const BANNED_COLS = ['ID','OFFICE_SYMBOL_ALIAS','UPDATED_DATE',"UPDATED_BY_FULL_NAME","SYS_","UPDATED_BY"]
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const AUTHORIZED_ADD_USER_LEVELS = ["admin"]
//!SELECT * FROM EMPLOYEE


// create or replace trigger EMPLOYEE_ON_INSERT_TRIGGER  
//    before insert on "INV_TRACKING"."EMPLOYEE" 
//    for each row 
// begin  
//    if inserting then 
//       if :NEW."ID" is null then 
//          select SEQ_EMPLOYEE.nextval into :NEW."ID" from dual; 
//       end if; 
//    end if; 
// end;



exports.index = async function(req, res) {
	const {edit_rights} = req
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		const newEmployee = (edit_rights ? employee_officeSymbol.replace('SELECT',`SELECT 
		ur.updated_by_full_name,
		case when e.id in (${employee_id_auth(req.user)}) then 1 else 0 end employee_update_rights,`) : employee_officeSymbol.replace('e.ID,',`case when e.id in (${employee_id_auth(req.user)}) then 1 else 0 end employee_update_rights,`)) + ` WHERE e.id in (${employee_id_auth(req.user)}) `

		let result =  await connection.execute(`${newEmployee} ORDER BY FIRST_NAME,LAST_NAME`,{},dbSelectOptions)
		result.rows = propNamesToLowerCase(result.rows)

		let result_office_loc =  await connection.execute(`SELECT id as office_location_id, name as office_location_name, division, district FROM OFFICE_LOCATION`,{},dbSelectOptions)
		result_office_loc.rows = propNamesToLowerCase(result_office_loc.rows)

		const district_office_locations = groupBy(result_office_loc.rows,'district')
		let result_office_symbol =  await connection.execute(`SELECT id as office_symbol,alias as office_symbol_alias FROM OFFICE_SYMBOL order by alias asc`,{},dbSelectOptions)
		result_office_symbol.rows = propNamesToLowerCase(result_office_symbol.rows)


		let result_districts =  await connection.execute(`select * from district`,{},dbSelectOptions)
		result_districts.rows = propNamesToLowerCase(result_districts.rows)

		let result_divisions =  await connection.execute(`select * from division`,{},dbSelectOptions)
		result_divisions.rows = propNamesToLowerCase(result_divisions.rows)

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: result.rows,
			divisions: result_divisions.rows,
			districts: result_districts.rows,
			district_office_locations: district_office_locations,
			office_symbol:result_office_symbol.rows,
			rights: {edit:true, add: AUTHORIZED_ADD_USER_LEVELS.includes(req.user_level_alias)}
		});
		//response.ok(result.rows, res);
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			rights: {edit:true, add: AUTHORIZED_ADD_USER_LEVELS.includes(req.user_level_alias)}
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

//!SELECT EMPLOYEE BY ID
exports.getById = async function(req, res) {
	const {edit_rights} = req
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

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

//!SELECT EMPLOYEE BY ID
exports.getByEDIPI = async function(req, res) {
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

//!SELECT EMPLOYEE BY FIELDS DATA
exports.search = async function(req, res) {
	const {edit_rights} = req
	let query_search = '';
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		const searchCriteria = filter(Object.keys(req.body),function(k){ return req.body[k] != ''});
		for(const parameter of searchCriteria){
			const db_col_name = `LOWER(TO_CHAR(${parameter}))`

			if(db_col_name != undefined){
				const db_col_value = req.body[parameter].toString()
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



//!INSERT EMPLOYEE
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

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EMPLOYEE'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + keys[i]
							vals = vals + comma + ' :'+ keys[i]
							insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? newData[keys[i]] !== null ? new Date(newData[keys[i]]) : null :
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
				console.log(query)
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
				const { newData } = changes[row];
				let oldData

				if(!newData.hasOwnProperty('id'))
					break;

				let result_old_data = await connection.execute(`select * from employee where id = :id`,{id: newData.id},dbSelectOptions)

				if(result_old_data.rows.length === 0)
					break
				
				oldData = propNamesToLowerCase(result_old_data.rows)[0]

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

								console.log(query)
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

//!DELETE EQUIPMENT (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	let ids = ''
	const {edipi} = req.headers.cert
	let connection
	try{
		pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//const {id} = changes[row].oldData
				let cols = ''

				if (i == keys.length - 1 && typeof edipi != 'undefined') {
					result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0', [edipi], dbSelectOptions)

					if (result.rows.length > 0) {
						const registered_users_id = result.rows[0].ID
						const comma = cols ? ', ' : ''
						cols = cols + comma + 'updated_by = :updated_by'
						cells.update['updated_by'] = registered_users_id
					}
				}
				
				if(typeof edipi != 'undefined'){
					let result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
					if(result.rows.length > 0){
						const registered_users_id = result.rows[0].ID
						//comma =  cols ? ', ': ''
						//cols = cols + comma + 'updated_by = :updated_by'
						cols = `, UPDATED_BY = ${registered_users_id}`
					}
				}

				let result = await connection.execute(`UPDATE EMPLOYEE SET DELETED = 1 ${cols} WHERE HRA_NUM = :0`,[changes[row].oldData.id],{autoCommit:AUTO_COMMIT.DELETE})
				ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.id
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