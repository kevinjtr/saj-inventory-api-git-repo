'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase,objectDifference,containsAll} = require('../tools/tools');
const {eng4900_losingHra,eng4900_gainingHra,hra_employee_no_count,equipment_employee,registered_users,hra_num_form_all, hra_employee_form_all, EQUIPMENT} = require('../config/queries');
const {dbSelectOptions,eng4900DatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
//const {create4900} = require('../pdf-fill.js')
const {rightPermision} = require('./validation/tools/user-database');
const { Console } = require('winston/lib/winston/transports');
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');
const BANNED_COLS_ANNUAL_INV = ['ID','HRA_NUM','ANNUAL_INV_EQUIPMENT_GROUP_ID','FISCAL_YEAR','FOLDER_LINK','HAS_FLIPL','UPDATED_BY']
const ACCEPTED_USER_INPUT_COLS = ["FISCAL_YEAR","HRA_NUM"]

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
						 
//!SELECT * FROM ANNUAL_INV
exports.index = async function(req, res) {
    const edit_rights = await rightPermision(req.headers.cert.edipi)
	const connection =  await oracledb.getConnection(dbConfig);

	try{

		let result = await connection.execute(hra_employee_form_all(req.user),{},dbSelectOptions)

		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			const hras = [...result.rows]

			result = await connection.execute(`SELECT a.*, eg.annual_equipment_count, h.* FROM ANNUAL_INV a
			LEFT JOIN (${hra_employee_no_count}) h ON h.hra_num = a.hra_num
			LEFT JOIN (SELECT count(*) as annual_equipment_count, ANNUAL_INV_EQUIPMENT_GROUP_ID FROM ANNUAL_INV_EQUIPMENT_GROUP GROUP BY ANNUAL_INV_EQUIPMENT_GROUP_ID) eg
			on eg.ANNUAL_INV_EQUIPMENT_GROUP_ID = a.ANNUAL_INV_EQUIPMENT_GROUP_ID WHERE h.hra_num IN (${hra_num_form_all(req.user)})`,{},dbSelectOptions)
			connection.close()
	
			if(result.rows.length > 0){
				result.rows = propNamesToLowerCase(result.rows)         
	
				return res.status(200).json({
					status: 200,
					error: false,
					message: 'Successfully get single data!',
					data: result.rows,
					editable: edit_rights,
					hras: hras
				});
			}
	
			return res.status(200).json({
				status: 200,
				error: false,
				message: 'No data found!',
				data: [],
				editable: edit_rights,
				hras: hras,
			});

		}

		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
			editable: edit_rights,
			hras: [],
		});

	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: [],
            editable: edit_rights,
			hras:[]
		});
	}
};

//!SELECT ANNUAL_INV BY ID
exports.getById = async function(req, res) {
	const edit_rights = await rightPermision(req.headers.cert.edipi)
	const connection =  await oracledb.getConnection(dbConfig);
	
	try{
		//ALL Equipments are fetched. Even deleted equipments.
        let result =  await connection.execute(`SELECT EQ.hra_num,
		AI.fiscal_year,
		EQ.bar_tag_num,
		EQ.item_type,
		EQ.serial_num,
		EQ.employee_full_name
		FROM ANNUAL_INV AI
		LEFT JOIN (SELECT * FROM ANNUAL_INV_EQUIPMENT_GROUP eg
		left join (
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
				e.id as employee_id,
				e.first_name || ' ' || e.last_name as employee_full_name,
				e.first_name employee_first_name,
				e.last_name employee_last_name,
				e.TITLE as employee_title,
				e.OFFICE_SYMBOL as employee_office_symbol,
				e.WORK_PHONE as employee_work_phone
				FROM ANNUAL_INV_EQUIPMENT eq
				LEFT JOIN employee e
				on eq.user_employee_id = e.id
				LEFT JOIN (${registered_users}) ur
				on ur.id = eq.updated_by
		) e
		on e.id = eg.ANNUAL_INV_EQUIPMENT_ID) EQ
		ON AI.ANNUAL_INV_EQUIPMENT_GROUP_ID = EQ.ANNUAL_INV_EQUIPMENT_GROUP_ID
		WHERE ai.id = :0 and EQ.hra_num in (${hra_num_form_all(req.user)})
		order by EQ.employee_full_name asc`,[req.params.id],dbSelectOptions)		

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

const createEquipmentGroup = async (hra_num, connection, annual_inv_equipment_group_id=null) => {
	let return_gorup_id = -1

	if(annual_inv_equipment_group_id){
		let result = await connection.execute(`UPDATE ANNUAL_INV_EQUIPMENT_GROUP SET DELETED = 1 WHERE ANNUAL_INV_EQUIPMENT_GROUP_ID = :0`,[annual_inv_equipment_group_id],{autoCommit:true})
		result = await connection.execute(`UPDATE ANNUAL_INV_EQUIPMENT SET DELETED = 1 WHERE ID IN (SELECT ANNUAL_INV_EQUIPMENT_ID FROM ANNUAL_INV_EQUIPMENT_GROUP WHERE ANNUAL_INV_EQUIPMENT_GROUP_ID = :0)`,[annual_inv_equipment_group_id],{autoCommit:true})
	}

	let result = await connection.execute(`SELECT SEQ_ANNUAL_INV_EQG_ID.nextval from dual`,{},dbSelectOptions)

	if(result.rows.length > 0){
		const eGroupId = result.rows[0].NEXTVAL
		result = await connection.execute(`SELECT ID FROM ANNUAL_INV_EQUIPMENT WHERE HRA_NUM = :0`,[hra_num],dbSelectOptions)		
		const ids = result.rows.length > 0 ? result.rows.map(x=>x.ID) : [] 

		result = await connection.execute(`INSERT INTO ANNUAL_INV_EQUIPMENT (
			BAR_TAG_NUM , 
			CATALOG_NUM, 
			BAR_TAG_HISTORY_ID, 
			MANUFACTURER, 
			MODEL, 
			CONDITION, 
			SERIAL_NUM, 
			ACQUISITION_DATE, 
			ACQUISITION_PRICE, 
			DOCUMENT_NUM, 
			INDIVIDUAL_ROR_PROP,
			HRA_NUM,
			USER_EMPLOYEE_ID,
			ITEM_TYPE
			) (
				SELECT
				BAR_TAG_NUM , 
				CATALOG_NUM, 
				BAR_TAG_HISTORY_ID, 
				MANUFACTURER, 
				MODEL, 
				CONDITION, 
				SERIAL_NUM, 
				ACQUISITION_DATE, 
				ACQUISITION_PRICE, 
				DOCUMENT_NUM, 
				INDIVIDUAL_ROR_PROP,
				HRA_NUM,
				USER_EMPLOYEE_ID,
				ITEM_TYPE
				FROM ${EQUIPMENT} WHERE HRA_NUM = :0)`,[hra_num],{autoCommit:true})

		

		if(result.rowsAffected > 0){
			const ignored_equipment_ids = ids.length > 0 ? `and id not in (${printElements(ids)})` : ""

			result = await connection.execute(`INSERT INTO ANNUAL_INV_EQUIPMENT_GROUP (ANNUAL_INV_EQUIPMENT_GROUP_ID, ANNUAL_INV_EQUIPMENT_ID)
			(SELECT :0, ID FROM ANNUAL_INV_EQUIPMENT WHERE HRA_NUM = :1 and DELETED != 1 ${ignored_equipment_ids})`,[eGroupId,hra_num],{autoCommit:AUTO_COMMIT.ADD})
			return_gorup_id = result.rowsAffected > 0 ? eGroupId : -1
			
			if(result.rowsAffected > 0){
				result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT_GROUP WHERE DELETED = 1`,{},{autoCommit:true})
				result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT WHERE DELETED = 1`,{},{autoCommit:true})
			}
		}		
	}

	return(return_gorup_id)
}

const isHraAndFiscalYearNotDuplicated = async (connection, binds) => {
	let result = await connection.execute(`SELECT * FROM ANNUAL_INV WHERE HRA_NUM = :hra_num and FISCAL_YEAR = :fiscal_year `,binds,dbSelectOptions)
	console.log('isHraAndFiscalYearNotDuplicated',result.rows.length == 0)
	return result.rows.length == 0
}

//!INSERT ANNUAL_INV
exports.add = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let columnErrors = {rows:{},errorFound:false}
	let eGroupId = -1

	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {newData} = changes[row];
				const keys = Object.keys(newData)
				let cols = ''
				let vals = ''
				let insert_obj = {}
				const isAllDataAvailable = containsAll(ACCEPTED_USER_INPUT_COLS.map(x=>x.toLowerCase()),keys)
				const isDateWithinRange = isAllDataAvailable ? (newData.fiscal_year >= 1990 && newData.fiscal_year <= (new Date()).getFullYear() + 1) : false
				const isHraAndFiscalYearValid = await isHraAndFiscalYearNotDuplicated(connection, {fiscal_year: newData.fiscal_year, hra_num: newData.hra_num})

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'ANNUAL_INV'`,{},dbSelectOptions)

				if(result.rows.length > 0 && isAllDataAvailable && isDateWithinRange && isHraAndFiscalYearValid){
					result.rows = filter(result.rows,function(x){ return ACCEPTED_USER_INPUT_COLS.includes(x.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					if(keys.length > 0){                      
                        for(let i=0; i<keys.length; i++){
                            if(col_names.includes(keys[i])){
								const isHraNum = keys[i] == 'hra_num'

								if(isHraNum){
									const EQ_GROUP_ID_COL_NAME = "annual_inv_equipment_group_id"
									eGroupId = await createEquipmentGroup(newData[keys[i]],connection)

									if(eGroupId == -1){
										connection.close()
										return res.status(200).json({
											status: 200,
											error: true,
											message: 'Error adding new data!',
											columnErrors : columnErrors
										});
									}

									let comma =  i && cols ? ', ': ''
									cols = cols + comma + EQ_GROUP_ID_COL_NAME
									vals = vals + comma + ':' + EQ_GROUP_ID_COL_NAME
									insert_obj[EQ_GROUP_ID_COL_NAME] = eGroupId
								}
								
                                let comma =  cols ? ', ': ''
                                cols = cols + comma + keys[i]
								vals = vals + comma + ':' + keys[i]
								insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? new Date(newData[keys[i]]) :
								(typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) :  newData[keys[i]]

                                if(i == keys.length - 1){
									comma = cols ? ', ': ''
									cols = cols + comma + 'updated_by'
									vals = vals + comma + ':' + 'updated_by'
									insert_obj['updated_by'] = req.user
                                }
                            }
                        }

						if(insert_obj.hra_num && insert_obj.fiscal_year){
							let query = `MERGE INTO ANNUAL_INV
							USING (SELECT 1 FROM DUAL) m
							ON (hra_num = :hra_num AND fiscal_year = :fiscal_year)
							WHEN NOT MATCHED THEN
							INSERT (${cols})
							VALUES (${vals})`

							result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})

							if(result.rowsAffected != 0){
								result = await connection.execute(`SELECT a.*, eg.annual_equipment_count, h.* FROM ANNUAL_INV a
									LEFT JOIN (${hra_employee_no_count}) h ON h.hra_num = a.hra_num
									LEFT JOIN (SELECT count(*) as annual_equipment_count, ANNUAL_INV_EQUIPMENT_GROUP_ID FROM ANNUAL_INV_EQUIPMENT_GROUP GROUP BY ANNUAL_INV_EQUIPMENT_GROUP_ID) eg
									on eg.ANNUAL_INV_EQUIPMENT_GROUP_ID = a.ANNUAL_INV_EQUIPMENT_GROUP_ID WHERE h.hra_num IN (${hra_num_form_all(req.user)}) `,{},dbSelectOptions)
		
								if(result.rows.length > 0){
									result.rows = propNamesToLowerCase(result.rows)
									connection.close()
		
									return (
										res.status(200).json({
											status: 200,
											error: false,
											message: 'Successfully added new data!',
											changes: result.rows,//req.body,
											columnErrors: columnErrors
										})
									)
								}
							}
						}
					}
				}

				if(!isAllDataAvailable || !isDateWithinRange){
					columnErrors = {...columnErrors,errorFound:true}
				}
			}
		}

		connection.close()
		res.status(400).json({
			status: 400,
			error: true,
			message: 'Error adding new data!',
			columnErrors: columnErrors
		});
	}catch(err){
		connection.close()
		columnErrors = {...columnErrors,errorFound:true}
		console.log(err);
		res.status(400).json({
			status: 400,
			error:true,
			message: 'Error adding new data!',
			columnErrors: columnErrors
		});
	}
};

//!UPDATE ANNUAL_INV DATA
exports.update = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	let columnErrors = {rows:{},errorFound:false}

	try{
		const {changes,undo} = req.body.params
		
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				columnErrors.rows[row] = {}
				const {newData,oldData} = changes[row];
				const cells = newData && oldData ? {new:objectDifference(oldData,newData,'tableData'),old:oldData} : newData
				const keys = cells.new ?  Object.keys(cells.new) : []
				cells.update = {}
				let cols = ''
				const cell_id = cells.old ? cells.old.id : cells.id

				let result = await connection.execute(`SELECT * FROM ANNUAL_INV WHERE ID = :0`,[cell_id],dbSelectOptions)
				const isRecordNotLocked = result.rows.length > 0 ? (result.rows[0].LOCKED == 2 ? true : false) : true
				const annual_inv_equipment_group_id = result.rows[0].ANNUAL_INV_EQUIPMENT_GROUP_ID

				result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'ANNUAL_INV'`,{},dbSelectOptions)

				if(result.rows.length > 0 && isRecordNotLocked){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_ANNUAL_INV.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())
					const isUpdate = newData.update ? (newData.update ? true : false) : false

					if(isUpdate){
						const eGroupId = await createEquipmentGroup(cells.hra_num, connection, annual_inv_equipment_group_id)

						let query = `UPDATE ANNUAL_INV SET ANNUAL_INV_EQUIPMENT_GROUP_ID = :0
									WHERE ID = ${cell_id}`

						if(eGroupId != -1){
							result = await connection.execute(query,[eGroupId],{autoCommit:AUTO_COMMIT.UPDATE})
						}else {
							columnErrors = {...columnErrors,errorFound:true}
						}
					}
					
					if(keys.length > 0 && !isUpdate){
                        for(let i=0; i<keys.length; i++){
                            if(col_names.includes(keys[i])){
                                let comma =  i && cols ? ', ': ''
                                cols = cols + comma + keys[i] + ' = :' + keys[i]
								cells.update[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(cells.new[keys[i]]) :
								(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) :  cells.new[keys[i]]
                            }

                            if(i == keys.length - 1){
								const comma =  cols ? ', ': ''
								cols = cols + comma + 'updated_by = :updated_by'
								cells.update['updated_by'] = req.user
                            }
                        }
            
                        let query = `UPDATE ANNUAL_INV SET ${cols}
                                    WHERE ID = ${cells.old.id}`
                    
                        result = await connection.execute(query,cells.update,{autoCommit:AUTO_COMMIT.UPDATE})
					}

					if(result.rowsAffected > 0){
						result = await connection.execute(`SELECT a.*, eg.annual_equipment_count, h.* FROM ANNUAL_INV a
							LEFT JOIN (${hra_employee_no_count}) h ON h.hra_num = a.hra_num
							LEFT JOIN (SELECT count(*) as annual_equipment_count, ANNUAL_INV_EQUIPMENT_GROUP_ID FROM ANNUAL_INV_EQUIPMENT_GROUP GROUP BY ANNUAL_INV_EQUIPMENT_GROUP_ID) eg
							on eg.ANNUAL_INV_EQUIPMENT_GROUP_ID = a.ANNUAL_INV_EQUIPMENT_GROUP_ID WHERE h.hra_num IN (${hra_num_form_all(req.user)}) `,{},dbSelectOptions)

						if(result.rows.length > 0){
							result.rows = propNamesToLowerCase(result.rows)

							connection.close()

							return (
								res.status(200).json({
									status: 200,
									error: false,
									message: 'Successfully update data', //+ req.params.id,
									changes: result.rows,//req.body,
									columnErrors: columnErrors
								})
							)

						}
					}
				}
			}
		}
		connection.close()
		
		return (
			res.status(400).json({
				status: 400,
				error: true,
				message: 'Could not update data', //+ req.params.id,
				columnErrors: columnErrors
			})
		)
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

//!DELETE ANNUAL_INV (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		const {changes} = req.body.params
		let ids = ''
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				const {id} = changes[row].oldData
				cols = `, UPDATED_BY = ${req.user}`

				let result = await connection.execute(`UPDATE ANNUAL_INV SET DELETED = 1 ${cols} WHERE ID = :0`,[id],{autoCommit:AUTO_COMMIT.DELETE})
				ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.id
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
			message: `Cannot delete data` //+ req.params.id
		});
	}
};
