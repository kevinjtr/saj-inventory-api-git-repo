'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {propNamesToLowerCase, tokenHasEditPermision, FormsToMaterialTableFormat } = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {eng4900_losingHra,eng4900_gainingHra,registered_users, eng4900SearchQuery} = require('../config/queries');
const {rightPermision} = require('./validation/tools/user-database')
const ALL_CHANGE_HISTORY_TABS = ["equipment","employee","hra"]
const groupBy = require('lodash/groupBy')

function getChangesWithDate(data, ignore=[]) {
	const changes = [];
  
	for (let i = 1; i < data.length; i++) {
	  if (data[i].updated_date) {
  
		for (const prop in data[i]) {
		  if (data[i][prop] !== data[i - 1][prop] && !ignore.includes(prop)) {
			changes.push({
			  property: prop,
			  newValue: data[i - 1][prop],
			  oldValue: data[i][prop],
			  updated_date: data[i].updated_date,
			  updated_by_full_name: data[i].updated_by_full_name
			});
		  }
		}
		
	  }
	}
  
	return groupBy(changes,'property');
  }

const employee_ = `SELECT
e.ID,
e.FIRST_NAME,
e.LAST_NAME,
e.TITLE,
e.OFFICE_SYMBOL,
e.WORK_PHONE,
o.ALIAS as OFFICE_SYMBOL_ALIAS
FROM EMPLOYEE e
LEFT JOIN OFFICE_SYMBOL o
ON e.OFFICE_SYMBOL = o.id`

const hra_employee_ = `SELECT 
h.hra_num,
e.id as hra_employee_id,
e.first_name || ' ' || e.last_name as hra_full_name,
e.first_name hra_first_name,
e.last_name hra_last_name,
e.TITLE as hra_title,
e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
e.WORK_PHONE as hra_work_phone
FROM hra h
LEFT JOIN (${employee_}) e 
on h.employee_id = e.id`

const equipment_employee_ = `SELECT
eh.ID,
eh.BAR_TAG_NUM,
eh.CATALOG_NUM,
eh.BAR_TAG_HISTORY_ID,
eh.MANUFACTURER,
eh.MODEL,
eh.CONDITION,
eh.SERIAL_NUM,
eh.ACQUISITION_DATE,
eh.ACQUISITION_PRICE,
eh.DOCUMENT_NUM,
eh.ITEM_TYPE,
eh.HRA_NUM,
e.id as employee_id,
e.first_name || ' ' || e.last_name as employee_full_name,
e.first_name employee_first_name,
e.last_name employee_last_name,
e.TITLE as employee_title,
e.OFFICE_SYMBOL as employee_office_symbol,
e.WORK_PHONE as employee_work_phone,
eh.deleted,
eh.updated_date,
ur.UPDATED_BY_FULL_NAME
FROM equipment_history eh
LEFT JOIN employee e
on eh.user_employee_id = e.id
LEFT JOIN (${registered_users}) ur
on ur.id = eh.updated_by`

const getQueryForTab = (tab, user_id) => {
	switch(tab) {
		case 'equipment':
			return (`SELECT * from (${hra_employee_}) hra_emp
			RIGHT JOIN (${equipment_employee_}) eh_emp
			on eh_emp.hra_num = hra_emp.hra_num ORDER BY eh_emp.updated_date desc `);

		case 'employee':
			return (`SELECT 
            EH.ID,
            EH.FIRST_NAME,
            EH.LAST_NAME,
            EH.TITLE,
            EH.OFFICE_SYMBOL,
            EH.WORK_PHONE,
			O.ALIAS as OFFICE_SYMBOL_ALIAS,
			EH.DELETED,
			EH.UPDATED_DATE,
			EH.UPDATED_BY,
			ur.UPDATED_BY_FULL_NAME
		FROM EMPLOYEE_HISTORY EH LEFT JOIN OFFICE_SYMBOL O ON EH.OFFICE_SYMBOL = O.ID
		LEFT JOIN (${registered_users}) ur
		on ur.id = eh.updated_by
        ORDER BY EH.UPDATED_DATE desc `);

		case 'hra':
			return (`SELECT
            hh.hra_num,
            e.id as hra_employee_id,
            e.first_name || ' ' || e.last_name as hra_full_name,
            e.first_name hra_first_name,
            e.last_name hra_last_name,
            e.TITLE as hra_title,
            e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
			e.WORK_PHONE as hra_work_phone,
			hh.deleted,
			hh.updated_date,
			ur.UPDATED_BY_FULL_NAME
            FROM hra_history hh
            LEFT JOIN (${employee_}) e 
			on hh.employee_id = e.id
			LEFT JOIN (${registered_users}) ur
			on ur.id = hh.updated_by
            ORDER BY hh.UPDATED_DATE desc `);
		default:
			return ` `
	  }
}

//!SELECT * FROM EQUIPMENT HISTORY
exports.index = async function(req, res) {
	const {edit_rights} = req
	const route_edit = tokenHasEditPermision(req.decode,'/changehistory')
	const tab_edits = {0:route_edit && tokenHasEditPermision(req.decode,'/equipment'),1:route_edit && tokenHasEditPermision(req.decode,'/employee'),2:route_edit && tokenHasEditPermision(req.decode,'/hra')}
	let connection

	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		const {tab, init} = req.body;
		let tabsReturnObject = {}

		if(init){
			for(let i=0;i<ALL_CHANGE_HISTORY_TABS.length;i++){
				const tab_name = ALL_CHANGE_HISTORY_TABS[i]
				let query = getQueryForTab(tab_name, req.user)
				
				if(query){
					let result =  await connection.execute(`${query}`,{},dbSelectOptions)

					if(result.rows.length > 0){
						result.rows = propNamesToLowerCase(result.rows)
						result.rows.map(x => {
							x.deleted = x.deleted ? x.deleted != 2 : false
							return x
						})

						tabsReturnObject[i] = result.rows
					}else{
						tabsReturnObject[i] = []
					}
				}else{
					tabsReturnObject[i] = []
				}				
			}

			return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: tabsReturnObject,
				editable: tab_edits,
			});

		}else if(tab_edits[ALL_CHANGE_HISTORY_TABS.indexOf(tab)]){
			let query = getQueryForTab(tab, req.user)
	
			if(query){
				//query += "ORDER BY eq_emp.employee_first_name, eq_emp.employee_last_name "
	
				if(result.rows.length > 0){
					result.rows = propNamesToLowerCase(result.rows)
					result.rows.map(x => {
						x.deleted = x.deleted ? x.deleted != 2 : false
						return x
					})

					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully get single data!',
						data: {[ALL_CHANGE_HISTORY_TABS.indexOf(tab)]: result.rows},
						editable: tab_edits
					});
				}
			}
		}

		return res.status(200).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {},
			editable: tab_edits
		});


		// // let result =  await connection.execute(`SELECT * from (${hra_employee_}) hra_emp
		// // 										RIGHT JOIN (${equipment_employee_}) eh_emp
		// // 										on eh_emp.hra_num = hra_emp.hra_num ORDER BY eh_emp.updated_date desc`,{},dbSelectOptions)

		// if(result.rows.length > 0){
		// 	result.rows = propNamesToLowerCase(result.rows)
		// 	result.rows.map(x => {
		// 		x.deleted = x.deleted ? x.deleted != 2 : false
		// 		return x
		// 	})
		// }

		// res.status(200).json({
		// 	status: 200,
		// 	error: false,
		// 	message: 'Successfully get equipment data!',
		// 	data: {equipment:result.rows},
		// 	editable: edit_rights,
		// });
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {error:true},
			editable: edit_rights,
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

//!SELECT * FROM EQUIPMENT HISTORY
exports.equipment = async function(req, res) {
	const {edit_rights} = req
	let connection
	try{
		const {id} = req.params
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
        const hra_employee_ = `SELECT 
        h.hra_num,
        e.id as hra_employee_id,
        e.first_name || ' ' || e.last_name as hra_full_name,
        e.first_name hra_first_name,
        e.last_name hra_last_name,
        e.TITLE as hra_title,
        e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
        e.WORK_PHONE as hra_work_phone
        FROM hra h
        LEFT JOIN (${employee_}) e 
        on h.employee_id = e.id`
        
		const EquipmentHistory = `select eh.ID,
        eh.BAR_TAG_NUM,
        eh.CATALOG_NUM,
        eh.BAR_TAG_HISTORY_ID,
        eh.MANUFACTURER,
        eh.MODEL,
        eh.CONDITION,
        eh.SERIAL_NUM,
        eh.ACQUISITION_DATE,
        eh.ACQUISITION_PRICE,
        eh.DOCUMENT_NUM,
        eh.ITEM_TYPE,
        eh.HRA_NUM,
		eh.status,
		eh.deleted,
		null as updated_date,
		eh.updated_by,
		1 as current_record
        FROM equipment eh
		UNION ALL
		select eh.ID,
        eh.BAR_TAG_NUM,
        eh.CATALOG_NUM,
        eh.BAR_TAG_HISTORY_ID,
        eh.MANUFACTURER,
        eh.MODEL,
        eh.CONDITION,
        eh.SERIAL_NUM,
        eh.ACQUISITION_DATE,
        eh.ACQUISITION_PRICE,
        eh.DOCUMENT_NUM,
        eh.ITEM_TYPE,
        eh.HRA_NUM,
		eh.status,
		eh.deleted,
		eh.updated_date,
		eh.updated_by,
		0 as current_record
        FROM equipment_history eh`

        const equipment_employee_ = `SELECT
        eh.ID,
        eh.BAR_TAG_NUM,
        eh.CATALOG_NUM,
        eh.BAR_TAG_HISTORY_ID,
        eh.MANUFACTURER,
        eh.MODEL,
        eh.CONDITION,
        eh.SERIAL_NUM,
        eh.ACQUISITION_DATE,
        eh.ACQUISITION_PRICE,
        eh.DOCUMENT_NUM,
        eh.ITEM_TYPE,
        eh.HRA_NUM,
        e.first_name || ' ' || e.last_name as employee_full_name,
		eh.deleted,
		eh.updated_date,
		ur.UPDATED_BY_FULL_NAME,
		eh.status,
		current_record
        FROM (${EquipmentHistory}) eh
        LEFT JOIN employee e
		on eh.user_employee_id = e.id
		LEFT JOIN (${registered_users}) ur
		on ur.id = eh.updated_by`
    
		let result =  await connection.execute(`SELECT * from (${hra_employee_}) hra_emp
												RIGHT JOIN (${equipment_employee_}) eh_emp
												on eh_emp.hra_num = hra_emp.hra_num 
												where eh_emp.ID = :id
												ORDER BY eh_emp.updated_date desc`,{id: id},dbSelectOptions)
		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			result.rows.map(x => {
				x.deleted = x.deleted ? x.deleted != 2 : false
				return x
			})
		}

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get equipment data!',
			data: getChangesWithDate(result.rows,['current_record', 'updated_by_full_name', 'updated_date']),
			editable: edit_rights,
		});
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights,
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

//!SELECT * FROM HRA HISTORY
exports.hra = async function(req, res) {
	const {edit_rights} = req
	let connection
	
	const HraUnion = `(SELECT HRA_NUM, EMPLOYEE_ID, DELETED, UPDATED_BY, NULL AS UPDATED_DATE, 1 as CURRENT_RECORD  FROM HRA H
	UNION ALL
	SELECT HRA_NUM, EMPLOYEE_ID, DELETED, UPDATED_BY, UPDATED_DATE, 0 as CURRENT_RECORD FROM HRA_HISTORY HH)`

	try{
		const { hra_num } = req.params
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
        let result =  await connection.execute(`SELECT
            hh.hra_num,
            e.first_name || ' ' || e.last_name as hra_full_name,
			hh.deleted,
			hh.updated_date,
			ur.UPDATED_BY_FULL_NAME,
			hh.current_record
            FROM ${HraUnion} hh
            LEFT JOIN (${employee_}) e 
			on hh.employee_id = e.id
			LEFT JOIN (${registered_users}) ur
			on ur.id = hh.updated_by
			where hh.hra_num = :hra_num
            ORDER BY hh.UPDATED_DATE desc `,{hra_num: hra_num},dbSelectOptions)
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)
			result.rows.map(x => {
				x.deleted = x.deleted ? x.deleted != 2 : false
				return x
			})
		}

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: getChangesWithDate(result.rows,['current_record', 'updated_by_full_name', 'updated_date']),
			editable: edit_rights,
		});

	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],//result.rows
			editable: edit_rights,
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

//!SELECT * FROM EMPLOYEE HISTORY
exports.employee = async function(req, res) {
	const {edit_rights} = req
	let connection
	
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
        let result =  await connection.execute(`SELECT 
            EH.ID,
            EH.FIRST_NAME,
            EH.LAST_NAME,
            EH.TITLE,
            EH.OFFICE_SYMBOL,
            EH.WORK_PHONE,
			O.ALIAS as OFFICE_SYMBOL_ALIAS,
			EH.DELETED,
			EH.UPDATED_DATE,
			EH.UPDATED_BY,
			ur.UPDATED_BY_FULL_NAME
		FROM EMPLOYEE_HISTORY EH LEFT JOIN OFFICE_SYMBOL O ON EH.OFFICE_SYMBOL = O.ID
		LEFT JOIN (${registered_users}) ur
		on ur.id = eh.updated_by
        ORDER BY EH.UPDATED_DATE desc`,{},dbSelectOptions)

		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			result.rows.map(x => {
				x.deleted = x.deleted ? x.deleted != 2 : false
				return x
			})
		}
		

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: {employee:result.rows},
			editable: edit_rights,
		});
		//response.ok(result.rows, res);
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {error:true},
			editable: edit_rights,
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

//!SELECT * FROM FORM_4900_HISTORY
exports.eng4900 = async function(req, res) {
	const {edit_rights} = req
	let connection
	
	try{
		const {id} = req.params
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		let query = `${eng4900SearchQuery(req.user, false)}
		where f.id = :id`

		let result = await connection.execute(query,{id: id},dbSelectOptions)

		if (result.rows.length === 0) {
			return res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: [],
				editable: edit_rights,
			});
		}

		result.rows = propNamesToLowerCase(result.rows)
		const form_groups = groupBy(rows,'form_id');
		const return_result = FormsToMaterialTableFormat(form_groups)

		return res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',//return form and no bartags.
			data: return_result,
			editable: edit_rights,
		});
	}catch(err){
		console.log(err)
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights,
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
