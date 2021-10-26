'use strict';

const fs = require('fs')
const path = require('path')
const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const groupBy = require('lodash/groupBy');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase,objectDifference,containsAll} = require('../tools/tools');
const {eng4900_losingHra,eng4900_gainingHra, hra_num_form_self, hra_num_form_auth, hra_num_form_all} = require('../config/queries');
const {dbSelectOptions,eng4900DatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
const {rightPermision} = require('./validation/tools/user-database')
const {handleData, ValidateEng4900Signature} = require('../pdf-fill.js')
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');

const BANNED_COLS_ENG4900 = ['ID','UPDATED_BY','SYS_NC00008$','DELETED']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}

const printElements = (elements) => {
	let str = ""
	for(let i=0; i<elements.length; i++){
		str = str + (i ? ', ' : '') + elements[i]
	}
	return str
}

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

const queryForSearch = (id) => `SELECT 
f.id as form_id,
f.status,
ra.alias as REQUESTED_ACTION,
f.LOSING_HRA as losing_hra_num,
CASE WHEN f.LOSING_HRA IN (${hra_num_form_auth(id)}) THEN 1 ELSE 0 END originator,
l_hra.losing_hra_first_name,
l_hra.losing_hra_last_name,
l_hra.losing_hra_first_name || ' ' || l_hra.losing_hra_last_name as losing_hra_full_name,
l_hra.losing_hra_office_symbol,
l_hra.losing_hra_work_phone,
f.GAINING_HRA as gaining_hra_num,
g_hra.gaining_hra_first_name,
g_hra.gaining_hra_last_name,
g_hra.gaining_hra_first_name || ' ' || g_hra.gaining_hra_last_name as gaining_hra_full_name,
g_hra.gaining_hra_office_symbol,
g_hra.gaining_hra_work_phone,
f.DATE_CREATED,
f.FOLDER_LINK,
f.DOCUMENT_SOURCE,
eg.EQUIPMENT_GROUP_ID,
e.id as EQUIPMENT_ID, 
	e.BAR_TAG_NUM , 
	e.CATALOG_NUM , 
	e.BAR_TAG_HISTORY_ID , 
	e.MANUFACTURER , 
	e."MODEL", 
	e.CONDITION , 
	e.SERIAL_NUM , 
	e.ACQUISITION_DATE , 
	e.ACQUISITION_PRICE , 
	e.DOCUMENT_NUM, 
	e.ITEM_TYPE , 
	e.USER_EMPLOYEE_ID
	from form_4900 f, equipment_group eg, equipment e, requested_action ra,
	( ${eng4900_losingHra}) l_hra, (${eng4900_gainingHra}) g_hra
where eg.equipment_group_id = f.equipment_group_id and e.id = eg.equipment_id and ra.id = f.requested_action
 and f.losing_hra = l_hra.losing_hra_num and f.gaining_hra = g_hra.gaining_hra_num `


const equipment_condition = `SELECT E.*,C.ALIAS AS CONDITION_ALIAS FROM EQUIPMENT E LEFT JOIN CONDITION C ON E.CONDITION = C.ID`   

const newQuerySelById = `SELECT
		f.id as form_id,
		f.status,
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
		where ra.id = f.requested_action and f.losing_hra = l_hra.losing_hra_num and f.gaining_hra = g_hra.gaining_hra_num AND f.id = :0`

const newQuerySelById2 = `SELECT eg.*,eq.*, TO_CHAR(eq.acquisition_date,'mm/dd/yyyy') as acquisition_date_print FROM EQUIPMENT_GROUP eg,
							(${equipment_condition}) eq WHERE eq.id = eg.equipment_id and eg.equipment_group_id = :0`
						 
//!SELECT * FROM form_4900
exports.index = async function(req, res) {

    // console.log('here at index form_4900')
	// const connection =  await oracledb.getConnection(dbConfig);

	// try{
    //     console.log('extract form_4900')
	// 	let result =  await connection.execute('SELECT * FROM form_4900',{},dbSelectOptions)
		
	// 	result.rows = result.rows.map(function(r){
	// 		r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
	// 		return r;
	// 	})

    //     console.log('rows fetched: ',result.rows.length)
	// 	response.ok(result.rows, res);
	// }catch(err){
	// 	console.log(err)
	// 	//logger.error(err)
	// }
};

//!SELECT form_4900 BY ID
exports.getById = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result = await connection.execute(newQuerySelById,[req.params.id],dbSelectOptions)

		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			const g_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('gaining_')})
			const l_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('losing_')})

			//console.log(g_keys)
			const hra = {gaining:{},losing:{}}

			for(const key of g_keys){
				hra.gaining[key.replace('gaining_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
			}

			for(const key of l_keys){
				hra.losing[key.replace('losing_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
			}

			result.rows[0].equipment_group = []
			result.rows[0].hra = hra

			//console.log(result.rows[0].equipment_group_id)
			let eg_result = await connection.execute(newQuerySelById2,[result.rows[0].equipment_group_id],dbSelectOptions)

			//console.log(eg_result)
			if(eg_result.rows.length > 0){
				eg_result.rows = propNamesToLowerCase(eg_result.rows)
				result.rows[0].equipment_group = eg_result.rows
				//console.log(result.rows[0])
	
				handleData(result.rows[0])
	
				//console.log(`returning ${result.rows.length} rows`)
				return res.status(200).json({
					status: 200,
					error: false,
					message: 'Successfully get single data!',//return form and bartags.
					data: result.rows[0]
				});
			}

			return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',//return form and no bartags.
				data: result.rows[0]
			});
		}

		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: null
		});
	}catch(err){
		console.log(err)
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: null
		});
		//logger.error(err)
	}
};

//!SELECT form_4900 BY ID
exports.getPdfById = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result = await connection.execute(newQuerySelById,[req.params.id],dbSelectOptions)

		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			const g_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('gaining_')})
			const l_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('losing_')})

			//console.log(g_keys)
			const hra = {gaining:{},losing:{}}

			for(const key of g_keys){
				hra.gaining[key.replace('gaining_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
			}

			for(const key of l_keys){
				hra.losing[key.replace('losing_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
			}

			result.rows[0].equipment_group = []
			result.rows[0].hra = hra

			//console.log(result.rows[0].equipment_group_id)
			let eg_result = await connection.execute(newQuerySelById2,[result.rows[0].equipment_group_id],dbSelectOptions)

			//console.log(eg_result)
			if(eg_result.rows.length > 0){
				eg_result.rows = propNamesToLowerCase(eg_result.rows)
				result.rows[0].equipment_group = eg_result.rows
				//console.log(result.rows[0])
	
				await handleData(result.rows[0])
	
				//res.contentType("application/pdf");
				var file = path.join(__dirname , '../output/output_eng4900.pdf');    

				fs.readFile(file , function (err,data){
					res.contentType("application/pdf");
					res.send(data);
				});

				// res.download(file, function (err) {
				// 	if (err) {
				// 		console.log("Error on sending file.");
				// 		console.log(err);
				// 	} else {
				// 		console.log("Success on seding file.");
				// 	}    
				// });
				//console.log(`returning ${result.rows.length} rows`)
				// return res.status(200).json({
				// 	status: 200,
				// 	error: false,
				// 	message: 'Successfully get single data!',//return form and bartags.
				// 	data: result.rows[0]
				// });
			}

			// return res.status(200).json({
			// 	status: 200,
			// 	error: false,
			// 	message: 'Successfully get single data!',//return form and no bartags.
			// 	data: result.rows[0]
			// });
		}

		// return res.status(400).json({
		// 	status: 400,
		// 	error: true,
		// 	message: 'No data found!',
		// 	data: null
		// });
	}catch(err){
		// console.log(err)
		// return res.status(400).json({
		// 	status: 400,
		// 	error: true,
		// 	message: 'No data found!',
		// 	data: null
		// });
		//logger.error(err)
	}
};

const FormsToMaterialTableFormat = (form_groups) => {

	const form_return = []

	for(const id in form_groups){
		const {form_id, status, losing_hra_num , losing_hra_full_name, gaining_hra_num, gaining_hra_full_name, document_source, originator} = form_groups[id][0]
		
		form_return.push({
			bar_tags: printElements(form_groups[id].map(x => x.bar_tag_num)),
			document_source: document_source,
			form_id: form_id,
			gaining_hra: `${gaining_hra_num} - ${gaining_hra_full_name}`,
			losing_hra: `${losing_hra_num} - ${losing_hra_full_name}`,
			status: status,
			originator:originator
		})
	}

	return(form_return)
}

//!SELECT form_4900 BY FIELDS DATA
exports.search2 = async function(req, res) {
	const TABS = ["my_forms","hra_forms","sign_forms","completed_forms"]
	const edit_rights = await rightPermision(req.headers.cert.edipi)
	const connection =  await oracledb.getConnection(dbConfig);
	let query_search = '';

	console.log(req.user)
	try{
		if(edit_rights){
			const {fields,options, tab, init} = req.body;
			//console.log(options)
			const searchCriteria = filter(Object.keys(fields),function(k){ return fields[k] != ''});
			//console.log(searchCriteria)
			for(const parameter of searchCriteria){
				//parameter = parameter.replace(/[0-9]/g,'')
				//console.log(parameter)
				const isStringColumn = eng4900DatabaseColNames[parameter].type == "string"
				const db_col_name = isStringColumn ? `LOWER(${eng4900DatabaseColNames[parameter].name})` : eng4900DatabaseColNames[parameter].name

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
						query_search = query_search.concat(`${andOR_single[options.includes[parameter]](query_search)} ${db_col_name} ${includesOperator} ${val} `)

						//console.log(val,query_search)
						//query_search = blankOptions ? query_search.concat(` ${or_(query_search)} ${db_col_name} ${blankOptions} `) : query_search
					}
				}
			}

			// for(const parameter in options.includes){
			// 	const isStringColumn = eng4900DatabaseColNames[parameter].type == "string"
			// 	const db_col_name = isStringColumn ? `LOWER(${eng4900DatabaseColNames[parameter].name})` : eng4900DatabaseColNames[parameter].name


			// 	const operator = eqOperator[options.includes[parameter]]
			// 	console.log('eqOperator: '+operator)
			// }

			for(const parameter in options.blanks){
				//if(option.blanks[parameter] != BLANKS_DEFAULT){
					//parameter = parameter.replace(/[0-9]/g,'')
				const isStringColumn = eng4900DatabaseColNames[parameter].type == "string"
				const db_col_name = isStringColumn ? `LOWER(${eng4900DatabaseColNames[parameter].name})` : eng4900DatabaseColNames[parameter].name
				const blankOperator = searchBlanks[options.blanks[parameter]]
				const and_OR = blankAndOr[options.blanks[parameter]]
				query_search = blankOperator ? query_search + `${and_(query_search)} (${db_col_name} ${blankNull[blankOperator]} null ${and_OR} ${db_col_name} ${blankOperator} ' ')` : query_search
				//}
			}
			//query_search = blankOptions ? query_search.concat(` ${or_} ${db_col_name} ${blankOptions} `) : query_search
			const tabsReturnObject = {}		

			if(init){
				for(let i=0;i<TABS.length;i++){
					const tab_name = TABS[i]

					let query = `${queryForSearch(req.user)} `

					if(tab_name == "my_forms"){
						query += `AND (f.LOSING_HRA IN (${hra_num_form_self(req.user)} )) `
					}

					if(tab_name == "hra_forms"){
						query += `AND (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} )) `
					}
		
					if(tab_name == "sign_forms"){//Change: needs to be self.
						query = `${query} AND (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS = 5) UNION ALL 
						${query} AND (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS = 3)`
					}

					if(tab_name == "completed_forms"){
						query = `${query} AND (f.GAINING_HRA IN (${hra_num_form_all(req.user)}) AND F.STATUS >= 6) UNION ALL 
						${query} AND (f.LOSING_HRA IN (${hra_num_form_all(req.user)} ) AND F.STATUS >= 6)`
					}

					//console.log(`QUERY-${tab_name}`,query)
		
					let result =  await connection.execute(`${query}`,{},dbSelectOptions)
					let {rows} = result
		
					rows = propNamesToLowerCase(rows)
		
					const form_groups = groupBy(rows, function(r) {
						return r.form_id;
					  });		
		
					tabsReturnObject[i] = FormsToMaterialTableFormat(form_groups)
				}

				return res.status(200).json({
					status: 200,
					error: false,
					message: 'Successfully get single data!',
					data: tabsReturnObject,
					editable: edit_rights
				});
			}

			let query = `${queryForSearch(req.user)}
							${query_search != '' ? ' AND': ''} ${query_search} `

			query += `${query_search != '' ? 'AND': ''} ${query_search}`

			if(tab == "my_forms"){
				query += `AND (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} )) `
			}

			if(tab == "hra_forms"){
				query += `AND (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} )) `
			}

			if(tab == "sign_forms"){
				query = `${query} AND (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS = 5) UNION ALL 
						${query} AND (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS = 3)`
			}

			if(tab == "completed_forms"){
				query = `${query} AND (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS >= 6) UNION ALL 
				${query} AND (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS >= 6)`
			}

			let result =  await connection.execute(`${query}`,{},dbSelectOptions)
			let {rows} = result

			rows = propNamesToLowerCase(rows)

			const form_groups = groupBy(rows, function(r) {
				return r.form_id;
			  });		

			const search_return = FormsToMaterialTableFormat(form_groups)

			if(search_return.length > 0){
				return res.status(200).json({
					status: 200,
					error: false,
					message: 'Successfully get single data!',
					data: {[TABS.indexOf(tab)]: search_return},
					editable: edit_rights
				});
			}
		}

		return res.status(200).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: search_return,
			editable: edit_rights
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(200).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {},
			editable: edit_rights
		});
		//logger.error(err)
	}
};


const create4900EquipmentGroup = async (equipmentIds,connection) => {
	let result = await connection.execute(`SELECT SEQ_EQUIPMENT_GROUP_ID.nextval from dual`,{},dbSelectOptions)

	if(result.rows.length > 0){
		const eGroupId = result.rows[0].NEXTVAL
		let query = `INSERT INTO EQUIPMENT_GROUP (EQUIPMENT_GROUP_ID, EQUIPMENT_ID)
		(SELECT ${eGroupId}, ID FROM EQUIPMENT WHERE ID IN (`

		const uniqEqs = uniq(equipmentIds)

		for(let i = 0; i < uniqEqs.length; i++){
			query += (i > 0) ? ", :" + i : ":" + i;
		}
			
		query += "))";

		result = await connection.execute(query,uniqEqs,{autoCommit:true})
		return(result.rowsAffected > 0 ? eGroupId : -1)
	}

	return(-1)
}

//!INSERT form_4900
exports.add = async function(req, res) {
	const {edipi} = req.headers.cert
	const connection =  await oracledb.getConnection(dbConfig);
	const equipmentIds = req.body.form.equipment_group.map(x => x.id)

	let keys = Object.keys(req.body.form)
	const form = {}
	const cells = {}
	let cols = ""
	let vals = ""

	for(const key of keys){
		if(req.body.form[key]){
			form[key] = req.body.form[key]
		}
	}

	let result =  await connection.execute(`SELECT * FROM REQUESTED_ACTION WHERE UPPER(NAME) = UPPER(:0)`,[form.requested_action],dbSelectOptions)


	if(result.rows.length > 0 && form.hra.losing.hra_num && form.hra.gaining.hra_num && equipmentIds.length > 0){
		form.requested_action = result.rows[0].ID
		form.losing_hra = form.hra.losing.hra_num
		form.gaining_hra = form.hra.gaining.hra_num
		form.equipment_group_id = await create4900EquipmentGroup(equipmentIds,connection)
		delete form.hra
		delete form.equipment_group

		result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_4900'`,{},dbSelectOptions)

		if(result.rows.length > 0 && form.equipment_group_id != -1){
			result.rows = filter(result.rows,function(x){ return !BANNED_COLS_ENG4900.includes(x.COLUMN_NAME)})
			const col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())
			keys = Object.keys(form)

			for(let i=0; i<keys.length; i++){
				if(col_names.includes(keys[i])){
					let comma =  i && cols ? ', ': ''
					cols = cols + comma + keys[i]
					vals = vals + comma + ':' + keys[i]
					cells[keys[i]] = keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? new Date(form[keys[i]]) :
					(typeof form[keys[i]] == 'boolean') ? (form[keys[i]] ? 1 : 2) :  form[keys[i]]
				}

				if(i == keys.length - 1 && typeof edipi != 'undefined'  && !keys.includes('updated_by')){
					result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
					if(result.rows.length > 0){
						const user_rights_id = result.rows[0].ID
						const comma =  cols ? ', ': ''
						cols = cols + comma + 'updated_by'
                        vals = vals + comma + ':' + 'updated_by'
						cells['updated_by'] = user_rights_id
					}
				}
			}

			let query = `INSERT INTO FORM_4900 (${cols}) VALUES (${vals})`
			result = await connection.execute(query,cells,{autoCommit:true})

			if(result.rowsAffected > 0){
				query = `${queryForSearch(req.user)} AND F.ROWID = :0`
				result = await connection.execute(query,[result.lastRowid],dbSelectOptions)
				result.rows = propNamesToLowerCase(result.rows)

				const form_groups = groupBy(result.rows, function(r) {
					return r.form_id;
				  });	

				const search_return = FormsToMaterialTableFormat(form_groups)

				connection.close()
				return res.status(200).json({
					status: 200,
					error: false,
					message: 'Successfully added new form!',
					data: search_return[0]
				});
			}

			connection.close()
			return res.status(200).json({
				status: 400,
				error: true,
				message: 'Could not add new form!',
				data: {},
			});
		}
	}

	// let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_4900'`,{},dbSelectOptions)

		
	// if(result.rows.length > 0){
	// 	result.rows = filter(result.rows,function(c){ return !BANNED_COLS_ENG4900.includes(c.COLUMN_NAME)})
	// 	const col_names = result.rows.map(x=>x.COLUMN_NAME)
	// 	keys = Object.keys(form)

	// 	for(let i=0; i<keys.length; i++){
	// 		if(col_names.includes(keys[i])){
	// 			const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
	// 			let comma =  i && cols ? ', ': ''
	// 			cols = cols + comma + col_name + ' = :' + keys[i]
	// 			cells.update[keys[i]] = keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? new Date(cells.new[keys[i]]) :
	// 			(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) :  cells.new[keys[i]]
	// 		}

	// 		if(i == keys.length - 1 && typeof edipi != 'undefined'  && !keys.includes('updated_by')){
	// 			result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
	// 			if(result.rows.length > 0){
	// 				const user_rights_id = result.rows[0].ID
	// 				const comma =  cols ? ', ': ''
	// 				cols = cols + comma + 'updated_by = :updated_by'
	// 				cells.update['updated_by'] = user_rights_id
	// 			}
	// 		}
	// 	}

	// 	console.log(col_names)
	// }
	//console.log(req.body.form,form)

	// req.body.form
	// const {type} = req.body
	// const {equipment_group, requested_action} = req.body.form
	// const {losing, gaining} = req.body.form.hra
	// const equipmentIds = equipment_group.map(x => x.id)

	res.status(200).json({
				status: 200,
				message: 'data sent!'
	});

	// const connection =  await oracledb.getConnection(dbConfig);
	// // const item_type = req.body.item_type ? req.body.item_type : 'no data' || ternary operator
	// const { item_type } = req.body;

	try{
	// 	let result =  await connection.execute(`SELECT * FROM REQUESTED_ACTION WHERE UPPER(NAME) = UPPER(:0)`,[requested_action],dbSelectOptions)

	// 	if(result.rows.length > 0 && losing.hra_num && gaining.hra_num && equipmentIds.length > 0){
	// 		const req_act_id = result.rows[0].ID

	// 		console.log(req_act_id,losing.hra_num,gaining.hra_num,equipmentIds)
	// 	}
		

	}catch(err){
		console.log(err);
		// res.status(400).json({
		// 	status: 400,
		// 	message: 'Error add new data!'
		// });
	}
};


//!UPDATE FROM_4900 DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	//let columnErrors = {rows:{},errorFound:false}
	const {edipi} = req.headers.cert

	try{
		const {changes, undo} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//columnErrors.rows[row] = {}
				const {newData,oldData} = changes[row];
				const cells = newData && oldData ? {new:objectDifference(oldData,newData,'tableData'),old:oldData} : newData
				//console.log(cells)

				const keys = cells.new ?  Object.keys(cells.new) : []
				cells.update = {}
				let cols = ''
				const cell_id = cells.old ? cells.old.form_id : -1

				if(cell_id != -1){
					let result = await connection.execute(`SELECT * FROM FORM_4900 WHERE ID = :0`,[cell_id],dbSelectOptions)
					//const editable = result.rows.length > 0 ? (result.rows[0].STATUS >= 8 ? true : false) : true
					result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_4900'`,{},dbSelectOptions)
	
					if(result.rows.length > 0){
						result.rows = filter(result.rows,function(c){ return !BANNED_COLS_ENG4900.includes(c.COLUMN_NAME)})
						let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())	
	
						if(keys.length > 0){
							for(let i=0; i<keys.length; i++){
								if(col_names.includes(keys[i])){
									let comma =  i && cols ? ', ': ''
									cols = cols + comma + keys[i] + ' = :' + keys[i]
									cells.update[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(cells.new[keys[i]]) :
									(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) :  cells.new[keys[i]]
								}
	
								if(i == keys.length - 1 && typeof edipi != 'undefined'){
									result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)

									if(result.rows.length > 0){
										const user_rights_id = result.rows[0].ID
										const comma =  cols ? ', ': ''
										cols = cols + comma + 'updated_by = :updated_by'
										cells.update['updated_by'] = user_rights_id
									}
								}
							}
				
							let query = `UPDATE FORM_4900 SET ${cols} 
							WHERE ID = ${cells.old.form_id}`
						
							//console.log(query,cells.update)
							result = await connection.execute(query,cells.update,{autoCommit:AUTO_COMMIT.UPDATE})
							
							if(result.rowsAffected > 0){
								query = `${queryForSearch(req.user)} AND F.ROWID = :0`
								result = await connection.execute(query,[result.lastRowid],dbSelectOptions)
								result.rows = propNamesToLowerCase(result.rows)
				
								const form_groups = groupBy(result.rows, function(r) {
									return r.form_id;
								  });	
				
								const search_return = FormsToMaterialTableFormat(form_groups)
				
								console.log(form_groups,result.rows)
								connection.close()
								return res.status(200).json({
									status: 200,
									error: false,
									message: 'Successfully added new form!',
									data: search_return[0]
								});
							}
						}
	
						//connection.close()
	
						// return (
						// 	res.status(200).json({
						// 		status: 200,
						// 		error: false,
						// 		message: 'Successfully update data with id: ', //+ req.params.id,
						// 		data: null,//req.body,
						// 		//columnErrors: columnErrors
						// 	})
						// )
					}
				}
			}
		}
		//if(columnErrors.errorFound){
			//connection.close()//don't save changes if error is found.
		//}else if(undo){
		connection.close()
		//}
		
		return (
			res.status(200).json({
				status: 400,
				error: true,
				message: 'Could not update data', //+ req.params.id,
				data: null,//req.body,
				//columnErrors: columnErrors
			})
		)
	}catch(err){
		connection.close()
		console.log(err);
		res.status(400).json({
			status: 400,
			error: true,
			//columnErrors:columnErrors,
			message: 'Cannot delete data with id: ' //+ req.params.id
		});
	}
};

//!DELETE form_4900 (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	// const connection =  await oracledb.getConnection(dbConfig);

	// try{
	// 	let result =  await connection.execute(`DELETE from form_4900 WHERE id = :0`,[req.params.id],{autoCommit:true})
	// 	console.log(result)
	// 	if (result.rowsAffected > 0) {
	// 		result.rows = result.rows.map(function(r){
	// 			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
	// 			return r;
	// 		})

	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully delete data with id: ' + req.params.id
	// 		});
	// 	} else {
	// 		res.status(400).json({
	// 			status: 400,
	// 			error: true,
	// 			message: 'Cannot delete data with id: ' + req.params.id
	// 		});
	// 	}
	// }catch(err){
	// 	console.log(err);
	// }
};

const savePdfToDatabase = async (filename) => {
	console.log(filename)
	const connection =  await oracledb.getConnection(dbConfig);
	result = await connection.execute('CALL WRITE_BLOB_TO_FILE (:0)',[filename],{autoCommit:true})
	console.log(result)
	connection.close()
}

//!UPLOAD form_4900 (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.upload = async function(req, res) {
	if (!req.files) {
        return res.status(500).send({ msg: "file is not found" })
	}
	
    // accessing the file
	const myFile = req.files.file;
	
	//  mv() method places the file inside public directory
    myFile.mv(path.join(__dirname,`../public/${myFile.name}`), async function (err) {
        if (err) {
            console.log(err)
            return res.status(500).send({ msg: "Error occured" });
		}

		const valid_signature = await ValidateEng4900Signature(`./public/${myFile.name}`,"losing")
		console.log("losing hra signed? " + (valid_signature ? "yes":"no"))

		//await savePdfToDatabase(path.join(__dirname,`../public/${myFile.name}`))
	});
	
	// returing the response with file path and name
	return res.send({name: myFile.name, path: `/${myFile.name}`});
};

//!SELECT form_4900 BY ID
// exports.testPdfBuild = async function(req, res) {

// 	const connection =  await oracledb.getConnection(dbConfig);
// 	console.log('here')
// 	try{
// 		console.log(newQuerySelById)
// 		let result = await connection.execute(newQuerySelById,[25],dbSelectOptions)

		
// 		if (result.rows.length > 0) {

// 			result.rows = propNamesToLowerCase(result.rows)
// 			result.rows[0].equipment_group = []
// 			let eg_result = await connection.execute(newQuerySelById2,[result.rows[0].equipment_group_id],dbSelectOptions)

// 			if(eg_result.rows.length > 0){
// 				eg_result.rows = propNamesToLowerCase(eg_result.rows)
// 				result.rows[0].equipment_group = eg_result.rows

// 				pdfFill.handleData(result.rows[0])

// 				return res.status(200).json({
// 					status: 200,
// 					error: false,
// 					message: 'Successfully get single data!',//return form and bartags.
// 					data: result.rows[0]
// 				});
// 			}

// 			return res.status(200).json({
// 				status: 200,
// 				error: false,
// 				message: 'Successfully get single data!',//return form and no bartags.
// 				data: result.rows[0]
// 			});
// 		}

// 		return res.status(400).json({
// 			status: 400,
// 			error: true,
// 			message: 'No data found!',
// 			data: null
// 		});
// 	}catch(err){
// 		console.log(err)
// 		return res.status(400).json({
// 			status: 400,
// 			error: true,
// 			message: 'No data found!',
// 			data: null
// 		});
// 	}
// };
