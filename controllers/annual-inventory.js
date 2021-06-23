'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase} = require('../tools/tools');
const {eng4900_losingHra,eng4900_gainingHra,hra_employee_no_count} = require('../config/queries');
const {dbSelectOptions,eng4900DatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
const {handleData} = require('../pdf-fill.js')
const {rightPermision} = require('./validation/tools/user-database')
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');

const printElements = (elements) => {
	let str = ""
	for(let i=0; i<elements.length; i++){
		str = str + (i ? ',' : '') + elements[i]
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

let queryForSearch = `SELECT 
f.id as form_id,
ra.alias as REQUESTED_ACTION,
f.LOSING_HRA as losing_hra_num,
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
						 
//!SELECT * FROM ANNUAL_INVENTORY
exports.index = async function(req, res) {

    //console.log('here at index ANNUAL_INVENTORY')
    const edit_rights = await rightPermision(req.headers.cert.edipi)
	const connection =  await oracledb.getConnection(dbConfig);

	try{
        //console.log('extract ANNUAL_INVENTORY')

       


        let result =  await connection.execute(`SELECT * FROM ANNUAL_INVENTORY a
        LEFT JOIN (${hra_employee_no_count}) h ON h.hra_num = a.hra_num`,{},dbSelectOptions)
        
        connection.close()

        if(result.rows.length > 0){
            result.rows = propNamesToLowerCase(result.rows)

            // const {equipment_gorup_id} = result.rows[0]
            // const query_eq = `SELECT * FROM EQUIPMENT_GROUP EG LEFT JOIN EQUIPMENT E ON E.ID = EG.EQUIPMENT_ID WHERE EG.ID = :0`

            // let result2 =  await connection.execute(query_eq,[],dbSelectOptions)

           

            return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
                data: result.rows,
                editable: edit_rights
            });
        }

        return res.status(200).json({
            status: 200,
            error: false,
            message: 'No data found!',
            data: [],
            editable: edit_rights
        });

	}catch(err){
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

//!SELECT ANNUAL_INVENTORY BY ID
exports.getById = async function(req, res) {
	const edit_rights = await rightPermision(req.headers.cert.edipi)
    const connection =  await oracledb.getConnection(dbConfig);
    
	try{
        let result =  await connection.execute(`SELECT * FROM ANNUAL_INVENTORY WHERE id = :0`,[req.params.id],dbSelectOptions)
        connection.close()

		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: result.rows,
				editable: edit_rights
			});
        }
        
        return res.status(200).json({
            status: 200,
            error: false,
            message: 'No data found!',
            data: [],
            editable: edit_rights
        });
		
	}catch(err){
		console.log(err)
		return res.status(400).json({
            status: 400,
            error: true,
            message: 'No data found!',
            data: [],
            editable: edit_rights
        });
	}
};

//!SELECT ANNUAL_INVENTORY BY FIELDS DATA
exports.search = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let query_search = '';
	const forms = {}

	try{
		const {fields,options} = req.body;
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


		let query = `${queryForSearch} 
						${query_search != '' ? 'AND': ''} ${query_search}`

		let queryPrint = `${queryForSearch} 
		${query_search != '' ? 'AND ': ''} ${query_search}`

		//console.log(query)
		let result =  await connection.execute(`${query}`,{},dbSelectOptions)

		// if (resultEquipment.rows.length > 0) {
		// 	resultEquipment.rows = propNamesToLowerCase(resultEquipment.rows)

		// 	connection.close()
		// 	res.status(200).json({
		// 		status: 200,
		// 		error: false,
		// 		message: 'Successfully get single data!',
		// 		data: resultEquipment.rows
		// 	});
		// } else {
		if(result.rows.length > 0){
			const form_ids = result.rows.map(x => x.FORM_ID)
			const ids_print = printElements(form_ids)
			query = `${queryForSearch} AND F.ID IN (${ids_print})`
			result =  await connection.execute(`${query}`,{},dbSelectOptions)
			//console.log(result2.rows)

			result.rows = propNamesToLowerCase(result.rows)
			const uniqFormIds = uniq(result.rows.map(x => x.form_id))
			
            for(const form_id of uniqFormIds){
                const formEquipment = filter(result.rows,function(o){ return o.form_id == form_id})
				forms[form_id] = formEquipment
			}
		}

		connection.close()

		if(Object.keys(forms).length > 0){
			return res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: forms
			});
		}

		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: forms
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: []
		});
		//logger.error(err)
	}
};


const createEquipmentGroup = async (hra_num,connection) => {
	let result = await connection.execute(`SELECT SEQ_EQUIPMENT_GROUP_ID.nextval from dual`,{},dbSelectOptions)
	if(result.rows.length > 0){
		result = await connection.execute(`INSERT INTO EQUIPMENT_GROUP (EQUIPMENT_GROUP_ID, EQUIPMENT_ID)
		(SELECT :0, ID FROM EQUIPMENT WHERE HRA_NUM = :1);`,[result.rows[0].NEXTVAL,hra_num],dbSelectOptions)
		console.log(result)
	}
}

//!INSERT ANNUAL_INVENTORY
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let columnErrors = {rows:{},errorFound:false}
	const {edipi} = req.headers.cert

	try{
		const {changes} = req.body.params
		console.log(changes)
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//console.log(row)
				const {newData} = changes[row];
				const keys = Object.keys(newData)
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'ANNUAL_INVENTORY'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_EQUIPMENT.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					if(keys.length > 0){                      
                        for(let i=0; i<keys.length; i++){
                            if(col_names.includes(keys[i])){
								isHraNum = keys[i] == 'hra_num'

								//await createEquipmentGroup(keys[i],connection)
                                //const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
                                let comma =  i && cols ? ', ': ''
                                cols = cols + comma + keys[i]
                                vals = vals + comma + ':' + keys[i]
                                insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(newData[keys[i]]) : newData[keys[i]]

                                if(i == keys.length - 1 && typeof edipi != 'undefined'){
                                    result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
                                    if(result.rows.length > 0){
                                        const user_rights_id = result.rows[0].ID
                                        comma = cols ? ', ': ''
                                        cols = cols + comma + 'updated_by'
                                        vals = vals + comma + ':' + 'updated_by'
                                        insert_obj['updated_by'] = user_rights_id
                                    }
                                }
                            }
                        }
            
                        let query = `INSERT INTO ANNUAL_INVENTORY (${cols}) VALUES (${vals})`
                    
                        //console.log(query,newData)
                        result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})
                        //console.log(result)

                        connection.close()
                        return res.status(200).json({
                            status: 200,
                            error: false,
                            message: 'Successfully added new data!',
                            columnErrors : columnErrors
                        });
					}
				}
			}
		}
		connection.close()
		res.status(200).json({
			status: 200,
			error: true,
			message: 'Error adding new data!',
			columnErrors: columnErrors
		});
	}catch(err){
		connection.close()
		console.log(err);
		res.status(400).json({
			status: 400,
			error:true,
			message: 'Error adding new data!'
		});
	}
};

//!UPDATE ANNUAL_INVENTORY DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let columnErrors = {rows:{},errorFound:false}
	const {edipi} = req.headers.cert

	try{
		const {changes,undo} = req.body.params

		//console.log(changes)
		for(const row in changes){
			//console.log(typeof row)
			if(changes.hasOwnProperty(row)) {
				columnErrors.rows[row] = {}
				const {newData,oldData} = changes[row];
				const cells = {new:objectDifference(oldData,newData,'tableData'),old:oldData}
				const keys = Object.keys(cells.new)
				cells.update = {}
				let cols = ''

				//console.log(cells.new)
				
				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'ANNUAL_INVENTORY'`,{},dbSelectOptions)
				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_EQUIPMENT.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					//console.log(col_names)

					if(keys.length > 0){
						//console.log('here0')
						//console.log(columnErrors[row],Object.keys(columnErrors[row]).length == 0)
                        for(let i=0; i<keys.length; i++){
                            if(col_names.includes(keys[i])){
                                const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
                                let comma =  i && cols ? ', ': ''
                                cols = cols + comma + col_name + ' = :' + keys[i]
                                cells.update[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(cells.new[keys[i]]) : cells.new[keys[i]]
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
            
                        let query = `UPDATE ANNUAL_INVENTORY SET ${cols}
                                    WHERE ID = ${cells.old.id}`
                    
                        //console.log(query)
                        result = await connection.execute(query,cells.update,{autoCommit:AUTO_COMMIT.UPDATE})
                        //console.log(result)
					}
				}
				//console.log(cells.new)
			}
		}
		//if(columnErrors.errorFound){
			//connection.close()//don't save changes if error is found.
		//}else if(undo){
		connection.close()
		//}
		
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully update data with id: ', //+ req.params.id,
			data: [],//req.body,
			columnErrors: columnErrors
		});
	}catch(err){
		connection.close()
		console.log(err);
		res.status(400).json({
			status: 400,
			error: true,
			columnErrors:columnErrors,
			message: 'Cannot delete data with id: ' //+ req.params.id
		});
	}
};

//!DELETE ANNUAL_INVENTORY (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert

	try{
		const {changes} = req.body.params
		let ids = ''
		//console.log(changes)
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {id} = changes[row].oldData
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

				let result = await connection.execute(`UPDATE ANNUAL_INVENTORY SET DELETED = 1 ${cols} WHERE ID = :0`,[id],{autoCommit:AUTO_COMMIT.DELETE})
				ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.id
				//console.log(result)
			}
		}

		connection.close()
		res.status(200).json({
			status: 200,
			error: false,
			message: `Successfully delete data with ids: ${ids}` //+ req.params.id
		});
	}catch(err){
		connection.close()
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: `Cannot delete data with ids: ${ids}` //+ req.params.id
		});
	}
};
