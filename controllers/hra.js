'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const {propNamesToLowerCase, objectDifference} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const {employee_officeSymbol, hra_employee} = require('../config/queries')

const noReplaceCols = ['hra_num']

const BANNED_COLS_HRA = ['HRA_NUM','OFFICE_SYMBOL_ALIAS','SYS_']

//!SELECT * FROM HRA
exports.index = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(`${hra_employee} ORDER BY FIRST_NAME,LAST_NAME`,{},dbSelectOptions)
		
		console.log(hra_employee)

		//console.log(`${hra_employee} ORDER BY FIRST_NAME,LAST_NAME`)
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)
		}

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get single data!',
			data: result.rows
		});

	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: []//result.rows
		});
		//logger.error(err)
	}
};

//!SELECT HRA BY HRA_NUM
exports.getById = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`${hra_employee}
												WHERE hra_num = :0
												ORDER BY FIRST_NAME,LAST_NAME`,[req.params.hra_hum],dbSelectOptions)
		

		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: result.rows
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: result.rows
			});
		}
	}catch(err){
		console.log(err)
		//logger.error(err)
	}
};

//!SELECT HRA BY FIELDS DATA
exports.search = async function(req, res) {
	let query_search = '';
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		const searchCriteria = filter(Object.keys(req.body),function(k){ return req.body[k] != ''});
		for(const parameter of searchCriteria){
			const db_col_name = `LOWER(TO_CHAR(${(!noReplaceCols.includes(parameter) ? parameter.replace('hra_',''): parameter)}))`

			if(db_col_name != undefined){
				const db_col_value = req.body[parameter]
				//const x = "'' ) or id = 7168 or (hra_full_name = '"
				const blacklistedSearchPatterns = ["'' ) or ","'' ) and "]

				if(db_col_value.includes(';')){
					const search_values = filter(db_col_value.split(';'),function(sv){ return sv != '' && !blacklistedSearchPatterns.includes(sv) })

					for(let i=0; i<search_values.length;i++){
						const or_ = query_search != '' ? 'OR' : ''
						//const operator = isStringColumn ? 'LIKE' : '='
						const val = `LOWER('%${search_values[i].replace(/'/,"''")}%')`

						query_search = query_search.concat(` ${or_} ${db_col_name} LIKE ${val} `)
						
						if(i == search_values.length - 1){
							query_search = `(${query_search})`
						}
					}
					

				}else{
					const and_ = query_search != '' ? 'AND' : ''
					//const operator = isStringColumn ? 'LIKE' : '='
					const val = `LOWER('%${db_col_value.replace(/'/,"''")}%')`
					
					query_search = query_search.concat(` ${and_} ${db_col_name} LIKE ${val} `)
					//const and_ = query_search != '' ? 'AND' : ''
					//query_search = query_search.concat(` ${and_} LOWER(${db_col_name}) LIKE LOWER('%${db_col_value.replace(/'/,"''")}%') `)
				}
			}
		}


		

		let query = `SELECT * from HRA WHERE ${query_search} ORDER BY FIRST_NAME,LAST_NAME`

		//console.log(query)
		let resultHra =  await connection.execute(query,{},dbSelectOptions)
		
		if (resultHra.rows.length > 0) {
			resultHra.rows = propNamesToLowerCase(resultHra.rows)
			resultHra.rows = resultHra.rows.map(function(r){
				r.acquisition_price = r.acquisition_price ? r.acquisition_price.toFixed(2) : null
				return r;
			})

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: resultHra.rows
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!',
				data: resultHra.rows
			});
		}
	}catch(err){
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

//!INSERT HRA
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		const {changes} = req.body.params		
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//console.log(row)
				let {newData} = changes[row];
				const keys = Object.keys(newData);
				let cols = ''
				let vals = ''

				console.log(keys)
				for(let i=0; i<keys.length; i++){
						const comma = i && cols ? ', ': ''
						cols = cols + comma + (!noReplaceCols.includes(keys[i]) ? keys[i].replace('hra_',''): keys[i])
						vals = vals + comma + ' :'+ keys[i]
				}

				let query = `INSERT INTO HRA (${cols}) VALUES (${vals})`
				console.log(query)

				let result = await connection.execute(query,newData,{autoCommit:true})
				console.log(result)
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

//!UPDATE HRA DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				//console.log(row)
				const {newData,oldData} = changes[row];
				let cells = {new:objectDifference(oldData,newData,'tableData'),old:oldData}
				const keys = Object.keys(cells.new)
				cells.update = {}
				let cols = ''

				console.log(cells.new)
				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'HRA'`,{},dbSelectOptions)

				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_HRA.includes(c)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

                    for(let i=0; i<keys.length; i++){
						const key = keys[i].replace('hra_','')

						if(col_names.includes(key)){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + key + ' = :' + key
							cells.update[key] = cells.new[key]
						}
                    }
        
                    let query = `UPDATE HRA SET ${cols}
                                WHERE hra_num = ${cells.old.hra_num}`

                    console.log(query)
                    result = await connection.execute(query,cells.update,{autoCommit:false})
					console.log(result)
					
					connection.close()
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully update data.', //+ req.params.id,
						data: [],//req.body
						rowsAffected: result.rowsAffected ? result.rowsAffected : 0
					});

				}
			}
		}

		connection.close()
		return res.status(200).json({
			status: 200,
			error: true,
			message: 'Cannot delete data.', //+ req.params.id,
			data: []//req.body
		});
	}catch(err){
		console.log(err);

		connection.close()
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'Cannot delete data.' //+ req.params.id
		});
	}
};

//!DELETE HRA (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	let ids = ''
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				let result = await connection.execute(`DELETE from HRA WHERE hra_num = :0`,[changes[row].oldData.hra_employee_id],{autoCommit:false})
				ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.hra_employee_id
				console.log(result)
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