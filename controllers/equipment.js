'use strict';
//const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const {propNamesToLowerCase,objectDifference} = require('../tools/tools');
const {equipment_employee,hra_employee} = require('../config/queries');
const {dbSelectOptions,eqDatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
// const {and_, or_,andOR_single, andOR_multiple } = require('../config/functions')

const BANNED_COLS_EQUIPMENT = ['ID','OFFICE_SYMBOL_ALIAS','SYS_']

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

//!SELECT * FROM EQUIPMENT
exports.index = async function(req, res) {
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
			data: result.rows
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
	}
};

//!SELECT EQUIPMENT BY ID
exports.getById = async function(req, res) {
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
				data: result.rows
			});
		} else {
			connection.close()
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: result.rows
			});
		}
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

//!SELECT EQUIPMENT BY FIELDS DATA
exports.search = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let query_search = '';

	try{
		const {fields,options} = req.body;
		//console.log(options)
		const searchCriteria = filter(Object.keys(fields),function(k){ return fields[k] != ''});
		//console.log(searchCriteria)
		for(const parameter of searchCriteria){
			//parameter = parameter.replace(/[0-9]/g,'')
			console.log(parameter)
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
					console.log(andOR_single[options.includes[parameter]],query_search)
					query_search = query_search.concat(`${andOR_single[options.includes[parameter]](query_search)} ${db_col_name} ${includesOperator} ${val} `)

					//console.log(val,query_search)
					//query_search = blankOptions ? query_search.concat(` ${or_(query_search)} ${db_col_name} ${blankOptions} `) : query_search
				}
			}
		}

		// for(const parameter in options.includes){
		// 	const isStringColumn = eqDatabaseColNames[parameter].type == "string"
		// 	const db_col_name = isStringColumn ? `LOWER(${eqDatabaseColNames[parameter].name})` : eqDatabaseColNames[parameter].name


		// 	const operator = eqOperator[options.includes[parameter]]
		// 	console.log('eqOperator: '+operator)
		// }

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
		//query_search = blankOptions ? query_search.concat(` ${or_} ${db_col_name} ${blankOptions} `) : query_search


		let query = `SELECT * from (${hra_employee}) hra_emp 
						RIGHT JOIN (${equipment_employee}) eq_emp 
						on eq_emp.hra_num = hra_emp.hra_num 
						${query_search != '' ? 'WHERE': ''} ${query_search}`

		let queryPrint = `SELECT * from (hra_employee) hra_emp 
		RIGHT JOIN (equipment_employee) eq_emp 
		on eq_emp.hra_num = hra_emp.hra_num 
		${query_search != '' ? 'WHERE': ''} ${query_search}`

		//console.log(query)
		let resultEquipment =  await connection.execute(`${query}`,{},dbSelectOptions)
		
		if (resultEquipment.rows.length > 0) {
			resultEquipment.rows = propNamesToLowerCase(resultEquipment.rows)

			connection.close()
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: resultEquipment.rows
			});
		} else {
			connection.close()
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: []
			});
		}
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

//!INSERT EQUIPMENT
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		const {changes} = req.body.params
		
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//console.log(row)
				const {newData} = changes[row];
				const keys = Object.keys(newData)
				let cols = ''
				let vals = ''

				for(let i=0; i<keys.length; i++){
					if(keys[i] != 'id'){
						const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
						const comma = i ? ', ': ''
						cols = cols + comma + col_name
						vals = vals + comma + ' :' + keys[i]
					}else{
						delete newData.id
					}
				}

				const query = `INSERT INTO EQUIPMENT (${cols}) VALUES (${vals})`
				//console.log(query)

				let result = await connection.execute(query,newData,{autoCommit:true})
				console.log(result)
			}
		}
		connection.close()
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully added new data!',
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

//!UPDATE EQUIPMENT DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let columnErrors = {rows:{},errorFound:false}

	try{
		const {changes} = req.body.params

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
				
				// let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EQUIPMENT'`,{},dbSelectOptions)
				// if(result.rows.length > 0){
				// 	result.rows = filter(result.rows,function(c){ return !BANNED_COLS_EQUIPMENT.includes(c)})
				// 	let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())



				// }
				//console.log(cells.new)
				if(keys.length > 0){
					//console.log('here0')
					const uniqueCols = ['bar_tag_num']
					for(const col of uniqueCols){
						//console.log('here1')

						if(keys.includes(col)){
							//console.log('here2')
							let result = await connection.execute(`SELECT ${col} FROM EQUIPMENT WHERE ${col} = :0`,[cells.new.bar_tag_num],dbSelectOptions)
							//console.log(result)
							if(result.rows.length > 0){
								//console.log('equipment exists')
								columnErrors.errorFound = true;
								columnErrors.rows[row][col]='data exists in database.'
							}
						}
					}

					//console.log(columnErrors[row],Object.keys(columnErrors[row]).length == 0)

					if(Object.keys(columnErrors.rows[row]).length == 0){
						for(let i=0; i<keys.length; i++){
							if(keys[i] != 'id'){
								const col_name = (keys[i] == "employee_id" ? 'user_'+keys[i] : keys[i])
								const comma = i ? ', ': ''
								cols = cols + comma + col_name + ' = :' + keys[i]
							}else{
								delete cells.new.id
							}
						}
			
						let query = `UPDATE EQUIPMENT SET ${cols}
									WHERE ID = ${cells.old.id}`
					
						//console.log(query)
		
						result = await connection.execute(query,cells.new,{autoCommit:false})
						console.log(result)
					}
				}
			}
		}

		if(columnErrors.errorFound){
			connection.close()//don't save changes if error is found.
		}
		
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

//!DELETE EQUIPMENT (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		const {changes} = req.body.params
		let ids = ''
		//console.log(changes)
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {id} = changes[row].oldData
				let result = await connection.execute(`DELETE from equipment WHERE id = :0`,[id],{autoCommit:false})
				ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.id
				console.log(result)
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
