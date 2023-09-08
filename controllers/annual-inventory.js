'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase,objectDifference,containsAll,printElements} = require('../tools/tools');
const {eng4900_losingHra,eng4900_gainingHra,hra_employee_no_count,equipment_employee,registered_users,hra_num_form_all, hra_employee_form_all, EQUIPMENT} = require('../config/queries');
const {dbSelectOptions,eng4900DatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
//const {create4900} = require('../pdf-fill.js')
const {rightPermision} = require('./validation/tools/user-database');
const { Console } = require('winston/lib/winston/transports');
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const BANNED_COLS_ANNUAL_INV = ['ID','HRA_NUM','ANNUAL_INV_EQUIPMENT_GROUP_ID','FISCAL_YEAR','FOLDER_LINK','HAS_FLIPL','UPDATED_BY']
const ACCEPTED_USER_INPUT_COLS = ["FISCAL_YEAR","HRA_NUM"]
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
    const {edit_rights} = req
	let connection

	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		let result = await connection.execute(hra_employee_form_all(req.user),{},dbSelectOptions)

		if(result.rows.length > 0){
			result.rows = propNamesToLowerCase(result.rows)
			const hras = [...result.rows]

			result = await connection.execute(`SELECT a.*, case when eg.annual_equipment_count is null then 0 else eg.annual_equipment_count end as annual_equipment_count, h.* FROM ANNUAL_INV a
			LEFT JOIN (${hra_employee_no_count}) h ON h.hra_num = a.hra_num
			LEFT JOIN (SELECT COUNT(*) AS annual_equipment_count, T1.ANNUAL_INV_EQUIPMENT_GROUP_ID, T1.ID FROM ANNUAL_INV_EQUIPMENT_GROUP T1
			LEFT JOIN ANNUAL_INV_EQUIPMENT T2
			ON T1.ANNUAL_INV_EQUIPMENT_GROUP_ID = T2.ANNUAL_INV_EQUIPMENT_GROUP_ID
			WHERE T1.DELETED != 1 AND T2.DELETED != 1
			GROUP BY T1.ANNUAL_INV_EQUIPMENT_GROUP_ID, T1.ID) eg
			on eg.ID = a.ANNUAL_INV_EQUIPMENT_GROUP WHERE h.hra_num IN (${hra_num_form_all(req.user)})`,{},dbSelectOptions)
	
			
			

			console.log(result.rows)

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

//!SELECT ANNUAL_INV BY ID
exports.getById = async function(req, res) {
	const {edit_rights} = req
	let connection
	try {
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
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
				eq.ID AS EQUIPMENT_ID,
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
				EQ.ANNUAL_INV_EQUIPMENT_GROUP_ID,
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
				WHERE EQ.DELETED != 1
		) e
		on e.ANNUAL_INV_EQUIPMENT_GROUP_ID = eg.ANNUAL_INV_EQUIPMENT_GROUP_ID) EQ
		ON AI.ANNUAL_INV_EQUIPMENT_GROUP = EQ.ID
		WHERE ai.id = :0 and EQ.hra_num in (${hra_num_form_all(req.user)}) AND EQ.DELETED != 1
		order by EQ.employee_full_name asc`,[req.params.id],dbSelectOptions)		

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

const createEquipmentGroup = async (hra_num, connection, annual_inv_equipment_group=null) => {
	let return_group_id = -1
	//let ids = []
	if(annual_inv_equipment_group){
		// ids = `SELECT AIE.ID FROM ANNUAL_INV_EQUIPMENT_GROUP AIEG
		// left join ANNUAL_INV_EQUIPMENT AIE
		// on AIEG.ANNUAL_INV_EQUIPMENT_ID = AIE.ID
		// WHERE HRA_NUM = :0 AND DELETED != 1`
		//let result = await connection.execute(`select * from ANNUAL_INV_EQUIPMENT_GROUP where ID = :0`,[annual_inv_equipment_group],{autoCommit:true})
		const binds = {
			annual_inv_equipment_group: annual_inv_equipment_group,
			annual_inv_equipment_group_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
		}

		let result = await connection.execute(`UPDATE ANNUAL_INV_EQUIPMENT_GROUP SET DELETED = 1
		WHERE id = :annual_inv_equipment_group returning annual_inv_equipment_group_id into :annual_inv_equipment_group_id`,binds,{autoCommit:true})
		
		if(result.outBinds.annual_inv_equipment_group_id.length > 0){
			result = await connection.execute(`UPDATE ANNUAL_INV_EQUIPMENT SET DELETED = 1
			WHERE ID IN (SELECT t2.id FROM ANNUAL_INV_EQUIPMENT_GROUP T1
								LEFT JOIN ANNUAL_INV_EQUIPMENT T2
								ON T1.ANNUAL_INV_EQUIPMENT_GROUP_ID = T2.ANNUAL_INV_EQUIPMENT_GROUP_ID
								WHERE t1.annual_inv_equipment_group_id = :0)`,[result.outBinds.annual_inv_equipment_group_id[0]],{autoCommit:true})
		}
	}

	let result = await connection.execute(`SELECT SEQ_ANNUAL_INV_EQG_ID.nextval from dual`,{},dbSelectOptions)

	if(result.rows.length > 0){
		const eGroupId = result.rows[0].NEXTVAL
		//return_group_id = eGroupId
		// result = await connection.execute(`SELECT AIE.ID FROM ANNUAL_INV_EQUIPMENT AIE WHERE HRA_NUM = :0 AND DELETED != 1`,[hra_num],dbSelectOptions)		
		// ids = result.rows.length > 0 ? result.rows.map(x=>x.ID) : [] 

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
			ITEM_TYPE,
			ANNUAL_INV_EQUIPMENT_GROUP_ID,
			UPDATED_BY
			)
				(SELECT
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
				ITEM_TYPE,
				${eGroupId} AS ANNUAL_INV_EQUIPMENT_GROUP_ID,
				UPDATED_BY
				FROM ${EQUIPMENT} WHERE HRA_NUM = :hra_num) `,{ hra_num: hra_num },{autoCommit:true})

		const binds = {
			eGroupId: eGroupId,
			id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
		};

		// if(result.rowsAffected > 0){

		// 	result = await connection.execute(`INSERT INTO ANNUAL_INV_EQUIPMENT_GROUP (ANNUAL_INV_EQUIPMENT_GROUP_ID, ANNUAL_INV_EQUIPMENT_ID)
		// 	values(:0, :1)`,[eGroupId,hra_num],{autoCommit:AUTO_COMMIT.ADD})

		// }else{
		result = await connection.execute(`INSERT INTO ANNUAL_INV_EQUIPMENT_GROUP (ANNUAL_INV_EQUIPMENT_GROUP_ID)
			values (:eGroupId) returning id into :id`,binds,{autoCommit:AUTO_COMMIT.ADD})

		return_group_id = result.outBinds.id[0]
		//}	
	}

	return(return_group_id)
}

const isHraAndFiscalYearNotDuplicated = async (connection, binds) => {
	let result = await connection.execute(`SELECT * FROM ANNUAL_INV WHERE HRA_NUM = :hra_num and FISCAL_YEAR = :fiscal_year `,binds,dbSelectOptions)
	return result.rows.length == 0
}

// MERGE INTO ANNUAL_INV_EQUIPMENT tt
//     USING ( SELECT * FROM ANNUAL_INV_EQUIPMENT_GROUP WHERE DELETED != 1) st
//     ON (tt.ID = st.ANNUAL_INV_EQUIPMENT_ID)
//   WHEN MATCHED THEN
//     UPDATE SET tt.ANNUAL_INV_EQUIPMENT_GROUP_ID = st.ANNUAL_INV_EQUIPMENT_GROUP_ID;
    
// DELETE FROM ANNUAL_INV_EQUIPMENT_GROUP
// WHERE rowid not in
// (SELECT MIN(rowid)
// FROM ANNUAL_INV_EQUIPMENT_GROUP
// GROUP BY ANNUAL_INV_EQUIPMENT_GROUP_ID);

//!INSERT ANNUAL_INV
exports.add = async function(req, res) {
	let columnErrors = {rows:{},errorFound:false}
	let eGroupId = -1
	let connection
	try {
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
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

				if(!(result.rows.length > 0 && isAllDataAvailable && isDateWithinRange && isHraAndFiscalYearValid)){
					break
				}
				
				result.rows = filter(result.rows,function(x){ return ACCEPTED_USER_INPUT_COLS.includes(x.COLUMN_NAME)})
				let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

				if(keys.length > 0){                      
					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const isHraNum = keys[i] == 'hra_num'

							if(isHraNum){
								const EQ_GROUP_COL_NAME = "annual_inv_equipment_group"
								eGroupId = await createEquipmentGroup(newData[keys[i]],connection)

								if(eGroupId == -1){
									return res.status(200).json({
										status: 200,
										error: true,
										message: 'Error adding new data!',
										columnErrors : columnErrors
									});
								}

								let comma =  i && cols ? ', ': ''
								cols = cols + comma + EQ_GROUP_COL_NAME
								vals = vals + comma + ':' + EQ_GROUP_COL_NAME
								insert_obj[EQ_GROUP_COL_NAME] = eGroupId
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
							result = await connection.execute(`SELECT a.*, case when eg.annual_equipment_count is null then 0 else eg.annual_equipment_count end as annual_equipment_count, h.* FROM ANNUAL_INV a
							LEFT JOIN (${hra_employee_no_count}) h ON h.hra_num = a.hra_num
							LEFT JOIN (SELECT COUNT(*) AS annual_equipment_count, T1.ANNUAL_INV_EQUIPMENT_GROUP_ID, T1.ID FROM ANNUAL_INV_EQUIPMENT_GROUP T1
							LEFT JOIN ANNUAL_INV_EQUIPMENT T2
							ON T1.ANNUAL_INV_EQUIPMENT_GROUP_ID = T2.ANNUAL_INV_EQUIPMENT_GROUP_ID
							WHERE T1.DELETED != 1 AND T2.DELETED != 1
							GROUP BY T1.ANNUAL_INV_EQUIPMENT_GROUP_ID, T1.ID) eg
							on eg.ID = a.ANNUAL_INV_EQUIPMENT_GROUP WHERE h.hra_num IN (${hra_num_form_all(req.user)}) `,{},dbSelectOptions)
	
							
							if(result.rows.length > 0){
								result.rows = propNamesToLowerCase(result.rows)
	
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
				

				if(!isAllDataAvailable || !isDateWithinRange){
					columnErrors = {...columnErrors,errorFound:true}
				}
			}
		}

		res.status(400).json({
			status: 400,
			error: true,
			message: 'Error adding new data!',
			columnErrors: columnErrors
		});
	}catch(err){
		columnErrors = {...columnErrors,errorFound:true}
		console.log(err);
		res.status(400).json({
			status: 400,
			error:true,
			message: 'Error adding new data!',
			columnErrors: columnErrors
		});
	} finally {
		if (connection) {
			try {
				let result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT_GROUP WHERE DELETED = 1`,{},{autoCommit:true})
				result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT WHERE DELETED = 1`,{},{autoCommit:true})
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};

//!UPDATE ANNUAL_INV DATA
exports.update = async function(req, res) {
	let columnErrors = {rows:{},errorFound:false}
	let connection
	try {
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
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
				const annual_inv_equipment_group = result.rows[0].ANNUAL_INV_EQUIPMENT_GROUP

				result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'ANNUAL_INV'`,{},dbSelectOptions)

				if(result.rows.length > 0 && isRecordNotLocked){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS_ANNUAL_INV.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())
					const isUpdate = newData.update ? (newData.update ? true : false) : false

					if(isUpdate){
						const eGroupId = await createEquipmentGroup(cells.hra_num, connection, annual_inv_equipment_group)

						let query = `UPDATE ANNUAL_INV SET ANNUAL_INV_EQUIPMENT_GROUP = :0
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
						result = await connection.execute(`SELECT a.*, case when eg.annual_equipment_count is null then 0 else eg.annual_equipment_count end as annual_equipment_count, h.* FROM ANNUAL_INV a
						LEFT JOIN (${hra_employee_no_count}) h ON h.hra_num = a.hra_num
						LEFT JOIN (SELECT COUNT(*) AS annual_equipment_count, T1.ANNUAL_INV_EQUIPMENT_GROUP_ID, T1.ID FROM ANNUAL_INV_EQUIPMENT_GROUP T1
						LEFT JOIN ANNUAL_INV_EQUIPMENT T2
						ON T1.ANNUAL_INV_EQUIPMENT_GROUP_ID = T2.ANNUAL_INV_EQUIPMENT_GROUP_ID
						WHERE T1.DELETED != 1 AND T2.DELETED != 1
						GROUP BY T1.ANNUAL_INV_EQUIPMENT_GROUP_ID, T1.ID) eg
						on eg.ID = a.ANNUAL_INV_EQUIPMENT_GROUP WHERE h.hra_num IN (${hra_num_form_all(req.user)}) `,{},dbSelectOptions)

						if(result.rows.length > 0){
							result.rows = propNamesToLowerCase(result.rows)

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
		
		return (
			res.status(400).json({
				status: 400,
				error: true,
				message: 'Could not update data', //+ req.params.id,
				columnErrors: columnErrors
			})
		)
	}catch(err){
		console.log(err);
		res.status(400).json({
			status: 400,
			error: true,
			columnErrors:columnErrors,
			message: 'Cannot delete data with id: ' //+ req.params.id
		});
	} finally {
		if (connection) {
			try {
				let result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT_GROUP WHERE DELETED = 1`,{},{autoCommit:true})
				result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT WHERE DELETED = 1`,{},{autoCommit:true})
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};

//!DELETE ANNUAL_INV (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function(req, res) {
	let connection
	try {
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
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
			message: `Cannot delete data` //+ req.params.id
		});
	} finally {
		if (connection) {
			try {
				let result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT_GROUP WHERE DELETED = 1`,{},{autoCommit:true})
				result = await connection.execute(`DELETE FROM ANNUAL_INV_EQUIPMENT WHERE DELETED = 1`,{},{autoCommit:true})
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};
