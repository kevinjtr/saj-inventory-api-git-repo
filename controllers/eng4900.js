'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase} = require('../tools/tools');
const {eng4900_losingHra,eng4900_gainingHra} = require('../config/queries');
const {dbSelectOptions,eng4900DatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
const {handleData} = require('../pdf-fill.js')
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

			console.log(g_keys)
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

//!SELECT form_4900 BY FIELDS DATA
exports.search2 = async function(req, res) {
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

		console.log(query)
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

//!SELECT form_4900 BY FIELDS DATA
exports.search = async function(req, res) {
    const connection =  await oracledb.getConnection(dbConfig);
	const forms = {}

	console.log(req.body.fields)
	const {id} = req.body.fields
	console.log(id?id:false)

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
			 (${eng4900_losingHra}) l_hra, (${eng4900_gainingHra}) g_hra
		where eg.equipment_group_id = f.equipment_group_id and e.id = eg.equipment_id and ra.id = f.requested_action
		 and f.losing_hra = l_hra.losing_hra_num and f.gaining_hra = g_hra.gaining_hra_num ${id ? `and f.id = ${id}`:''}`


        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			const uniqFormIds = uniq(result.rows.map(x => x.form_id))
			
            for(const form_id of uniqFormIds){
                const formEquipment = filter(result.rows,function(o){ return o.form_id == form_id})
				forms[form_id] = formEquipment
            }
        }
            
        if(Object.keys(forms).length > 0){
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: forms
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: forms
			});
		}
	}catch(err){
        console.log('in error')
		res.status(400).json({
            status: 400,
            error: true,
            message: 'No data found!',
            data: []
        });
		//logger.error(err)
	}
};

//!INSERT form_4900
exports.add = async function(req, res) {
	// const connection =  await oracledb.getConnection(dbConfig);
	// // const item_type = req.body.item_type ? req.body.item_type : 'no data' || ternary operator
	// const { item_type } = req.body;

	// try{
	// 	result =  await connection.execute(`INSERT INTO form_4900 (item_type) values (:0)`,[item_type],{autoCommit:true})
	// 	console.log(result)
	// 	res.status(200).json({
	// 		status: 200,
	// 		error: false,
	// 		message: 'Successfully add new data!',
	// 		data: req.body
	// 	});
	// }catch(err){
	// 	console.log(err);
	// 	res.status(400).json({
	// 		status: 400,
	// 		message: 'Error add new data!'
	// 	});
	// }
};

//!UPDATE form_4900 DATA
exports.update = async function(req, res) {
	// const connection =  await oracledb.getConnection(dbConfig);
	// const { item_type } = req.body;

	// if (!item_type) {
	// 	res.status(300).json({
	// 		status: 300,
	// 		error: true,
	// 		message: 'item_type needed for update!'
	// 	});
	// } else {
	// 	try{
	// 		console.log(req.body)
	// 		let result =  await connection.execute(`UPDATE form_4900 SET item_type = :0 where id = :1`,[item_type, req.params.id],{autoCommit:true})
	// 		console.log(result)
	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully update data with id: ' + req.params.id,
	// 			data: req.body
	// 		});
	// 	}catch(err){
	// 		console.log(err);
	// 	}
	// }
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
