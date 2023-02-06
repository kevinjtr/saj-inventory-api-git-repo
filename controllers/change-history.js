'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');
const {propNamesToLowerCase, tokenHasEditPermision} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {eng4900_losingHra,eng4900_gainingHra,registered_users} = require('../config/queries');
const {rightPermision} = require('./validation/tools/user-database')
const ALL_CHANGE_HISTORY_TABS = ["equipment","employee","hra"]

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
	const connection =  await oracledb.getConnection(dbConfig);
	const {edit_rights} = req
	const route_edit = tokenHasEditPermision(req.decode,'/changehistory')
	const tab_edits = {0:route_edit && tokenHasEditPermision(req.decode,'/equipment'),1:route_edit && tokenHasEditPermision(req.decode,'/employee'),2:route_edit && tokenHasEditPermision(req.decode,'/hra')}

	try{
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


		// let result =  await connection.execute(`SELECT * from (${hra_employee_}) hra_emp
		// 										RIGHT JOIN (${equipment_employee_}) eh_emp
		// 										on eh_emp.hra_num = hra_emp.hra_num ORDER BY eh_emp.updated_date desc`,{},dbSelectOptions)

		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			result.rows.map(x => {
				x.deleted = x.deleted ? x.deleted != 2 : false
				return x
			})
		}

		connection.close()
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get equipment data!',
			data: {equipment:result.rows},
			editable: edit_rights,
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {error:true},
			editable: edit_rights,
		});
	}
};


//!SELECT * FROM EQUIPMENT HISTORY
exports.equipment = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {edit_rights} = req

	try{
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
    
		let result =  await connection.execute(`SELECT * from (${hra_employee_}) hra_emp
												RIGHT JOIN (${equipment_employee_}) eh_emp
												on eh_emp.hra_num = hra_emp.hra_num ORDER BY eh_emp.updated_date desc`,{},dbSelectOptions)
		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			result.rows.map(x => {
				x.deleted = x.deleted ? x.deleted != 2 : false
				return x
			})
		}

		connection.close()
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get equipment data!',
			data: {equipment:result.rows},
			editable: edit_rights,
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {error:true},
			editable: edit_rights,
		});
	}
};

//!SELECT * FROM HRA HISTORY
exports.hra = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {edit_rights} = req

	try{

        let result =  await connection.execute(`SELECT
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
            ORDER BY hh.UPDATED_DATE desc `,{},dbSelectOptions)

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
			data: {hra:result.rows},
			editable: edit_rights,
		});

	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {error:true},//result.rows
			editable: edit_rights,
		});
		//logger.error(err)
	}
};

//!SELECT * FROM EMPLOYEE HISTORY
exports.employee = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {edit_rights} = req

	try{
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
	}
};

//!SELECT * FROM FORM_4900_HISTORY
exports.eng4900 = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {edit_rights} = req

	try{
		let query = `SELECT
		f.id as form_id,
		ra.alias as REQUESTED_ACTION,
		f.LOSING_HRA as losing_hra_num,
		l_hra.losing_hra_first_name,
		l_hra.losing_hra_last_name,
		l_hra.losing_hra_office_symbol,
		l_hra.losing_hra_os_alias,
		l_hra.losing_hra_work_phone,
		f.GAINING_HRA as gaining_hra_num,
		g_hra.gaining_hra_first_name,
		g_hra.gaining_hra_last_name,
		g_hra.gaining_hra_office_symbol,
		g_hra.gaining_hra_os_alias,
		g_hra.gaining_hra_work_phone,
		f.DATE_CREATED,
		f.FOLDER_LINK,
		f.equipment_group_id,
		f.expiration_date,
		TO_CHAR(f.expiration_date,'mm/dd/yyyy') as expiration_date_print,
		f.temporary_loan
		from form_4900 f, requested_action ra,
		(${eng4900_losingHra}) l_hra, (${eng4900_gainingHra}) g_hra
		where ra.id = f.requested_action and f.losing_hra = l_hra.losing_hra_num and f.gaining_hra = g_hra.gaining_hra_num`

		//let result =  await connection.execute(query,[req.params.id],dbSelectOptions)

		let result = await connection.execute(query,{},dbSelectOptions)

		if (result.rows.length > 0) {

			result.rows = propNamesToLowerCase(result.rows)

			// result.rows[0].equipment_group = []
			// let eg_result = await connection.execute(newQuerySelById2,[result.rows[0].equipment_group_id],dbSelectOptions)

			// if(eg_result.rows.length > 0){
			// 	eg_result.rows = propNamesToLowerCase(eg_result.rows)
			// 	result.rows[0].equipment_group = eg_result.rows

			// 	return res.status(200).json({
			// 		status: 200,
			// 		error: false,
			// 		message: 'Successfully get single data!',//return form and bartags.
			// 		data: result.rows[0]
			// 	});
			// }

			connection.close()
			return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',//return form and no bartags.
				data: result.rows[0],
				editable: edit_rights,
			});
		}

		connection.close()
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights,
		});
	}catch(err){
		console.log(err)
		connection.close()
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights,
		});
		//logger.error(err)
	}
};
