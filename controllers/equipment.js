'use strict';
//const response = require('../response');
const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const groupBy = require('lodash/groupBy');
const {propNamesToLowerCase, objectDifference, isValidDate} = require('../tools/tools');
const {rightPermision} = require('./validation/tools/user-database')
const {equipment_employee,hra_employee, hra_num_form_auth, hra_num_form_all, hra_num_form_self, employee_officeSymbol, EQUIPMENT, registered_users} = require('../config/queries');
const {dbSelectOptions,eqDatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
//const {and_, or_, andOR_single, andOR_multiple } = require('../config/functions')
const BANNED_COLS_EQUIPMENT = ['ID','HRA_NUM','OFFICE_SYMBOL_ALIAS','SYS_']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const ALL_EQUIPMENT_TABS = ["my_equipment","my_hra_equipment","hra_equipment","equipment_search","excess_equipment"]

const and_ = (q) => q != '' ? 'AND' : ''
const or_ = (q) => q != '' ? 'OR' : ''

const andOR_single = {
	'includes':and_,
	'excludes':and_,
	'equals':and_,
	'notEquals':and_
}

const andOR_multiple = {
	'includes':or_,
	'excludes':and_,
	'equals':or_,
	'notEquals':and_
}

const equipment_fetch_type = (type, user_id) => {
	switch(type) {
		case 'my_equipment':
			return `WHERE eq_emp.employee_id in (SELECT EMPLOYEE_ID FROM REGISTERED_USERS ru WHERE ru.ID = ${user_id}) `;
		case 'my_hra_equipment':
			return `WHERE eq_emp.hra_num in (${hra_num_form_self(user_id)}) `;
		case 'hra_equipment':
			return `WHERE eq_emp.hra_num in (${hra_num_form_auth(user_id)}) `;
		case 'equipment_search':
			return ` `;
		case 'excess_equipment':
			return `WHERE eq_emp.eq_deleted = 1 and (select user_level from registered_users where id = ${user_id} and user_level in (1,9,11)) is not null `;
		default:
			return ` `
	  }
}

const equipmentQueryForSearch = (type, user_id) => `SELECT * from (${hra_employee}) hra_emp 
						RIGHT JOIN (
							SELECT
							eq.ID,
							eq.BAR_TAG_NUM,
							eq.CATALOG_NUM,
							eq.BAR_TAG_HISTORY_ID,
							eq.MANUFACTURER,
							eq.MODEL,
							eq.CONDITION,
							eq.SERIAL_NUM,
							eq.ACQUISITION_DATE,
							eq.ACQUISITION_PRICE,
							eq.DOCUMENT_NUM,
							eq.ITEM_TYPE,
							eq.HRA_NUM,
							eq.deleted eq_deleted,
							ur.UPDATED_BY_FULL_NAME,
							ur.user_level,
							e.id as employee_id,
							e.first_name || ' ' || e.last_name as employee_full_name,
							e.first_name employee_first_name,
							e.last_name employee_last_name,
							e.TITLE as employee_title,
							e.OFFICE_SYMBOL as employee_office_symbol,
							e.WORK_PHONE as employee_work_phone,
							ol.NAME as employee_office_location_name
							FROM ${type != "excess_equipment" ? EQUIPMENT : "EQUIPMENT"} eq
							LEFT JOIN employee e
							on eq.user_employee_id = e.id
							LEFT JOIN (${registered_users}) ur
							on ur.id = eq.updated_by 
							LEFT JOIN OFFICE_LOCATION ol
							on ol.id = e.office_location_id 
						) eq_emp 
						on eq_emp.hra_num = hra_emp.hra_num ${equipment_fetch_type(type, user_id)}`

const getQueryForTab = (tab_name, user, fetch=true) => {

	if(fetch){
		return equipmentQueryForSearch(tab_name, user)
	}

	return ""
}

const searchEquipmentUpdatedData = async (id, connection, user) => {

	let tabsReturnObject = {}
	for(let i=0;i<ALL_EQUIPMENT_TABS.length;i++){
		const tab_name = ALL_EQUIPMENT_TABS[i]

		let query = `SELECT * FROM (
			SELECT * from (${hra_employee}) hra_emp 
						RIGHT JOIN (
							SELECT
							eq.ID,
							eq.BAR_TAG_NUM,
							eq.CATALOG_NUM,
							eq.BAR_TAG_HISTORY_ID,
							eq.MANUFACTURER,
							eq.MODEL,
							eq.CONDITION,
							eq.SERIAL_NUM,
							eq.ACQUISITION_DATE,
							eq.ACQUISITION_PRICE,
							eq.DOCUMENT_NUM,
							eq.ITEM_TYPE,
							eq.HRA_NUM,
							eq.deleted eq_deleted,
							ur.UPDATED_BY_FULL_NAME,
							ur.user_level,
							e.id as employee_id,
							e.first_name || ' ' || e.last_name as employee_full_name,
							e.first_name employee_first_name,
							e.last_name employee_last_name,
							e.TITLE as employee_title,
							e.OFFICE_SYMBOL as employee_office_symbol,
							e.WORK_PHONE as employee_work_phone,
							ol.NAME as employee_office_location_name
							FROM ${tab_name != "excess_equipment" ? EQUIPMENT : "EQUIPMENT"} eq
							LEFT JOIN employee e
							on eq.user_employee_id = e.id
							LEFT JOIN (${registered_users}) ur
							on ur.id = eq.updated_by 
							LEFT JOIN OFFICE_LOCATION ol
							on ol.id = e.office_location_id
						) eq_emp 
						on eq_emp.hra_num = hra_emp.hra_num ${equipment_fetch_type(tab_name, user)}
						) WHERE ID = :0`

		let result =  await connection.execute(`${query}`,[id],dbSelectOptions)
		let {rows} = result


		if(rows.length > 0){
			rows = propNamesToLowerCase(rows)	
			tabsReturnObject[i] = rows
		}
	}

	return tabsReturnObject
}

//!SELECT * FROM EQUIPMENT
exports.index = async function(req, res) {
	const {edit_rights} = req
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(`SELECT * from (${hra_employee}) hra_emp
												RIGHT JOIN (${equipment_employee}) eq_emp
												on eq_emp.hra_num = hra_emp.hra_num`,{},dbSelectOptions)
		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
		}

		connection.close()
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get equipment data!',
			data: result.rows,
			editable: edit_rights
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights
		});
	}
};

//!SELECT * FROM EQUIPMENT
exports.form = async function(req, res) {
	const {edit_rights} = req
	const connection =  await oracledb.getConnection(dbConfig);
	let hra_num_groups = {}

	try{
		let result =  await connection.execute(`SELECT * from (${hra_num_form_all(req.user)}) hra_emp
												LEFT JOIN (${equipment_employee}) eq_emp
												on eq_emp.hra_num = hra_emp.hra_num`,{},dbSelectOptions)

		
		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			hra_num_groups = groupBy(result.rows, function(n) {
				return n.hra_num;
			  });
		}

		connection.close()
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get equipment data!',
			data: hra_num_groups,
			editable: edit_rights
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights
		});
	}
};

//!SELECT EQUIPMENT BY ID
exports.getById = async function(req, res) {
	const {edit_rights} = req
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`SELECT * from (${hra_employee}) hra_emp
												RIGHT JOIN (${equipment_employee}) eq_emp
												on eq_emp.hra_num = hra_emp.hra_num
												WHERE id = :0`,[req.params.id],dbSelectOptions)

		//console.log('getid',result)
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			connection.close()
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: result.rows,
				editable: edit_rights
			});
		} else {
			connection.close()
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: result.rows,
				editable: edit_rights
			});
		}
	}catch(err){
		connection.close()
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

//!SELECT EQUIPMENT BY FIELDS DATA
exports.search = async function(req, res) {

	const {edit_rights} = req
	const connection =  await oracledb.getConnection(dbConfig);
	let query_search = '';
	let cols = []

	let resultC = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EQUIPMENT'`,{},dbSelectOptions)
	if(resultC.rows.length > 0 ){
		cols = filter(resultC.rows.map(x => x.COLUMN_NAME.toLowerCase()),function(c){ return !c.includes('sys_') && !c.includes('id')} )
	}
	
	//console.log(edit_rights)
	try{
		const {fields,options} = req.body;

		const searchCriteria = filter(Object.keys(fields),function(k){ return fields[k] != ''});

		for(const parameter of searchCriteria){
			//parameter = parameter.replace(/[0-9]/g,'')
			//console.log(parameter)
			const isStringColumn = eqDatabaseColNames[parameter].type == "string"
			const db_col_name = isStringColumn ? `LOWER(${eqDatabaseColNames[parameter].name})` : eqDatabaseColNames[parameter].name

			if(db_col_name != undefined){
				const db_col_value = fields[parameter]
				const blacklistedSearchPatterns = ["'' ) or ","'' ) and "]
				const includesOperator = searchOptions[options.includes[parameter]]
				const multiCharacter = (['LIKE','NOT LIKE'].includes(includesOperator) ? '%':'')

				if(db_col_value.includes(';')){
					const search_values = filter(db_col_value.split(';'),function(sv){ return sv != '' && !blacklistedSearchPatterns.includes(sv) })

					for(let i=0; i<search_values.length;i++){
						//const operator = isStringColumn ? 'LIKE' : '='
						//console.log('in'+i)
						const op_chooser = (i == 0 ? and_ : andOR_multiple[options.includes[parameter]])
						const operator = op_chooser(query_search)
						const val = isStringColumn ? `LOWER('${multiCharacter}${search_values[i].replace(/'/,"''")}${multiCharacter}')` : search_values[i].toString().replace(/'/,"''")

						//query_search = query_search.concat(`${op_chooser(query_search)} ${db_col_name} ${includesOperator} ${val} `)

						const condition = `${db_col_name} ${includesOperator} ${val} `

						if(i == 0 && !query_search){
							query_search = query_search + '(' + condition + ' '

						}else if(i == 0 && query_search){
							query_search = query_search + operator + ' ( ' + condition + ' '

						}else if(i != 0 && i != search_values.length - 1){
							query_search = query_search + operator + ' ' + condition + ' '

						}else if(i == search_values.length - 1){
							query_search = query_search  + operator + ' ' + condition + ') '
						}

						//query_search = query_search.concat(`${op_chooser(query_search)} ${db_col_name} ${includesOperator} ${val} `)

						// if(i == search_values.length - 1){
						// 	query_search = `(${query_search}) `
						// }else{
							
						// }
					}
					

				}else{
					//const operator = isStringColumn ? 'LIKE' : '='
					const val = isStringColumn ? `LOWER('${multiCharacter}${db_col_value.replace(/'/,"''")}${multiCharacter}')` : db_col_value.toString().replace(/'/,"''")
					//console.log(andOR_single[options.includes[parameter]],query_search)
					query_search = query_search.concat(`${andOR_single[options.includes[parameter]](query_search)} ${db_col_name} ${includesOperator} ${val} `)

					//console.log(val,query_search)
					//query_search = blankOptions ? query_search.concat(` ${or_(query_search)} ${db_col_name} ${blankOptions} `) : query_search
				}
			}
		}

		for(const parameter in options.blanks){
			//if(option.blanks[parameter] != BLANKS_DEFAULT){
				//parameter = parameter.replace(/[0-9]/g,'')
			const isStringColumn = eqDatabaseColNames[parameter].type == "string"
			const db_col_name = isStringColumn ? `LOWER(${eqDatabaseColNames[parameter].name})` : eqDatabaseColNames[parameter].name
			const blankOperator = searchBlanks[options.blanks[parameter]]
			const and_OR = blankAndOr[options.blanks[parameter]]
			query_search = blankOperator ? query_search + `${and_(query_search)} (${db_col_name} ${blankNull[blankOperator]} null ${and_OR} ${db_col_name} ${blankOperator} ' ')` : query_search
			//}
		}


		const newEquipmentEmployee = edit_rights ? equipment_employee.replace('SELECT','SELECT\nur.updated_by_full_name,\n') : equipment_employee


		let query = `SELECT * from (${hra_employee}) hra_emp 
						RIGHT JOIN (${newEquipmentEmployee}) eq_emp 
						on eq_emp.hra_num = hra_emp.hra_num 
						${query_search != '' ? 'WHERE': ''} ${query_search} ORDER BY eq_emp.employee_first_name, eq_emp.employee_last_name `


		let resultEquipment =  await connection.execute(`${query}`,{},dbSelectOptions)
		
		if (resultEquipment.rows.length > 0) {
			resultEquipment.rows = propNamesToLowerCase(resultEquipment.rows)

			connection.close()
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: resultEquipment.rows,
				editable: edit_rights,
				columns: cols
			});
		} else {
			connection.close()
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: [],
				editable: edit_rights,
				columns: cols
			});
		}
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights,
			columns: cols
		});
		//logger.error(err)
	}
};

//!SELECT form_4900 BY FIELDS DATA
exports.search2 = async function(req, res) {
	const {edit_rights} = req
	const accepted_user_levels = ['employee_3','hra_1','admin'].includes(req.user_level)
	const tab_edits = {0:false, 1:edit_rights, 2:edit_rights, 3:edit_rights, 4:false}
	const tab_views = {0:true, 1:edit_rights, 2:edit_rights, 3: accepted_user_levels || edit_rights, 4: accepted_user_levels || edit_rights}//search and view.

	const connection =  await oracledb.getConnection(dbConfig);
	let query_search = '';

	try{
		//if(edit_rights){
		const {fields,options, tab, init} = req.body;
		const searchCriteria = filter(Object.keys(fields),function(k){ return fields[k] != ''});

		for(const parameter of searchCriteria){

			const isStringColumn = eqDatabaseColNames[parameter].type == "string"
			const db_col_name = isStringColumn ? `LOWER(${eqDatabaseColNames[parameter].name})` : eqDatabaseColNames[parameter].name

			if(db_col_name != undefined){
				const db_col_value = fields[parameter]
				const blacklistedSearchPatterns = ["'' ) or ","'' ) and "]
				const includesOperator = searchOptions[options.includes[parameter]]
				const multiCharacter = (['LIKE','NOT LIKE'].includes(includesOperator) ? '%':'')

				if(db_col_value.includes(';')){
					const search_values = filter(db_col_value.split(';'),function(sv){ return sv != '' && !blacklistedSearchPatterns.includes(sv) })

					for(let i=0; i<search_values.length;i++){
						const op_chooser = (i == 0 ? and_ : andOR_multiple[options.includes[parameter]])
						const operator = op_chooser(query_search)
						const val = isStringColumn ? `LOWER('${multiCharacter}${search_values[i].replace(/'/,"''")}${multiCharacter}')` : search_values[i].toString().replace(/'/,"''")
						const condition = `${db_col_name} ${includesOperator} ${val} `

						if(i == 0 && !query_search){
							query_search = query_search + '(' + condition + ' '

						}else if(i == 0 && query_search){
							query_search = query_search + operator + ' ( ' + condition + ' '

						}else if(i != 0 && i != search_values.length - 1){
							query_search = query_search + operator + ' ' + condition + ' '

						}else if(i == search_values.length - 1){
							query_search = query_search  + operator + ' ' + condition + ') '
						}
					}
					

				}else{
					//const operator = isStringColumn ? 'LIKE' : '='
					const val = isStringColumn ? `LOWER('${multiCharacter}${db_col_value.replace(/'/,"''")}${multiCharacter}')` : db_col_value.toString().replace(/'/,"''")
					//console.log(andOR_single[options.includes[parameter]],query_search)
					query_search = query_search.concat(`${andOR_single[options.includes[parameter]](query_search)} ${db_col_name} ${includesOperator} ${val} `)

					//console.log(val,query_search)
					//query_search = blankOptions ? query_search.concat(` ${or_(query_search)} ${db_col_name} ${blankOptions} `) : query_search
				}
			}
		}

		for(const parameter in options.blanks){
			const isStringColumn = eqDatabaseColNames[parameter].type == "string"
			const db_col_name = isStringColumn ? `LOWER(${eqDatabaseColNames[parameter].name})` : eqDatabaseColNames[parameter].name
			const blankOperator = searchBlanks[options.blanks[parameter]]
			const and_OR = blankAndOr[options.blanks[parameter]]
			query_search = blankOperator ? query_search + `${and_(query_search)} (${db_col_name} ${blankNull[blankOperator]} null ${and_OR} ${db_col_name} ${blankOperator} ' ')` : query_search
		}

		const newEquipmentEmployee = edit_rights ? equipment_employee.replace('SELECT','SELECT\nur.updated_by_full_name,\n') : equipment_employee
		let tabsReturnObject = {}
		let hras = []
		let my_hras = []	
		let employees = []

		if(init){
			for(let i=0;i<ALL_EQUIPMENT_TABS.length;i++){
				const tab_name = ALL_EQUIPMENT_TABS[i]
				const eq_search = tab_name != "equipment_search"

				let query = getQueryForTab(tab_name, req.user, eq_search)
				
				if(query){
					let result =  await connection.execute(`${query}`,{},dbSelectOptions)
					let {rows} = result
					rows = propNamesToLowerCase(rows)

					tabsReturnObject[i] = rows
				}else{
					tabsReturnObject[i] = []
				}				
			}

			let result =  await connection.execute(`${hra_employee} where h.hra_num in (${hra_num_form_all(req.user)})`,{},dbSelectOptions) //fetch by destrict
			if(result.rows.length > 0){
				let {rows} = result
				rows = propNamesToLowerCase(rows)
				hras = [...rows]
			}

			result =  await connection.execute(`${hra_employee} where h.hra_num in (${hra_num_form_self(req.user)})`,{},dbSelectOptions) //fetch by destrict
			if(result.rows.length > 0){
				let {rows} = result
				rows = propNamesToLowerCase(rows)
				my_hras = [...rows]
			}

			result =  await connection.execute(`${employee_officeSymbol}`,{},dbSelectOptions) //fetch by district

			if(result.rows.length > 0){
				let {rows} = result
				rows = propNamesToLowerCase(rows)
				employees = [...rows]
			}

			return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: tabsReturnObject,
				editable: tab_edits,
				hras: hras,
				my_hras:my_hras,
				employees: employees,
				rights:{
					view: tab_views,
					edit: tab_edits,
				}
			});
		}else if(tab_views[ALL_EQUIPMENT_TABS.indexOf(tab)]){
			let query = getQueryForTab(tab, req.user)

			switch(tab) {
				case 'my_equipment':
					query = ` ${query} AND ${query_search}`
					break;
				case 'my_hra_equipment':
					query = ` ${query} AND ${query_search}`
					break;
				case 'hra_equipment':
					query = ` ${query} AND ${query_search}`
					break;
				case 'equipment_search':
					query += ` ${query_search != '' ? `WHERE ${query_search} `: ''} `
					break;
				case 'excess_equipment':
					query += ` ${query_search != '' ? ` AND ${query_search} `: ''} `
					break;
			}
	
			if(query){
				query += "ORDER BY eq_emp.employee_first_name, eq_emp.employee_last_name "
	
				let result =  await connection.execute(`${query}`,{},dbSelectOptions)
				let {rows} = result
				rows = propNamesToLowerCase(rows)
	
				if(rows.length > 0){
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully get single data!',
						data: {[ALL_EQUIPMENT_TABS.indexOf(tab)]: rows},
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
	}catch(err){
		connection.close()
		console.log(err)
		res.status(200).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {},
			editable: tab_edits
		});
		//logger.error(err)
	}
};

const ColumnItemExists = async (connection,table_name,rowObj,col_names) => {

	const keys = Object.keys(rowObj.data)
	let return_obj = {errorFound:false,rows:{}}

	if(keys.length > 0){
		for(const col of col_names){
			//console.log('here1')
			if(keys.includes(col)){
				//console.log(rowObj.data[col])
				let result = await connection.execute(`SELECT ${col} FROM ${table_name} WHERE ${col} = :0`,[rowObj.data[col]],dbSelectOptions)
				//console.log(`SELECT ${col} FROM ${table_name} WHERE ${col} = :0`,rowObj.data[col],rowObj.data)
				if(result.rows.length > 0){
					if(!return_obj.hasOwnProperty(rowObj.row)) {
						return_obj.rows[rowObj.row] = {}
					}
					//console.log('equipment exists')
					return_obj.errorFound = true;
					return_obj.rows[rowObj.row][col]='data exists in database.'
				}
			}
		}
	}

	return return_obj
}

const dbColumnNamesReFormat = (cols,table_name) => {
	if(table_name == 'EQUIPMENT'){
		return cols.map(x => x.COLUMN_NAME.toLowerCase().replace('user_','').replace('sys_nc00016$','hra_num'))
	}

	return cols
}

//!INSERT EQUIPMENT
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let columnErrors = {rows:{},errorFound:false}
	let tabsReturnObject = {}

	try{
		const {changes} = req.body.params
		console.log(changes)
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {newData} = changes[row];
				const keys = Object.keys(newData)
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EQUIPMENT'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_EQUIPMENT.includes(c.COLUMN_NAME)})
					let col_names = dbColumnNamesReFormat(result.rows,'EQUIPMENT')

					if(keys.length > 0){
						columnErrors = await ColumnItemExists(connection,"EQUIPMENT",{row:row,data:newData},["bar_tag_num"])
	
						if(!columnErrors.errorFound){
							
							for(let i=0; i<keys.length; i++){
								if(col_names.includes(keys[i])){
									const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
									let comma =  i && cols ? ', ': ''
									cols = cols + comma + col_name
									vals = vals + comma + ':' + keys[i]
									insert_obj[keys[i]] = isValidDate(newData[keys[i]]) && keys[i].toLowerCase().includes('date') ? new Date(newData[keys[i]]) :
									(typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) :  newData[keys[i]]

									if(i == keys.length - 1 && !keys.includes('updated_by')){
											comma = cols ? ', ': ''
											cols = cols + comma + 'updated_by'
											vals = vals + comma + ':' + 'updated_by'
											insert_obj['updated_by'] = req.user
									}
								}
							}
				
							let query = `INSERT INTO ${EQUIPMENT} (${cols}) VALUES (${vals}) returning id into :id`
							insert_obj.id = {type: oracledb.NUMBER, dir: oracledb.BIND_OUT}

							result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})

							if(result.outBinds.id.length > 0){
								tabsReturnObject = await searchEquipmentUpdatedData(result.outBinds.id[0], connection, req.user)

								connection.close()
								return res.status(200).json({
									status: 200,
									error: false,
									message: 'Successfully added new data!',
									columnErrors : columnErrors,
									tabChanges: tabsReturnObject
								});
							}			
						}
					}

				}
			}
		}
		connection.close()
		res.status(200).json({
			status: 200,
			error: true,
			message: 'Error adding new data!',
			columnErrors: columnErrors,
			tabChanges: tabsReturnObject
		});
	}catch(err){
		connection.close()
		console.log(err);
		res.status(400).json({
			status: 400,
			error:true,
			message: 'Error adding new data!',
			tabChanges: tabsReturnObject
		});
	}
};

//!UPDATE EQUIPMENT DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let columnErrors = {rows:{},errorFound:false}
	let tabsReturnObject = {}

	
	try{
		const {changes,undo} = req.body.params
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				columnErrors.rows[row] = {}
				const {newData,oldData} = changes[row];
				const cells = {new:objectDifference(oldData,newData,'tableData'),old:oldData}
				const keys = Object.keys(cells.new)
				cells.update = {}
				let cols = ''
				
				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EQUIPMENT'`,{},dbSelectOptions)
				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_EQUIPMENT.includes(c.COLUMN_NAME)})
					let col_names = dbColumnNamesReFormat(result.rows,'EQUIPMENT')

					if(keys.length > 0){
						if(!undo){
							columnErrors = await ColumnItemExists(connection,"EQUIPMENT",{row:row,data:cells.new},["bar_tag_num"])
						}
	
						if(!columnErrors.errorFound){
							
							for(let i=0; i<keys.length; i++){
								if(col_names.includes(keys[i])){
									const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
									let comma =  i && cols ? ', ': ''
									cols = cols + comma + col_name + ' = :' + keys[i]
									cells.update[keys[i]] = isValidDate(cells.new[keys[i]]) && keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? new Date(cells.new[keys[i]]) :
									(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) :  cells.new[keys[i]]
								}

								if(i == keys.length - 1 && !keys.includes('updated_by')){
									const comma =  cols ? ', ': ''
									cols = cols + comma + 'updated_by = :updated_by'
									cells.update['updated_by'] = req.user
								}
							}
				
							let query = `UPDATE EQUIPMENT SET ${cols}
										WHERE ID = ${cells.old.id}`
						

							result = await connection.execute(query,cells.update,{autoCommit:AUTO_COMMIT.UPDATE})

							if(result.rowsAffected > 0){
								tabsReturnObject = await searchEquipmentUpdatedData(cells.old.id, connection, req.user)
							}
						}
					}

				}
			}
		}

		connection.close()
		
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully update data with id: ', //+ req.params.id,
			tabChanges: tabsReturnObject,
			columnErrors: columnErrors
		});
	}catch(err){
		connection.close()
		console.log(err);
		res.status(400).json({
			status: 400,
			error: true,
			columnErrors:columnErrors,
			tabChanges: {},
			message: 'Cannot delete data with id: ' //+ req.params.id
		});
	}
};

//!DELETE EQUIPMENT (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let tabsReturnObject = {}

	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {id} = changes[row].newData
				let cols = `, UPDATED_BY = ${req.user}`
				let result = await connection.execute(`UPDATE ${EQUIPMENT} SET DELETED = 1 ${cols} WHERE ID = :0`,[id],{autoCommit:true})

				if(result.rowsAffected > 0 && AUTO_COMMIT.DELETE){
					tabsReturnObject = await searchEquipmentUpdatedData(id, connection, req.user)
				}
			}
		}

		connection.close()
		res.status(200).json({
			status: 200,
			error: false,
			message: `Successfully delete data`, //+ req.params.id
			tabChanges: tabsReturnObject
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: `Cannot delete data`, //+ req.params.id
			tabChanges: tabsReturnObject
		});
	}
};