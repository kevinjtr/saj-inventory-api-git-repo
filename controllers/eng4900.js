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
const {create4900, ValidateEng4900Signature} = require('../pdf-fill.js')
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');
const BANNED_COLS_FORM_EQUIPMENT = ['ID','HRA_NUM','OFFICE_SYMBOL_ALIAS','SYS_','UPDATED_BY']
const BANNED_COLS_ENG4900 = ['ID','UPDATED_BY','SYS_NC00008$','DELETED']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const pdfUploadPath = path.join(__dirname,'../file_storage/pdf/')

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
f.file_storage_id,
fs.status as status_alias,
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
eg.form_equipment_group_ID as equipment_group_id,
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
	from form_4900 f
	LEFT JOIN form_equipment_group eg on eg.form_equipment_group_id = f.form_equipment_group_id
	LEFT JOIN form_equipment e on e.id = eg.form_equipment_id
	LEFT JOIN requested_action ra on ra.id = f.requested_action
	LEFT JOIN (${eng4900_gainingHra}) g_hra on f.gaining_hra = g_hra.gaining_hra_num 
	LEFT JOIN ( ${eng4900_losingHra}) l_hra on f.losing_hra = l_hra.losing_hra_num
	LEFT JOIN FORM_4900_STATUS fs on f.status = fs.id `


const equipment_condition = `SELECT E.*,C.ALIAS AS CONDITION_ALIAS FROM FORM_EQUIPMENT E LEFT JOIN CONDITION C ON E.CONDITION = C.ID`   

const newQuerySelById = `SELECT
		f.id as form_id,
		f.status,
		f.file_storage_id,
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
		f.form_equipment_group_id,
		f.expiration_date,
		TO_CHAR(f.expiration_date,'mm/dd/yyyy') as expiration_date_print,
		f.temporary_loan
		from form_4900 f, requested_action ra,
		(${eng4900_losingHra}) l_hra, (${eng4900_gainingHra}) g_hra
		where ra.id = f.requested_action and (f.losing_hra = l_hra.losing_hra_num or (f.losing_hra is NULL and l_hra.losing_hra_num  is null)) and f.gaining_hra = g_hra.gaining_hra_num AND f.id = :0 
		UNION ALL (
			SELECT
			f.id as form_id,
			f.status,
			f.file_storage_id,
			ra.alias as REQUESTED_ACTION,
			f.LOSING_HRA as losing_hra_num,
			null as losing_hra_first_name,
			null as losing_hra_last_name,
			null as losing_hra_office_symbol,
			null as losing_hra_os_alias,
			null as losing_hra_work_phone,
			f.GAINING_HRA as gaining_hra_num,
			g_hra.gaining_hra_first_name,
			g_hra.gaining_hra_last_name,
			g_hra.gaining_hra_office_symbol,
			g_hra.gaining_hra_os_alias,
			g_hra.gaining_hra_work_phone,
			f.DATE_CREATED,
			f.FOLDER_LINK,
			f.form_equipment_group_id,
			f.expiration_date,
			TO_CHAR(f.expiration_date,'mm/dd/yyyy') as expiration_date_print,
			f.temporary_loan
			from form_4900 f, requested_action ra,
			(${eng4900_gainingHra}) g_hra
			where ra.id = f.requested_action and f.losing_hra is NULL and f.gaining_hra = g_hra.gaining_hra_num AND f.id = :0
		) `

const newQuerySelById2 = `SELECT eg.*,eq.*, TO_CHAR(eq.acquisition_date,'mm/dd/yyyy') as acquisition_date_print FROM FORM_EQUIPMENT_GROUP eg,
							(${equipment_condition}) eq WHERE eq.id = eg.form_equipment_id and eg.form_equipment_group_id = :0`

const FORM_4900_STATUS = {
	1:"Form created",
	2:"Completed Individual/Vendor ROR Property",
	3:"Losing HRA signature required",
	4:"Completed losing HRA signature",
	5:"Gaining HRA signature required",
	6:"Completed gaining HRA signature",
	7:"Sent to Logistics",
	8:"Sent to PBO",
	9:"Completed",
}
		
const isFormCompleted = (rowData) => {
	const {status} = rowData
	
	if(status){
		return (FORM_4900_STATUS[status] == "Completed")
	}
	
	return false
}
		
const doTransaction = async (connection, user_id, rowData) => {
	let return_result = {error: false, message: "no action was done."}
	const {form_id} = rowData

	try{
		let sql = queryForSearch(user_id) + ` WHERE f.ID = ${form_id}`//returns array of equipments.
		let result = await connection.execute(sql,{},dbSelectOptions)

		if(isFormCompleted(rowData) && result.rows.length > 0){
			console.log('HERE dT-1')
			result.rows = propNamesToLowerCase(result.rows)
			
			const {requested_action, status_alias, losing_hra_num, gaining_hra_num} = result.rows[0]
			const bar_tags = result.rows.map(x => x.bar_tag_num)
			const bar_tags_print = printElements(bar_tags)

			let equipment_result = await connection.execute(`SELECT * FROM EQUIPMENT where BAR_TAG_NUM in (${bar_tags_print})`,{},dbSelectOptions)
	
			if(status_alias == "Completed"){
				switch (requested_action) {
					case "Issue":
						console.log('HERE dT-2-i')
						if(equipment_result.rows.length == 0){
							console.log('HERE dT-3-i')
							result = await connection.execute(`INSERT INTO EQUIPMENT (SELECT * FROM FORM_EQUIPMENT WHERE BAR_TAG_NUM IN (${bar_tags_print}))`,{},{autoCommit:false})
							if(result.rowsAffected != bar_tags.length){
								return_result = {...return_result, error:true,  message: `One or more equipments could not be added.`}
							}else{
								return_result = {...return_result,  message: `all equipments were added.`}
							}
						}else{
							// equipment_result.rows = propNamesToLowerCase(equipment_result.rows)
							// const bar_tags_found = equipment_result.rows.map(x => bar_tag_num) 
							return_result = {...return_result, error:true,  message: `1 - equipment/s: ${bar_tags_print} already exists.`}
						}
						
						break;
					case "Transfer":
						console.log('HERE dT-2-t')
						if(equipment_result.rows.length > 0){
							console.log('HERE dT-3-t')
							equipment_result.rows = propNamesToLowerCase(equipment_result.rows)
							equipment_result.rows.map((equipment, i) => {
	
								if(equipment.hra_num == gaining_hra_num){
									//equipment is already tied to the gaining HRA.
									return_result = {...return_result, error:true, message: 
										return_result.message += (return_result.message.length > 0 ?  ", " : "") + `${i+1} - bartag: ${equipment.bar_tag_num} is already tied to the gaining_hra (${gaining_hra_num})`
									}
								}else if(equipment.hra_num != losing_hra_num){
									//equipment is no longer tied to the losing HRA.
									return_result = {...return_result, error:true, message: 
										return_result.message += (return_result.message.length > 0 ?  ", " : "") + `${i+1} - bartag: ${equipment.bar_tag_num} is no longer tied to the losing_hra (${losing_hra_num})`
									}
								}
							})
	
							if(!return_result.error){
								result = await connection.execute(`UPDATE EQUIPMENT SET HRA_NUM = ${gaining_hra_num} WHERE BAR_TAG_NUM IN (${bar_tags_print})`,{},{autoCommit:false})
	
								if(result.rowsAffected != bar_tags.length){
									return_result = {...return_result, error:true,  message: `One or more equipments could not be transfered.`}
								}else{
									return_result = {...return_result,  message: `all equipments were transfered.`}
								}
							}
							
						}else{
								return_result = {...return_result, error:true,  message: `No equipments where found.`}
						}
		
						break;
					case "Repair":
						//do nothing.
						break;
					case "Excess":
						console.log('HERE dT-2-e')
						if(equipment_result.rows.length > 0){
							console.log('HERE dT-3-e')
							equipment_result.rows = propNamesToLowerCase(equipment_result.rows)
							equipment_result.rows.map((equipment, i) => {
								if(equipment.hra_num != losing_hra_num){
									//equipment is no longer tied to the losing HRA.
									return_result = {...return_result, error:true, message: 
										return_result.message += (return_result.message.length > 0 ?  ", " : "") + `${i+1} - bartag: ${equipment.bar_tag_num} is no longer tied to the losing_hra (${losing_hra_num})`
									}
								}
							})
		
							if(!return_result.error){
								console.log('HERE dT-4-e')
								result = await connection.execute(`UPDATE EQUIPMENT SET DELETED = 1 WHERE BAR_TAG_NUM IN (${bar_tags_print})`,{},{autoCommit:false})
		
								if(result.rowsAffected != bar_tags.length){
									console.log('HERE dT-5-e')
									return_result = {...return_result, error:true,  message: `One or more equipments could not be discarted.`}
								}else{
									console.log('HERE dT-5-e')
									return_result = {...return_result,  message: `all equipments were discarted.`}
								}
							}
							
						}else{
							console.log('HERE dT-3-e')
								return_result = {...return_result, error:true,  message: `No equipments where found.`}
						}
						break;
					case "FOI":
						console.log('HERE dT-2-f')
						if(equipment_result.rows.length > 0){
							console.log('HERE dT-3-f')
							equipment_result.rows = propNamesToLowerCase(equipment_result.rows)
							equipment_result.rows.map((equipment, i) => {
	
								if(equipment.hra_num == gaining_hra_num){
									//equipment is already tied to the gaining HRA.
									return_result = {...return_result, error:true, message: 
										return_result.message += (return_result.message.length > 0 ?  ", " : "") + `${i+1} - bartag: ${equipment.bar_tag_num} is already tied to FOI (${gaining_hra_num})`
									}
								}else if(equipment.hra_num != losing_hra_num){
									//equipment is no longer tied to the losing HRA.
									return_result = {...return_result, error:true, message: 
										return_result.message += (return_result.message.length > 0 ?  ", " : "") + `${i+1} - bartag: ${equipment.bar_tag_num} is no longer tied to the losing_hra (${losing_hra_num})`
									}
								}
							})
	
							if(!return_result.error){
								result = await connection.execute(`UPDATE EQUIPMENT SET HRA_NUM = ${gaining_hra_num} WHERE BAR_TAG_NUM IN (${bar_tags_print})`,{},{autoCommit:false})
	
								if(result.rowsAffected != bar_tags.length){
									return_result = {...return_result, error:true,  message: `One or more equipments could not be transfered to FOI.`}
								}else{
									return_result = {...return_result,  message: `all equipments were transfered to FOI.`}
								}
							}
							
						}else{
								return_result = {...return_result, error:true,  message: `No equipments where found.`}
						}
						break;
					default:
						return_result = {...return_result, error:true,  message: `Requested Action was not found.`}
				}	
			}else {
				return_result = {...return_result, error:true,  message: `form is not completed.`}
			}
	
			return return_result
		}
	}catch(err){
		return_result = {...return_result, error:true, message:"an error has occured."}
	}

	return return_result
}
	
const isFileValid = (filename, type=null) => {
	const nameArray = filename.toLowerCase().split(".")
	const ext = nameArray.length > 0 ? nameArray[nameArray.length - 1] : "error"
	const validTypes = !type ? ["jpg", "jpeg", "png", "pdf"] : [type];

	if (validTypes.indexOf(ext) === -1) {
		return false;
	}
	return true;
};
	
const saveFileInfoToDatabase = async (connection, filename, folder) => {
	try{
		let selectResult = await connection.execute(`select id from file_storage where file_name = :0`, [filename], dbSelectOptions);
		let sql =""
		let binds = ""
	
		if(selectResult.rows.length > 0){
			//update previous record.
			binds = {
				file_name: filename,
				id: {type: oracledb.NUMBER, dir: oracledb.BIND_OUT}
			};
	
			sql = `update file_storage (file_name) values (:file_name) where id = ${selectResult.rows[0].ID} returning id into :id`
	
			console.log('updated previous file_storage record.')
		}else{
			//create new record.
			binds = {
				file_name: filename,
				folder: folder,
				id: {type: oracledb.NUMBER, dir: oracledb.BIND_OUT}
			};
	
			sql = `insert into file_storage (file_name, folder) values (:file_name, :folder) returning id into :id`
			console.log('created a new file_storage record.')
		}
	
		let insertUpdateResult = await connection.execute(sql, binds,{autoCommit:true});
	
		return insertUpdateResult.outBinds.id[0]
	}catch(err){
		console.log(err)
		return (-1)
	}
}
	
const formUpdate = async (connection, edipi, changes, auto_commit=true) => {
	try{
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {id} = changes[row];
				const cells = {new: changes[row]}
				let result = await connection.execute(`SELECT * FROM FORM_4900 WHERE ID = :0`,[id],dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = propNamesToLowerCase(result.rows)
					cells.old = result.rows[0]
					const keys = cells.new ?  Object.keys(cells.new) : []
					cells.update = {}
					let cols = ''
					const cell_id = cells.old ? cells.old.id : -1

					if(cell_id != -1){
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
										result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)

										if(result.rows.length > 0){
											const registered_users_id = result.rows[0].ID
											const comma =  cols ? ', ': ''
											cols = cols + comma + 'updated_by = :updated_by'
											cells.update['updated_by'] = registered_users_id
										}
									}
								}
					
								let query = `UPDATE FORM_4900 SET ${cols} WHERE ID = ${cells.old.id}`
							

								console.log(query,cells.update)
								result = await connection.execute(query,cells.update,{autoCommit:auto_commit})
								
								return (result.rowsAffected > 0)
							}
						}
					}
				}
			}
		}
		
	return false//no rows affected.
		
	}catch(err){
		console.log(err)
		return false//no rows affected.
	}
}
	
const ParseHeaders = async (string_to_parse) => {
	let parsed_result = {}

	try{
		parsed_result = JSON.parse(string_to_parse)
	}catch(err){
		//do nothing.
	}

	return parsed_result
}

//!SELECT * FROM form_4900
exports.index = async function(req, res) {

	// const connection =  await oracledb.getConnection(dbConfig);

	// try{
	// 	let result =  await connection.execute('SELECT * FROM form_4900',{},dbSelectOptions)
		
	// 	result.rows = result.rows.map(function(r){
	// 		r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
	// 		return r;
	// 	})


	// 	response.ok(result.rows, res);
	// }catch(err){
	// 	//logger.error(err)
	// }
};

//!SELECT form_4900 BY ID
exports.getById = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		console.log('select by ID')
		let result = await connection.execute(newQuerySelById,[req.params.id],dbSelectOptions)

		
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			const g_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('gaining_')})
			const l_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('losing_')})

			const hra = {gaining:{},losing:{}}

			for(const key of g_keys){
				hra.gaining[key.replace('gaining_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
			}

			for(const key of l_keys){
				hra.losing[key.replace('losing_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
			}

			result.rows[0].equipment_group = []
			result.rows[0].hra = hra

			//console.log(result.rows[0].form_equipment_group_id)
			let eg_result = await connection.execute(newQuerySelById2,[result.rows[0].form_equipment_group_id],dbSelectOptions)

			//console.log(eg_result)
			if(eg_result.rows.length > 0){
				eg_result.rows = propNamesToLowerCase(eg_result.rows)
				result.rows[0].equipment_group = eg_result.rows
				//console.log(result.rows[0])
	
				create4900(result.rows[0])
	
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

		if(result.rows.length > 0){
			console.log('here1')
			result.rows = propNamesToLowerCase(result.rows)
			const {file_storage_id} = result.rows[0]

			if(file_storage_id){//Found a stored PDF.
				console.log('here2')
				let fileStorageResult = await connection.execute("SELECT * FROM file_storage WHERE ID = :0",[file_storage_id],dbSelectOptions)

				if(fileStorageResult.rows.length > 0){
					console.log('here3')
					fileStorageResult.rows = propNamesToLowerCase(fileStorageResult.rows)
					const {file_name, folder} = fileStorageResult.rows[0]

					let file = path.join(__dirname , `../file_storage/${folder}/${file_name}`);    

					fs.readFile(file , function (err,data){
						res.contentType("application/pdf");
						res.send(data);
						
					});

					return(res)
				}
				
			}

			if (result.rows.length > 0) {
				result.rows = propNamesToLowerCase(result.rows)
	
				const g_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('gaining_')})
				const l_keys = filter(Object.keys(result.rows[0]),function(k){ return k.includes('losing_')})
				const hra = {gaining:{},losing:{}}
	
				for(const key of g_keys){
					hra.gaining[key.replace('gaining_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
				}
	
				for(const key of l_keys){
					hra.losing[key.replace('losing_','').replace('os_alias','office_symbol_alias')] = result.rows[0][key]
				}
	
				result.rows[0].equipment_group = []
				result.rows[0].hra = hra
				let eg_result = await connection.execute(newQuerySelById2,[result.rows[0].form_equipment_group_id],dbSelectOptions)
	
				if(eg_result.rows.length > 0){
					eg_result.rows = propNamesToLowerCase(eg_result.rows)
					result.rows[0].equipment_group = eg_result.rows	
					const result_pdf = await create4900(result.rows[0])
					
					if(result_pdf){
						var file = path.join(__dirname , '../output/output_eng4900.pdf');    
	
						fs.readFile(file , function (err,data){
							res.contentType("application/pdf");
							res.send(data);
							
						});
	
						return(res)
					}
					
					// .then(()=>{
	
					// 	var file = path.join(__dirname , '../output/output_eng4900.pdf');    
	
					// 	fs.readFile(file , function (err,data){
					// 		res.contentType("application/pdf");
					// 		res.send(data);
					// 	});
					// }).catch((err) => {
					// 	res.status(400)
					// 	  .json({message: 'an error has occured.', err: err});
					//   });
		
					//res.contentType("application/pdf");
					
	
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
	
				return res.status(400).json({message: 'an error has occured.', error: true});
			}
		}

	}catch(err){
		console.log(err)
		res.status(400).json({message: err, error: true});
	}
};

const FormsToMaterialTableFormat = (form_groups) => {

	const form_return = []

	//console.log(form_groups)
	for(const id in form_groups){
		const {form_id, status, losing_hra_num , losing_hra_full_name, gaining_hra_num, gaining_hra_full_name, document_source, originator, requested_action} = form_groups[id][0]
		
		form_return.push({
			bar_tags: printElements(form_groups[id].map(x => x.bar_tag_num)),
			document_source: document_source,
			form_id: form_id,
			gaining_hra: gaining_hra_num ? `${gaining_hra_num} - ${gaining_hra_full_name}` : '',
			losing_hra: losing_hra_num ? `${losing_hra_num} - ${losing_hra_full_name}` : '',
			status: status,
			originator:originator,
			requested_action: requested_action
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

			const tabsReturnObject = {}		

			if(init){
				for(let i=0;i<TABS.length;i++){
					const tab_name = TABS[i]

					
					//let query = queryForSearchLosingAndGainingHra(req.user)
					//let query2 = queryForSearchGainingHra(req.user)

					let query = queryForSearch(req.user)
					//let query2 = queryForSearchGainingHra(req.user)

					if(tab_name == "my_forms"){
						query += `WHERE (f.LOSING_HRA IN (${hra_num_form_self(req.user)} ) AND F.STATUS NOT IN (3,9) AND F.REQUESTED_ACTION in (2,4)) `

						query += `UNION ALL (${queryForSearch(req.user)} WHERE (f.GAINING_HRA IN (${hra_num_form_self(req.user)} ) AND F.STATUS NOT IN (5,9) AND F.REQUESTED_ACTION in (1,3,5))) `
					}

					if(tab_name == "hra_forms"){
						query += `WHERE (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS NOT IN (3,9) AND F.REQUESTED_ACTION in (2,4)) `
						query += `UNION ALL (${queryForSearch(req.user)} WHERE (f.GAINING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS NOT IN (5,9) AND F.REQUESTED_ACTION in (1,3,5))) `
						//query2 += `UNION ALL (${queryForSearchGainingHra(req.user)} AND (f.LOSING IN (${hra_num_form_auth(req.user)} ) AND F.REQUESTED_ACTION = 1)) `
					}
		
					if(tab_name == "sign_forms"){//Change: needs to be self.
						query += `WHERE (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS = 5 AND F.REQUESTED_ACTION in (2)) 
								UNION ALL (${queryForSearch(req.user)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS = 3 AND F.REQUESTED_ACTION in (2,4))) `

						query += `UNION ALL (${queryForSearch(req.user)} WHERE (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS = 5 AND F.REQUESTED_ACTION in (1,3,5))) `
					}

					if(tab_name == "completed_forms"){
						query += `WHERE (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS = 9 AND F.REQUESTED_ACTION in (2)) 
						UNION ALL (${queryForSearch(req.user)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS = 9 AND F.REQUESTED_ACTION in (2,4))) `
						
						query += `UNION ALL (${queryForSearch(req.user)} WHERE (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS = 9 AND F.REQUESTED_ACTION in (1,3,5))) `


						//query += `AND (f.GAINING_HRA IN (${hra_num_form_all(req.user)}) AND F.STATUS = 10 F.REQUESTED_ACTION in (2)) 
						//UNION ALL (${query} AND (f.LOSING_HRA IN (${hra_num_form_all(req.user)} ) AND F.STATUS = 10 F.REQUESTED_ACTION in (2))) `

						//query += `UNION ALL (${query2} AND (f.GAINING_HRA IN (${hra_num_form_all(req.user)}) AND F.STATUS = 10 AND F.REQUESTED_ACTION in (1,3,4,5))) `
					}

					//if(i == 1)
						//console.log('\n-----------------------------------------------------------------------------------\n', query ,'\n----------------------------------------------------------------\n')
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

			let query = `${queryForSearch(req.user)} `

			if(tab == "my_forms"){//self
				query += `WHERE (f.LOSING_HRA IN (${hra_num_form_self(req.user)} ) AND F.REQUESTED_ACTION in (2,4) ${query_search != '' ? ' AND': ''} ${query_search}) `
				//query += `AND (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} )) `
			}

			if(tab == "hra_forms"){//auth
				query += `WHERE (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.REQUESTED_ACTION in (2,4) ${query_search != '' ? ' AND': ''} ${query_search}) `
				query += `UNION ALL (${query} WHERE (f.GAINING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.REQUESTED_ACTION in (1,3,5)) ${query_search != '' ? ' AND': ''} ${query_search}) `
				//query += `AND ((f.LOSING_HRA IN (${hra_num_form_auth(req.user)} )) OR (f.GAINING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.REQUESTED_ACTION = 1)) `
			}

			if(tab == "sign_forms"){//self
				query = `${query} WHERE (f.GAINING_HRA IN (${hra_num_form_auth(req.user)}) AND F.STATUS = 5) UNION ALL 
						${query} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(req.user)} ) AND F.STATUS = 3) `
			}

			if(tab == "completed_forms"){//both self and auth
				query = `${query} WHERE (f.GAINING_HRA IN (${hra_num_form_all(req.user)}) AND F.STATUS >= 6) UNION ALL 
				${query} WHERE (f.LOSING_HRA IN (${hra_num_form_all(req.user)} ) AND F.STATUS >= 6) `
			}	
			
			console.log(query)
			
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

		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {},
			editable: edit_rights
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
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
	let result = await connection.execute(`SELECT SEQ_form_equipment_group_ID.nextval from dual`,{},dbSelectOptions)

	if(result.rows.length > 0){
		const eGroupId = result.rows[0].NEXTVAL
		let query = `INSERT INTO FORM_EQUIPMENT_GROUP (form_equipment_group_ID, FORM_EQUIPMENT_ID)
		(SELECT ${eGroupId}, ID FROM FORM_EQUIPMENT WHERE ID IN (`

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

//!INSERT EQUIPMENT
const formEquipmentAdd = async (connection, equipments, edipi) => {
	let idArray = []

	try{
		const changes = [...equipments]

		//console.log(changes,edipi)
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//console.log(row)
				const newData = changes[row];
				const keys = Object.keys(newData)
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_EQUIPMENT'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_FORM_EQUIPMENT.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					if(keys.length > 0){			
						for(let i=0; i<keys.length; i++){
							if(col_names.includes(keys[i])){
								const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
								let comma =  i && cols ? ', ': ''
								cols = cols + comma + col_name
								vals = vals + comma + ':' + keys[i]
								insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(newData[keys[i]]) :
								(typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) :  newData[keys[i]]

								// if(i == keys.length - 1 && typeof edipi != 'undefined'){
								// 	result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
								// 	console.log(result.rows)
								// 	if(result.rows.length > 0){
								// 		const registered_users_id = result.rows[0].ID
								// 		comma = cols ? ', ': ''
								// 		cols = cols + comma + 'updated_by'
								// 		vals = vals + comma + ':' + 'updated_by'
								// 		insert_obj['updated_by'] = registered_users_id
								// 	}
								// }
							}
						}
			
						let query = `INSERT INTO FORM_EQUIPMENT (${cols}) VALUES (${vals})`
						//console.log(query,insert_obj)
						result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})

						if(result.rowsAffected){
							result = await connection.execute('SELECT ID FROM FORM_EQUIPMENT WHERE ROWID = :0',[result.lastRowid],dbSelectOptions)
							idArray.push(result.rows[0].ID)
						}
					}
				}
			}
		}

		console.log(idArray)
		return (idArray)
	}catch(err){
		console.log(err)
		return []
	}
};

const ra = {
	"Issue":1,
	"Transfer":2,
	"Repair":3,
	"Excess":4,
	"FOI":5,
}

//!INSERT form_4900
exports.add = async function(req, res) {
	const {edipi} = req.headers.cert
	const connection =  await oracledb.getConnection(dbConfig);
	//const equipmentIds = req.body.form.equipment_group.map(x => x.id)

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
	form.requested_action = result.rows[0].ID

	if(result.rows.length > 0 && (form.hra.losing.hra_num || form.requested_action == ra["Issue"]) && (form.hra.gaining.hra_num || form.requested_action == ra["Excess"]) && req.body.form.equipment_group.length > 0){
		//console.log('in')
		form.losing_hra = form.hra.losing.hra_num
		form.gaining_hra = form.hra.gaining.hra_num
		//console.log(req.body.form.equipment_group)
		const equipmentIds = await formEquipmentAdd(connection,req.body.form.equipment_group,edipi)

		form.form_equipment_group_id = await create4900EquipmentGroup(equipmentIds,connection)
		delete form.hra
		delete form.equipment_group

		result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_4900'`,{},dbSelectOptions)

		if(result.rows.length > 0 && form.form_equipment_group_id != -1){
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
					result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
					if(result.rows.length > 0){
						const registered_users_id = result.rows[0].ID
						const comma =  cols ? ', ': ''
						cols = cols + comma + 'updated_by'
                        vals = vals + comma + ':' + 'updated_by'
						cells['updated_by'] = registered_users_id
					}
				}
			}

			let query = `INSERT INTO FORM_4900 (${cols}) VALUES (${vals})`
			//console.log(query)
			result = await connection.execute(query,cells,{autoCommit:true})

			if(result.rowsAffected > 0){
				//query = `${form.requested_action == 1 ? queryForSearchGainingHra(req.user) : queryForSearchLosingAndGainingHra(req.user)} AND F.ROWID = :0`
				query = `${queryForSearch(req.user)} WHERE F.ROWID = :0`
				result = await connection.execute(query,[result.lastRowid],dbSelectOptions)
				result.rows = propNamesToLowerCase(result.rows)

				console.log(result.rows)
				const form_groups = groupBy(result.rows, function(r) {
					return r.form_id;
				  });	

				const search_return = FormsToMaterialTableFormat(form_groups)

				connection.close()
				console.log(search_return[0])
				return res.status(200).json({
					status: 200,
					error: false,
					message: 'Successfully added new form!',
					data: search_return[0]
				});
			}
		}
	}

	connection.close()
	console.log('error')
	res.status(200).json({
		status: 400,
		error: true,
		message: 'Could not add new form!',
		data: {},
	});
};

//!UPDATE FROM_4900 DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	await connection.execute('SAVEPOINT form_update')
	const {edipi} = req.headers.cert

	const result_messages = {
		fs_record_deleted: false,
		equipment_result: {error: false},
		form_4900_update_result: false
	}

	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//columnErrors.rows[row] = {}
				const {newData} = changes[row];
				const {status} = newData

				const types = [{name:'gaining_hra',type:'number'}, {name:'gaining_hra',type:'number'},{name:"requested_action",type:"number"}]

				for(const column of types){
					if(newData.hasOwnProperty(column.name)){
						if(typeof newData[column.name] != column.type){
							return res.status(400).send('one or more properties type are incorrect!')
						}
					}
				}

				if(newData.hasOwnProperty('file_storage_id')){//file_storage_id is tied to status change.
					delete newData.file_storage_id
				}

				//console.log(transaction_result)

				//const cells = newData && oldData ? {new:objectDifference(oldData,newData,'tableData'),old:oldData} : newData
				//console.log(cells)

				//const keys = cells.new ?  Object.keys(cells.new) : []
				//cells.update = {}
				//let cols = ''
				const cell_id = newData.hasOwnProperty('form_id') ? newData.form_id : (newData.hasOwnProperty('id') ? newData.id : -1)

				if(cell_id != -1 && status){
					let from_record_result = await connection.execute(`SELECT * FROM FORM_4900 WHERE ID = :0`,[cell_id],dbSelectOptions)

					console.log("HERE 1")
					if(from_record_result.rows.length > 0){

						from_record_result.rows =  propNamesToLowerCase(from_record_result.rows)
						const status_downgrade = from_record_result.rows[0].status > status
						const {file_storage_id} = from_record_result.rows[0]
						const form_4900_changes = {0:{...newData, id: cell_id}}

						console.log("HERE 2 (formUpdate)",form_4900_changes)
						result_messages.form_4900_update_result = await formUpdate(connection, edipi, {...form_4900_changes}, false)

						if(status_downgrade && status < 6){
							console.log("HERE 3 (downgrade)")

							//let file_storage_record_lookup = await connection.execute('DELETE from FILE_STORAGE WHERE ID = :0',[file_storage_id],{autoCommit:false})
							let file_storage_del_result = await connection.execute('UPDATE FILE_STORAGE SET DELETED = 1 WHERE ID = :0',[file_storage_id],{autoCommit:false})
							result_messages.fs_record_deleted = file_storage_del_result.rowsAffected > 0
							//form_4900_changes = {0:{...form_4900_changes[0], file_storage_id: null}}//pdf signatures will be removed due to status downgrade.

						}else if(status == 9){//form is completed.
							console.log("HERE 4 (isComplete)")
							result_messages.equipment_result = await doTransaction(connection, req.user, {...form_4900_changes[0]})
						}

						//const editable = form_4900_result.rows.length > 0 ? (form_4900_result.rows[0].STATUS >= 8 ? true : false) : true
						
						
						

						//let form_4900_result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_4900'`,{},dbSelectOptions)
		
						// if(form_4900_result.rows.length > 0){
						// 	form_4900_result.rows = filter(form_4900_result.rows,function(c){ return !BANNED_COLS_ENG4900.includes(c.COLUMN_NAME)})
						// 	let col_names = form_4900_result.rows.map(x => x.COLUMN_NAME.toLowerCase())	
		
						// 	if(keys.length > 0){
						// 		for(let i=0; i<keys.length; i++){
						// 			if(col_names.includes(keys[i])){
						// 				let comma =  i && cols ? ', ': ''
						// 				cols = cols + comma + keys[i] + ' = :' + keys[i]
						// 				cells.update[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(cells.new[keys[i]]) :
						// 				(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) :  cells.new[keys[i]]
						// 			}
		
						// 			if(i == keys.length - 1 && typeof edipi != 'undefined'){
						// 				result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)

						// 				if(form_4900_result.rows.length > 0){
						// 					const registered_users_id = form_4900_result.rows[0].ID
						// 					const comma =  cols ? ', ': ''
						// 					cols = cols + comma + 'updated_by = :updated_by'
						// 					cells.update['updated_by'] = registered_users_id
						// 				}
						// 			}
						// 		}
					
						// 		let query = `UPDATE FORM_4900 SET ${cols} 
						// 		WHERE ID = ${cells.old.form_id}`
							
						// 		//console.log(query,cells.update)
						// 		result = await connection.execute(query,cells.update,{autoCommit:false})
								
						// 		if(form_4900_result.rowsAffected > 0){
						// 			query = `${queryForSearchLosingAndGainingHra(req.user)} AND F.ROWID = :0`
						// 			result = await connection.execute(query,[form_4900_result.lastRowid],dbSelectOptions)
						// 			form_4900_result.rows = propNamesToLowerCase(form_4900_result.rows)
					
						// 			console.log(form_4900_result.rows)
						// 			const form_groups = groupBy(form_4900_result.rows, function(r) {
						// 				return r.form_id;
						// 			});	
					
						// 			const search_return = FormsToMaterialTableFormat(form_groups)
					
						// 			console.log(form_groups,form_4900_result.rows)
						// 			connection.close()
						// 			return res.status(200).json({
						// 				status: 200,
						// 				error: true,
						// 				message: 'Successfully added new form!',
						// 				data: search_return[0]
						// 			});
						// 		}
						// 	}
		
						
						//let result_rollback = await connection.execute('ROLLBACK TO SAVEPOINT form_update')
						connection.rollback()
						connection.close()
						console.log(result_messages)
	
						return (
							res.status(200).json({
								status: 200,
								error: result_messages.equipment_result.error,
								//message: `Successfully updated data with id: ${cell_id}`, //+ req.params.id,
							})
						)
						// }
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

//!UPLOAD form_4900 (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.upload = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const changes = await ParseHeaders(req.headers.changes)
	const {edipi} = req.headers.cert

	if (!req.files) {
        return res.status(500).send({ msg: "file is not found" })
	}
	
    // accessing the file
	const myFile = req.files.file;

	if(isFileValid(myFile.name,'pdf') && req.params.id >= 0 && Object.keys(changes).length){
		const {id} = req.params
		let result = await connection.execute(`select * from form_4900 where id = ${id} and file_storage_id is not null`,{},dbSelectOptions)
		let new_filename = ""

		if(result.rows.length != 0){
			new_filename = result.rows[0].FILE_NAME
		}else{
			new_filename = Math.floor(Date.now() / 1000) + "-" + myFile.name
		}

		console.log(new_filename)

		const newData = JSON.parse(req.headers.changes)
		result = await connection.execute(`select * from form_4900 where id = ${id}`,{},dbSelectOptions)
		result.rows = propNamesToLowerCase(result.rows)
		const {status} = result.rows[0]

		const status_upgrade = newData.status > status

		if(status_upgrade){
			myFile.mv(pdfUploadPath + new_filename, async function(err) {
				if (err)
				  return res.status(500).send(err);
			
				 const file_id = await saveFileInfoToDatabase(connection, new_filename, 'pdf')
				 
				 const form_4900_changes = {0:{...newData, id: id, file_storage_id: file_id}}
	
				 console.log('Updating FORM_4900 Record...')
	
				 const formUpdateResult = await formUpdate(connection, edipi, form_4900_changes)
	
				 console.log(formUpdateResult ? "sucessfully updated form_4900" : "error updating form_4900")
	
				//update eng4900 file_storage_id and status
				res.send('File uploaded!');
			  });
		}else{
			res.status(400).send('Status Downgrade: File was not uploaded!');
		}

		
	}else{
		res.status(500).send('API error: File was not uploaded!');
	}

	//res.status(500).send({ msg: "something bad happened." });


	//console.log(myFile)
// 	const connection = await oracledb.getConnection(dbConfig);

// 	const binds = {
// 		file_name: myFile.name,
// 		content_type: myFile.mimetype,
// 		content_buffer: myFile.data,
// 		id: {
// 			type: oracledb.NUMBER,
// 			dir: oracledb.BIND_OUT
// 		}
// 		};
		
// 	let result = await connection.execute(createSql, binds,{autoCommit:true});

// 	const getSql =
//  `select file_name "file_name",
//     dbms_lob.getlength(blob_data) "file_length",
//     content_type "content_type",
//     blob_data "blob_data"
//   from file_storage
//   where id = :id`

// 	const binds2 = {
// 		id: result.outBinds.id[0]
// 	};
// 	const opts = {
// 		fetchInfo: {
// 		blob_data: {
// 			type: oracledb.BUFFER
// 		}
// 		}
// 	};
// 	result = await connection.execute(getSql, binds2, opts);
// 	console.log(result.rows[0])
// 	return res.send(result.rows[0])


	
// 	//  mv() method places the file inside public directory
//     // myFile.mv(path.join(__dirname,`../public/${myFile.name}`), async function (err) {
//     //     if (err) {
//     //         console.log(err)
//     //         return res.status(500).send({ msg: "Error occured" });
// 	// 	}


// 	// 	//const valid_signature = await ValidateEng4900Signature(`./public/${myFile.name}`,"losing")
// 	// 	//console.log("losing hra signed? " + (valid_signature ? "yes":"no"))

// 	// 	const connection =  await oracledb.getConnection(dbConfig);
// 	// 	let result = await connection.execute('select * from pdf_storage',{},{...dbSelectOptions,fetchInfo: {
// 	// 		blobdata: {
// 	// 		  type: oracledb.BUFFER
// 	// 		}
// 	// 	  }})

// 	// 	  await fs.promises.writeFile(path.join(__dirname,'../output/test_download.pdf'), result.rows[0].BLOBDATA, () => {
// 	// 		console.log('PDF created!')
// 	// 	})

// 	// 	//console.log(result.rows[0].BLOBDATA)
// 	// 	//await savePdfToDatabase(myFile)
// 	// 	//await savePdfToDatabase(path.join(__dirname,`../public/${myFile.name}`))
// 	// });
	
// 	// returing the response with file path and name
// 	//return res.send('file upload done.');
};

// const savePdfToDatabase = async (file) => {
// 	//const str = await fs.promises.readFileSync(filepath, 'utf8');

// 	const connection =  await oracledb.getConnection(dbConfig);
// 	let result = await connection.execute('insert into pdf_storage (blobdata, filename) values (:ncbv, :name)',{ncbv: { type: oracledb.DB, val: file }, name: file.name},{autoCommit:true})
// 	console.log(result)
// 	connection.close()
// }

// exports.upload = async function(req, res) {

// 	const form = formidable({ multiples: true, uploadDir: __dirname });

// 	form.parse(req, (err, fields, files) => {
// 	console.log('fields:', fields);
// 	console.log('files:', files);
// 	});

// 	// const form = new IncomingForm({
// 	// 	multiples: false,
// 	// 	maxFileSize : 10 * 1024 * 1024, //10mb
// 	// 	uploadDir: path.join(__dirname,'../public')
// 	// });

// 	// form.parse(req, (err, fields, files) => {
// 	// 	console.log(files)
// 	//   if (err) {
// 	// 	  res.status(400).json({error: `something went wrong`});
// 	// 	return;
// 	//   }
// 	//   res.json({ fields, files });
// 	// });

// 	// const connection = await oracledb.getConnection(dbConfig);

// 	// console.log(req.upload)

// 	// if(Object.keys(req.upload).length > 0){
// 	// 	const binds = {
// 	// 		file_name: fileName,
// 	// 		content_type: contentType,
// 	// 		content_buffer: contentBuffer,
// 	// 		id: {
// 	// 		  type: oracledb.NUMBER,
// 	// 		  dir: oracledb.BIND_OUT
// 	// 		}
// 	// 	  };
		  
// 	// 	  result = await connection.execute(createSql, binds);

// 	// 	  console.log(result)
// 	// }

// 	// res.message('upload was done')
// }

// async function create(fileName, contentType, contentBuffer) {
//   const binds = {
//     file_name: fileName,
//     content_type: contentType,
//     content_buffer: contentBuffer,
//     id: {
//       type: oracledb.NUMBER,
//       dir: oracledb.BIND_OUT
//     }
//   };
  
//   result = await connection.execute(createSql, binds);
  
//   return result.outBinds.id[0];
// }
//!SELECT form_4900 BY ID
// exports.testPdfBuild = async function(req, res) {

// 	const connection =  await oracledb.getConnection(dbConfig);

// 	try{

// 		let result = await connection.execute(newQuerySelById,[25],dbSelectOptions)

		
// 		if (result.rows.length > 0) {

// 			result.rows = propNamesToLowerCase(result.rows)
// 			result.rows[0].equipment_group = []
// 			let eg_result = await connection.execute(newQuerySelById2,[result.rows[0].form_equipment_group_id],dbSelectOptions)

// 			if(eg_result.rows.length > 0){
// 				eg_result.rows = propNamesToLowerCase(eg_result.rows)
// 				result.rows[0].equipment_group = eg_result.rows

// 				pdfFill.create4900(result.rows[0])

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
// 		return res.status(400).json({
// 			status: 400,
// 			error: true,
// 			message: 'No data found!',
// 			data: null
// 		});
// 	}
// };

// const queryForSearchLosingAndGainingHra = (id) => `SELECT 
// f.id as form_id,
// f.status,
// f.file_storage_id,
// ra.alias as REQUESTED_ACTION,
// f.LOSING_HRA as losing_hra_num,
// CASE WHEN f.LOSING_HRA IN (${hra_num_form_auth(id)}) THEN 1 ELSE 0 END originator,
// l_hra.losing_hra_first_name,
// l_hra.losing_hra_last_name,
// l_hra.losing_hra_first_name || ' ' || l_hra.losing_hra_last_name as losing_hra_full_name,
// l_hra.losing_hra_office_symbol,
// l_hra.losing_hra_work_phone,
// f.GAINING_HRA as gaining_hra_num,
// g_hra.gaining_hra_first_name,
// g_hra.gaining_hra_last_name,
// g_hra.gaining_hra_first_name || ' ' || g_hra.gaining_hra_last_name as gaining_hra_full_name,
// g_hra.gaining_hra_office_symbol,
// g_hra.gaining_hra_work_phone,
// f.DATE_CREATED,
// f.FOLDER_LINK,
// f.DOCUMENT_SOURCE,
// eg.form_equipment_group_ID as equipment_group_id,
// e.id as EQUIPMENT_ID, 
// 	e.BAR_TAG_NUM , 
// 	e.CATALOG_NUM , 
// 	e.BAR_TAG_HISTORY_ID , 
// 	e.MANUFACTURER , 
// 	e."MODEL", 
// 	e.CONDITION , 
// 	e.SERIAL_NUM , 
// 	e.ACQUISITION_DATE , 
// 	e.ACQUISITION_PRICE , 
// 	e.DOCUMENT_NUM, 
// 	e.ITEM_TYPE , 
// 	e.USER_EMPLOYEE_ID
// 	from form_4900 f, form_equipment_group eg, form_equipment e, requested_action ra,
// 	( ${eng4900_losingHra}) l_hra, (${eng4900_gainingHra}) g_hra
// where eg.form_equipment_group_id = f.form_equipment_group_id and e.id = eg.form_equipment_id and ra.id = f.requested_action
//  and f.losing_hra = l_hra.losing_hra_num and f.gaining_hra = g_hra.gaining_hra_num `

//  const queryForSearchGainingHra = (id) => `SELECT 
// f.id as form_id,
// f.status,
// f.file_storage_id,
// ra.alias as REQUESTED_ACTION,
// f.LOSING_HRA as losing_hra_num,
// CASE WHEN f.GAINING_HRA IN (${hra_num_form_auth(id)}) THEN 1 ELSE 0 END originator,
// null as losing_hra_first_name,
// null as losing_hra_last_name,
// null as losing_hra_full_name,
// null as losing_hra_office_symbol,
// null as losing_hra_work_phone,
// f.GAINING_HRA as gaining_hra_num,
// g_hra.gaining_hra_first_name,
// g_hra.gaining_hra_last_name,
// g_hra.gaining_hra_first_name || ' ' || g_hra.gaining_hra_last_name as gaining_hra_full_name,
// g_hra.gaining_hra_office_symbol,
// g_hra.gaining_hra_work_phone,
// f.DATE_CREATED,
// f.FOLDER_LINK,
// f.DOCUMENT_SOURCE,
// eg.form_equipment_group_ID as equipment_group_id,
// e.id as EQUIPMENT_ID, 
// 	e.BAR_TAG_NUM , 
// 	e.CATALOG_NUM , 
// 	e.BAR_TAG_HISTORY_ID , 
// 	e.MANUFACTURER , 
// 	e."MODEL", 
// 	e.CONDITION , 
// 	e.SERIAL_NUM , 
// 	e.ACQUISITION_DATE , 
// 	e.ACQUISITION_PRICE , 
// 	e.DOCUMENT_NUM, 
// 	e.ITEM_TYPE , 
// 	e.USER_EMPLOYEE_ID
// 	from form_4900 f, form_equipment_group eg, form_equipment e, requested_action ra,
// 	(${eng4900_gainingHra}) g_hra 
// where eg.form_equipment_group_id = f.form_equipment_group_id and e.id = eg.form_equipment_id and ra.id = f.requested_action
//  and f.losing_hra is null and f.gaining_hra = g_hra.gaining_hra_num `
