'use strict';

const fs = require('fs')
const path = require('path')
const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const { orderBy, uniqBy, groupBy, uniq, filter } = require('lodash')
const { propNamesToLowerCase, objectDifference, containsAll, isValidDate, UserLevelNameHasEditPermision, FormsToMaterialTableFormat, printElements } = require('../tools/tools');
const { eng4900SearchQuery, eng4900_losingHra, eng4900_gainingHra, hra_num_form_self, hra_num_form_all, hra_employee_form_self, hra_employee_form_all, hra_employee, EQUIPMENT, FORM_4900 } = require('../config/queries');
const { dbSelectOptions, eng4900DatabaseColNames } = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull } = require('../config/constants')
const { rightPermision } = require('./validation/tools/user-database')
const { create4900, ValidateEng4900Signature } = require('../pdf-fill.js');
const { Console } = require('console');
const BANNED_COLS_FORM_EQUIPMENT = ['ID', 'OFFICE_SYMBOL_ALIAS', 'SYS_', 'UPDATED_BY']
const BANNED_COLS_ENG4900 = ['ID', 'UPDATED_BY', 'SYS_NC00008$', 'DELETED']
const AUTO_COMMIT = { ADD: true, UPDATE: true, DELETE: false }
const pdfUploadPath = path.join(__dirname, '../file_storage/pdf/')
const ALL_ENG4900_TABS = ["my_forms", "hra_forms", "sign_forms", "completed_and_ipg_forms"]
const { form4900EmailAlert } = require("../tools/email-notifier")
require('dotenv').config();

// create or replace trigger FORM_4900_ON_INSERT_TRIGGER  
//    before insert on "INV_TRACKING"."FORM_4900" 
//    for each row 
// begin  
//    if inserting then 
//       if :NEW."ID" is null then 
//          select SEQ_FORM_4900.nextval into :NEW."ID" from dual; 
//          select SYSDATE into :NEW."DATE_CREATED" from dual; 
//          select SYSDATE into :NEW."UPDATED_DATE" from dual; 
//       end if; 
//    end if; 
// end;

const DEFAULT_SEARCH_PARAMS = {
	'fields': {},
	'options': {
		includes: {},
		blanks: {}
	},
	'tab': "my_forms",
	'init': true
}

const and_ = (q) => q != '' ? 'AND' : ''
const or_ = (q) => q != '' ? 'OR' : ''

const andOR_single = {
	'includes': and_,
	'excludes': and_,
	'equals': and_,
	'notEquals': and_
}

const andOR_multiple = {
	'includes': or_,
	'excludes': and_,
	'equals': or_,
	'notEquals': and_
}

// const eng4900SearchQuery = (id) => `SELECT 
// f.id as form_id,
// CASE WHEN f.status > 100 THEN f.status - 100 ELSE f.status END status,
// f.file_storage_id,
// f.individual_ror_prop,
// fs.status as status_alias,
// ra.alias as REQUESTED_ACTION,
// f.LOSING_HRA as losing_hra_num,
// f.updated_date,
// CASE WHEN f.LOSING_HRA IN (${hra_num_form_all(id)}) THEN 1 ELSE 0 END originator,
// CASE WHEN f.LOSING_HRA IN (${hra_num_form_all(id)}) THEN 1 ELSE 0 END is_losing_hra,
// CASE WHEN f.GAINING_HRA IN (${hra_num_form_all(id)}) THEN 1 ELSE 0 END is_gaining_hra,
// l_hra.losing_hra_first_name,
// l_hra.losing_hra_last_name,
// l_hra.losing_hra_first_name || ' ' || l_hra.losing_hra_last_name as losing_hra_full_name,
// l_hra.losing_hra_office_symbol,
// l_hra.losing_hra_work_phone,
// l_hra.losing_hra_is_registered,
// f.GAINING_HRA as gaining_hra_num,
// g_hra.gaining_hra_first_name,
// g_hra.gaining_hra_last_name,
// g_hra.gaining_hra_first_name || ' ' || g_hra.gaining_hra_last_name as gaining_hra_full_name,
// g_hra.gaining_hra_office_symbol,
// g_hra.gaining_hra_work_phone,
// g_hra.gaining_hra_is_registered,
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
// 	from ${FORM_4900} f
// 	LEFT JOIN form_equipment_group eg on eg.form_equipment_group_id = f.form_equipment_group_id
// 	LEFT JOIN form_equipment e on e.id = eg.form_equipment_id
// 	LEFT JOIN requested_action ra on ra.id = f.requested_action
// 	LEFT JOIN (${eng4900_gainingHra}) g_hra on f.gaining_hra = g_hra.gaining_hra_num 
// 	LEFT JOIN ( ${eng4900_losingHra}) l_hra on f.losing_hra = l_hra.losing_hra_num
// 	LEFT JOIN FORM_4900_STATUS fs on f.status = fs.id `

const equipment_condition = `SELECT E.*,C.ALIAS AS CONDITION_ALIAS FROM FORM_EQUIPMENT E LEFT JOIN CONDITION C ON E.CONDITION = C.ID`

const newQuerySelById = `SELECT
		f.id as form_id,
		f.form_signature_group_id as form_signature_group_id,
		f.status as status,
		f.file_storage_id,
		f.individual_ror_prop,
		f.updated_date,
		ra.alias as REQUESTED_ACTION,
		f.LOSING_HRA as losing_hra_num,
		l_hra.losing_hra_first_name,
		l_hra.losing_hra_last_name,
		l_hra.losing_hra_office_symbol,
		l_hra.losing_hra_os_alias,
		l_hra.losing_hra_work_phone,
		l_hra.losing_hra_is_registered,
		f.GAINING_HRA as gaining_hra_num,
		g_hra.gaining_hra_first_name,
		g_hra.gaining_hra_last_name,
		g_hra.gaining_hra_office_symbol,
		g_hra.gaining_hra_os_alias,
		g_hra.gaining_hra_work_phone,
		g_hra.gaining_hra_is_registered,
		f.DATE_CREATED,
		f.FOLDER_LINK,
		f.form_equipment_group_id,
		f.expiration_date,
		TO_CHAR(f.expiration_date,'mm/dd/yyyy') as expiration_date_print,
		f.temporary_loan
		from ${FORM_4900} f, requested_action ra,
		(${eng4900_losingHra}) l_hra, (${eng4900_gainingHra}) g_hra
		where ra.id = f.requested_action and (f.losing_hra = l_hra.losing_hra_num or (f.losing_hra is NULL and l_hra.losing_hra_num  is null)) and f.gaining_hra = g_hra.gaining_hra_num AND f.id = :0 
		UNION (
			SELECT
			f.id as form_id,
			f.form_signature_group_id as form_signature_group_id,
			f.status as status,
			f.file_storage_id,
			f.individual_ror_prop,
			f.updated_date,
			ra.alias as REQUESTED_ACTION,
			f.LOSING_HRA as losing_hra_num,
			null as losing_hra_first_name,
			null as losing_hra_last_name,
			null as losing_hra_office_symbol,
			null as losing_hra_os_alias,
			null as losing_hra_work_phone,
			null as losing_hra_is_registered,
			f.GAINING_HRA as gaining_hra_num,
			g_hra.gaining_hra_first_name,
			g_hra.gaining_hra_last_name,
			g_hra.gaining_hra_office_symbol,
			g_hra.gaining_hra_os_alias,
			g_hra.gaining_hra_work_phone,
			g_hra.gaining_hra_is_registered,
			f.DATE_CREATED,
			f.FOLDER_LINK,
			f.form_equipment_group_id,
			f.expiration_date,
			TO_CHAR(f.expiration_date,'mm/dd/yyyy') as expiration_date_print,
			f.temporary_loan
			from ${FORM_4900} f, requested_action ra,
			(${eng4900_gainingHra}) g_hra
			where ra.id = f.requested_action and f.losing_hra is NULL and f.gaining_hra = g_hra.gaining_hra_num AND f.id = :0
		) `

const newQuerySelById2 = `SELECT eg.*,eq.*, TO_CHAR(eq.acquisition_date,'mm/dd/yyyy') as acquisition_date_print FROM FORM_EQUIPMENT_GROUP eg,
							(${equipment_condition}) eq WHERE eq.id = eg.form_equipment_id and eg.form_equipment_group_id = :0`

const ra = {
	"Issue": 1,
	"Transfer": 2,
	"Repair": 3,
	"Excess": 4,
	"FOI": 5,
}

const requiresSignatureRemoval = (new_status, old_status, requested_action) => {

	return new_status < 7 && old_status > new_status
	// switch(requested_action) {
	// 	case "Excess":
	// 	case "Issue":
	// 	case "Transfer":
	// 	case "Repair":
	// 	case "FOI":
	// 		return old_status > new_status;//completed gaining signature. before: 6
	// 	default:
	// 	  return false;
	//   }
}

const FORM_4900_STATUS = {
	all: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
		4: "Losing HRA signature required",
		5: "Completed losing HRA signature",
		6: "Gaining HRA signature required",
		7: "Completed gaining HRA signature",
		8: "Logistics signature required",
		9: "Completed Logistics signature",
		10: "PBO signature required",
		11: "Completed PBO signature",
		12: "Form Reject",
	},
	gaining: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
		6: "Gaining HRA signature required",
		7: "Completed gaining HRA signature",
		8: "Sent to Logistics",
		9: "Sent to PBO",
		10: "Completed",
	},
	losing: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
		4: "Losing HRA signature required",
		5: "Completed losing HRA signature",
		8: "Sent to Logistics",
		9: "Sent to PBO",
		10: "Completed",
	},
	Issue: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
	},
	Transfer: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
		4: "Losing HRA signature required",
		5: "Completed losing HRA signature",
		6: "Gaining HRA signature required",
		7: "Completed gaining HRA signature",
	},
	Repair: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
		4: "Losing HRA signature required",
		5: "Completed losing HRA signature",
		6: "Gaining HRA signature required",
		7: "Completed gaining HRA signature",
	},
	Excess: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
		4: "Losing HRA signature required",
		5: "Completed losing HRA signature",
		6: "Gaining HRA signature required",
		7: "Completed gaining HRA signature",
		8: "Logistics signature required",
		9: "Completed Logistics signature",
	},
	FOI: {
		1: "Form Edit",
		2: "Individual/Vendor signature required",
		3: "Completed Individual/Vendor signature",
		4: "Losing HRA signature required",
		5: "Completed losing HRA signature",
		6: "Gaining HRA signature required",
		7: "Completed gaining HRA signature",
	},
	steps: [
		{ id: 1, label: "Form Edit" },
		{ id: 2, label: "Individual/Vendor signature required" },
		{ id: 3, label: "Completed Individual/Vendor signature" },
		{ id: 4, label: "Losing HRA signature required" },
		{ id: 5, label: "Completed losing HRA signature" },
		{ id: 6, label: "Gaining HRA signature required" },
		{ id: 7, label: "Completed gaining HRA signature" },
		{ id: 8, label: "Logistics signature required" },
		{ id: 9, label: "Completed Logistics signature" },
		{ id: 10, label: "PBO signature required" },
		{ id: 11, label: "Completed PBO signature" },
		{ id: 12, label: "Form Rejected" },
	],
	rejected: {
		12: "Form Rejected",
	}
}

const REJECT_FORM = { id: 12, label: "Form Reject" }

const getAllStatusSteps = (status, requested_action) => {
	if (status != 12) {
		return FORM_4900_STATUS[requested_action]
	}

	return FORM_4900_STATUS["rejected"]
}

const isNewStatusValid = (requested_action, new_status, status, is_losing_hra, is_gaining_hra) => {

	if (status == 1) {
		if ([2, 3, 4].includes(new_status)) {//contains a losing hra.
			return true
		}
	} else if (status == 2) {//form sign.
		if ([3, 12].includes(new_status)) {
			return true
		}
	} else if (status == 3) {

		if ([1, 4].includes(new_status)) {
			return true
		}
	} else if (status == 4) {//form sign.

		if ([5, 12].includes(new_status)) {
			return true
		}
	} else if (status == 5) {

		if ([1, 6].includes(new_status)) {
			return true
		}
	} else if (status == 6) {//form sign.

		if (new_status == 7 && is_gaining_hra && requested_action == 2) {
			return true
		} else if (new_status == 7 && is_losing_hra && requested_action != 2) {
			return true
		} else if (new_status == 12) {
			return true
		}

	} else if (status == 7) {
		if ([1, 8].includes(new_status)) {
			return true
		}
	} else if (status == 8) {//form sign.

		if (new_status == 9 && is_gaining_hra && requested_action == 2) {
			return true
		} else if (new_status == 9 && is_losing_hra && requested_action != 2) {
			return true
		} else if (new_status == 12) {
			return true
		}

	} else if (status == 9) {
		if ([1, 10].includes(new_status)) {
			return true
		}
	} else if (status == 10) {//form sign.

		if (new_status == 11 && is_gaining_hra && requested_action == 2) {
			return true
		} else if (new_status == 11 && is_losing_hra && requested_action != 2) {
			return true
		} else if (new_status == 12) {
			return true
		}

	} else if (status == 12) {//form revert.

		if (new_status == 1) {
			return true
		}
	}
	// else if(status == 11){
	// 	if([1, 10].includes(new_status)){
	// 		return true
	// 	}	
	// }else if(status >= 7){
	// 	if(new_status == 1 || new_status > status){
	// 		return true
	// 	}
	// }

	return false
}

const getFormStatusOptions = (requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered, tab_idx) => {

	const ids = Object.keys(FORM_4900_STATUS[requested_action])
	const returnArray = []

	if ([2, 4, 6, 8, 10, 12].includes(status)) {//before 3, 5, 10
		returnArray.push(REJECT_FORM)
	}

	for (const id_string of ids) {
		const id = Number(id_string)
		const label = FORM_4900_STATUS["all"][id]

		if (requested_action == "Issue") {
			if (status == 1) {
				if ([1, 2].includes(id)) {//contains a losing hra.
					returnArray.push({ id: id, label: label })
				}
			} else if (status == 2) {
				if (id == 2 || (id == 3 && tab_idx == 2)) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}
			} else if (status == 3) {
				if (id == 3) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}
			} else if (status == 12) {
				if (id == 1) {
					returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
				}
			}

		} else if (requested_action == "Excess") {
			if (status == 1) {

				if ([1, 2, 4].includes(id)) {//contains a losing hra.
					returnArray.push({ id: id, label: label })
				}
			} else if (status == 2) {//form sign. before: 3, 5

				if (id == 2 || (id == 3 && tab_idx == 2)) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}

			} else if (status == 3) {//form sign. before: 3, 5

				if (id == 1) {
					returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
				} else if ([3, 4].includes(id)) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}
			} else if (status == 4) {//form sign. before: 3, 5

				if (id == 4 || (id == 5 && tab_idx == 2)) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}

			} else if (status == 5) {//form sign. before: 3, 5

				if (id == 1) {
					returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
				} else if ([5, 6].includes(id)) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}
			} else if (status == 6) {//form sign. before: 3, 5

				if (requested_action == "Transfer") {
					if (id == 6 || (id == 7 && is_gaining_hra && tab_idx == 2)) {//before: 3, 5
						returnArray.push({ id: id, label: label })
					}
				} else {
					if (id == 6 || (id == 7 && tab_idx == 2)) {//before: 3, 5
						returnArray.push({ id: id, label: label })
					}
				}

			} else if (status == 7) {//form sign. before: 3, 7

				if (id == 1) {
					returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
				} else if ([7, 8].includes(id)) {//before: 3, 7
					returnArray.push({ id: id, label: label })
				}
			} else if (status == 8) {//form sign. before: 3, 7

				if (requested_action == "Transfer") {
					if (id == 8 || (id == 9 && is_gaining_hra && tab_idx == 2)) {//before: 3, 7
						returnArray.push({ id: id, label: label })
					}
				} else {
					if (id == 8 || (id == 9 && tab_idx == 2)) {//before: 3, 7
						returnArray.push({ id: id, label: label })
					}
				}

			} else if (status == 12) {
				if (id == 1) {
					returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
				}
			}

		} else if (status == 1) {

			if ([1, 2, 4].includes(id)) {//contains a losing hra.
				returnArray.push({ id: id, label: label })
			}
		} else if (status == 2) {//form sign. before: 3, 5

			if (id == 2 || (id == 3 && tab_idx == 2)) {//before: 3, 5
				returnArray.push({ id: id, label: label })
			}

		} else if (status == 3) {//form sign. before: 3, 5

			if (id == 1) {
				returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
			} else if ([3, 4].includes(id)) {//before: 3, 5
				returnArray.push({ id: id, label: label })
			}
		} else if (status == 4) {//form sign. before: 3, 5

			if (id == 4 || (id == 5 && tab_idx == 2)) {//before: 3, 5
				returnArray.push({ id: id, label: label })
			}

		} else if (status == 5) {//form sign. before: 3, 5

			if (id == 1) {
				returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
			} else if ([5, 6].includes(id)) {//before: 3, 5
				returnArray.push({ id: id, label: label })
			}
		} else if (status == 6) {//form sign. before: 3, 5

			if (requested_action == "Transfer") {
				if (id == 6 || (id == 7 && (is_gaining_hra || !gaining_hra_is_registered) && tab_idx == 2)) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}
			} else {
				if (id == 6 || (id == 7 && tab_idx == 2)) {//before: 3, 5
					returnArray.push({ id: id, label: label })
				}
			}

		} else if (status >= 7 && status < 12) {
			if (id == 1) {
				returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
			} else if (id >= status) {
				returnArray.push({ id: id, label: label })
			}
		} else if (status == 12) {
			if (id == 1) {
				returnArray.push({ id: id, label: label + " (removes PDF signatures)" })
			}
		}
	}

	return returnArray
}

const isFormCompleted = (status, requested_action) => {//Change to Accept Equipments.

	switch (requested_action) {
		case "Issue":
			return status == 3
		case "Transfer":
		case "Repair":
		case "FOI":
			return status == 7
		case "Excess":
			return status == 9
		default:
			return status == 11
	}
}

const formEquipmentInsertQuery = (req_action, hra_num, sql) => `
INSERT INTO ${EQUIPMENT} (
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
${hra_num} as HRA_NUM,
${[2, 3, 5].includes(req_action) ? "USER_EMPLOYEE_ID," : "NULL as USER_EMPLOYEE_ID,"}
ITEM_TYPE
FROM FORM_EQUIPMENT WHERE ${sql})`

const doTransaction = async (connection, user_id, rowData) => {
	let return_result = { error: false, message: "no action was done." }
	const { status, requested_action } = rowData
	const form_id = rowData.id

	try {
		let sql = eng4900SearchQuery(user_id) + ` WHERE f.ID = ${form_id}`//returns array of equipments.
		let result = await connection.execute(sql, {}, dbSelectOptions)

		if (isFormCompleted(status, requested_action) && result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			const { requested_action, status_alias, losing_hra_num, gaining_hra_num } = result.rows[0]
			const equipment_ids = result.rows.map(x => x.equipment_id)
			const bar_tags = result.rows.map(x => x.bar_tag_num)
			const bar_tags_print = printElements(bar_tags)
			const equipment_ids_print = printElements(equipment_ids)

			let equipment_result = await connection.execute(`SELECT * FROM ${EQUIPMENT} where bar_tag_num in (${bar_tags_print})`, {}, dbSelectOptions)

			switch (requested_action) {
				case "Issue":
					if (gaining_hra_num) {
						if (equipment_result.rows.length == 0) {
							result = await connection.execute(formEquipmentInsertQuery(requested_action, gaining_hra_num, `ID IN (${equipment_ids_print})`), {}, { autoCommit: false })

							if (result.rowsAffected != equipment_ids.length) {
								return_result = { ...return_result, error: true, message: `One or more equipments could not be added.` }
							} else {
								return_result = { ...return_result, message: `all equipments were added.` }
							}
						} else {
							return_result = { ...return_result, error: true, message: `1 - equipment/s: ${bar_tags_print} already exists.` }
						}
					} else {
						return_result = { ...return_result, error: true, message: `gaining hra field is blank.` }
					}

					break;
				case "Transfer":
					if (equipment_result.rows.length > 0) {
						equipment_result.rows = propNamesToLowerCase(equipment_result.rows)
						equipment_result.rows.map((equipment, i) => {

							if (equipment.hra_num == gaining_hra_num) {
								//equipment is already tied to the gaining HRA.
								return_result = {
									...return_result, error: true, message:
										return_result.message += (return_result.message.length > 0 ? ", " : "") + `${i + 1} - bartag: ${equipment.bar_tag_num} is already tied to the gaining_hra (${gaining_hra_num})`
								}
							} else if (equipment.hra_num != losing_hra_num) {
								//equipment is no longer tied to the losing HRA.
								return_result = {
									...return_result, error: true, message:
										return_result.message += (return_result.message.length > 0 ? ", " : "") + `${i + 1} - bartag: ${equipment.bar_tag_num} is no longer tied to the losing_hra (${losing_hra_num})`
								}
							}
						})

						if (!return_result.error) {
							result = await connection.execute(`UPDATE ${EQUIPMENT} SET HRA_NUM = ${gaining_hra_num}, USER_EMPLOYEE_ID = null, STATUS = NULL, STATUS_DATE = NULL WHERE bar_tag_num IN (${bar_tags_print})`, {}, { autoCommit: false })

							if (result.rowsAffected != bar_tags.length) {
								return_result = { ...return_result, error: true, message: `One or more equipments could not be found. No transfer was done.` }
							} else {
								return_result = { ...return_result, message: `all equipments were transfered.` }
							}
						}

					} else {
						return_result = { ...return_result, error: true, message: `No equipments where found.` }
					}

					break;
				case "Repair":
					return_result = { ...return_result, error: false, message: `Equipment database was not updated.` }
					break;
				case "Excess":
					if (equipment_result.rows.length > 0) {
						equipment_result.rows = propNamesToLowerCase(equipment_result.rows)
						equipment_result.rows.map((equipment, i) => {
							if (equipment.hra_num != losing_hra_num) {
								//equipment is no longer tied to the losing HRA.
								return_result = {
									...return_result, error: true, message:
										return_result.message += (return_result.message.length > 0 ? ", " : "") + `${i + 1} - bartag: ${equipment.bar_tag_num} is no longer tied to the losing_hra (${losing_hra_num})`
								}
							}
						})

						if (!return_result.error) {
							result = await connection.execute(`UPDATE ${EQUIPMENT} SET DELETED = 1, USER_EMPLOYEE_ID = NULL, HRA_NUM = NULL, STATUS = NULL, STATUS_DATE = NULL WHERE bar_tag_num IN (${bar_tags_print})`, {}, { autoCommit: false })

							if (result.rowsAffected == bar_tags.length) {
								return_result = { ...return_result, message: `all equipments were discarted.` }
							} else {
								return_result = { ...return_result, error: true, message: `One or more equipments could not be discarted.` }
							}
						}

					} else {
						return_result = { ...return_result, error: true, message: `No equipments where found.` }
					}
					break;
				case "FOI":
					if (equipment_result.rows.length > 0) {
						equipment_result.rows = propNamesToLowerCase(equipment_result.rows)
						equipment_result.rows.map((equipment, i) => {

							if (equipment.hra_num == gaining_hra_num) {
								//equipment is already tied to the gaining HRA.
								return_result = {
									...return_result, error: true, message:
										return_result.message += (return_result.message.length > 0 ? ", " : "") + `${i + 1} - bartag: ${equipment.bar_tag_num} is already tied to FOI (${gaining_hra_num})`
								}
							} else if (equipment.hra_num != losing_hra_num) {
								//equipment is no longer tied to the losing HRA.
								return_result = {
									...return_result, error: true, message:
										return_result.message += (return_result.message.length > 0 ? ", " : "") + `${i + 1} - bartag: ${equipment.bar_tag_num} is no longer tied to the losing_hra (${losing_hra_num})`
								}
							}
						})

						if (!return_result.error) {
							result = await connection.execute(`UPDATE ${EQUIPMENT} SET HRA_NUM = ${gaining_hra_num}, USER_EMPLOYEE_ID = null, STATUS = NULL, STATUS_DATE = NULL WHERE bar_tag_num IN (${bar_tags_print})`, {}, { autoCommit: false })

							if (result.rowsAffected != bar_tags.length) {
								return_result = { ...return_result, error: true, message: `One or more equipments could not be transfered to FOI.` }
							} else {
								return_result = { ...return_result, message: `all equipments were transfered to FOI.` }
							}
						}

					} else {
						return_result = { ...return_result, error: true, message: `No equipments where found.` }
					}
					break;
				default:
					return_result = { ...return_result, error: true, message: `Requested Action was not found.` }
			}

			return return_result
		} else {
			return_result = { ...return_result, error: true, message: `form is not completed.` }
		}
	} catch (err) {
		console.log(err)
		return_result = { ...return_result, error: true, message: "an error has occured." }
	}

	return return_result
}

const get4900HraAndEquipments = async function (connection, user, edit_rights) {
	return new Promise(async (resolve) => {
		const tabs = ["my_forms", "hra_forms"]
		const tabsReturnObject = {}
	
		try {
			for (let i = 0; i < tabs.length; i++) {
				const tab_name = tabs[i]
				const hra = {}
				let auth_hras = []
	
				if (tab_name == "my_forms") {
					auth_hras = edit_rights ? hra_employee_form_self(user).replace('SELECT', 'SELECT\ne.id as hra_employee_id,\nur.updated_by_full_name,\n') : hra_employee_form_self(user)
				}
	
				if (tab_name == "hra_forms") {
					auth_hras = edit_rights ? hra_employee_form_all(user).replace('SELECT', 'SELECT\ne.id as hra_employee_id,\nur.updated_by_full_name,\n') : hra_employee_form_all(user)
				}
	
				let result = await connection.execute(`${auth_hras} ORDER BY FIRST_NAME,LAST_NAME`, {}, dbSelectOptions)
	
				if (result.rows.length > 0) {
					hra.losing = propNamesToLowerCase(result.rows)
	
					for (let j = 0; j < hra.losing.length; j++) {
						const { hra_num } = hra.losing[j]
						result = await connection.execute(`SELECT * FROM ${EQUIPMENT} WHERE HRA_NUM = :0`, [hra_num], dbSelectOptions)
						hra.losing[j].equipments = propNamesToLowerCase(result.rows)
					}
	
					const all_hras = edit_rights ? hra_employee.replace('SELECT', 'SELECT\ne.id as hra_employee_id,\nur.updated_by_full_name,\n') : hra_employee
					result = await connection.execute(`${all_hras} ORDER BY FIRST_NAME,LAST_NAME`, {}, dbSelectOptions)
	
					hra.gaining = propNamesToLowerCase(result.rows)
	
					tabsReturnObject[i] = hra
				}
			}
	
			resolve(tabsReturnObject)
	
		} catch (err) {
			console.log(err)
			resolve({})
		}
	})
};

const isFileValid = (filename, type = null) => {
	const nameArray = filename.toLowerCase().split(".")
	const ext = nameArray.length > 0 ? nameArray[nameArray.length - 1] : "error"
	const validTypes = !type ? ["jpg", "jpeg", "png", "pdf"] : [type];

	if (validTypes.indexOf(ext) === -1) {
		return false;
	}
	return true;
};

const saveFileInfoToDatabase = async (connection, filename, folder) => {
	try {
		let selectResult = await connection.execute(`select id from file_storage where file_name = :0`, [filename], dbSelectOptions);
		let sql = ""
		let binds = ""

		if (selectResult.rows.length > 0) {
			//update previous record.
			binds = {
				file_name: filename,
				id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
			};

			sql = `update file_storage set file_name = :file_name where id = ${selectResult.rows[0].ID} returning id into :id`

			console.log('updated previous file_storage record.')
		} else {
			//create new record.
			binds = {
				file_name: filename,
				folder: folder,
				id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
			};

			sql = `insert into file_storage (file_name, folder) values (:file_name, :folder) returning id into :id`
			console.log('created a new file_storage record.')
		}

		let insertUpdateResult = await connection.execute(sql, binds, { autoCommit: true });

		return insertUpdateResult.outBinds.id[0]
	} catch (err) {
		console.log(err)
		return (-1)
	}
}

const formUpdate = async (connection, edipi, changes, auto_commit = true) => {
	try {
		for (const row in changes) {
			if (changes.hasOwnProperty(row)) {
				const { id } = changes[row];
				const cells = { new: changes[row] }
				let result = await connection.execute(`SELECT * FROM ${FORM_4900} WHERE ID = :0`, [id], dbSelectOptions)

				if (result.rows.length > 0) {
					result.rows = propNamesToLowerCase(result.rows)
					cells.old = result.rows[0]
					const keys = cells.new ? Object.keys(cells.new) : []
					cells.update = {}
					let cols = ''
					const cell_id = cells.old ? cells.old.id : -1

					if (cell_id != -1) {
						result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_4900'`, {}, dbSelectOptions)

						if (result.rows.length > 0) {
							result.rows = filter(result.rows, function (c) { return !BANNED_COLS_ENG4900.includes(c.COLUMN_NAME) })
							let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

							if (keys.length > 0) {
								for (let i = 0; i < keys.length; i++) {
									if (col_names.includes(keys[i])) {
										let comma = i && cols ? ', ' : ''
										cols = cols + comma + keys[i] + ' = :' + keys[i]
										cells.update[keys[i]] = isValidDate(cells.new[keys[i]]) && keys[i].toLowerCase().includes('date') ? cells.new[keys[i]] !== null ? new Date(cells.new[keys[i]]) : null :
											(typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) : cells.new[keys[i]]
									}

									if (i == keys.length - 1 && typeof edipi != 'undefined') {
										result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0', [edipi], dbSelectOptions)

										if (result.rows.length > 0) {
											const registered_users_id = result.rows[0].ID
											const comma = cols ? ', ' : ''
											cols = cols + comma + 'updated_by = :updated_by'
											cells.update['updated_by'] = registered_users_id
										}
									}
								}

								let query = `UPDATE ${FORM_4900} SET ${cols} WHERE ID = ${cells.old.id}`
								result = await connection.execute(query, cells.update, { autoCommit: auto_commit })

								return (result.rowsAffected > 0)
							}
						}
					}
				}
			}
		}

		return false//no rows affected.

	} catch (err) {
		console.log(err)
		return false//no rows affected.
	}
}

const ParseHeaders = async (string_to_parse) => {
	let parsed_result = {}

	try {
		parsed_result = JSON.parse(string_to_parse)
	} catch (err) {
		//do nothing.
	}

	return parsed_result
}

//!SELECT * FROM form_4900
exports.index = async function (req, res) {

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
exports.getById = async function (req, res) {
	let connection

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();
		let result = await connection.execute(newQuerySelById, [req.params.id], dbSelectOptions)


		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)

			const g_keys = filter(Object.keys(result.rows[0]), function (k) { return k.includes('gaining_') })
			const l_keys = filter(Object.keys(result.rows[0]), function (k) { return k.includes('losing_') })

			const hra = { gaining: {}, losing: {} }

			for (const key of g_keys) {
				hra.gaining[key.replace('gaining_', '').replace('os_alias', 'office_symbol_alias')] = result.rows[0][key]
			}

			for (const key of l_keys) {
				hra.losing[key.replace('losing_', '').replace('os_alias', 'office_symbol_alias')] = result.rows[0][key]
			}

			result.rows[0].equipment_group = []
			result.rows[0].hra = hra

			let eg_result = await connection.execute(newQuerySelById2, [result.rows[0].form_equipment_group_id], dbSelectOptions)

			if (eg_result.rows.length > 0) {
				eg_result.rows = propNamesToLowerCase(eg_result.rows)
				result.rows[0].equipment_group = eg_result.rows

				let form_signatures_array = []

				if(result.rows[0].form_signature_group_id){
					let form_signature_result = await connection.execute(`SELECT * FROM FORM_SIGNATURE_GROUP FSG
						LEFT JOIN FORM_SIGNATURE FS
						ON FS.ID = FORM_SIGNATURE_ID
						LEFT JOIN FORM_SIGNATURE_TYPE FST
						ON FST.ID = FS.FORM_SIGNATURE_TYPE
						WHERE FSG.FORM_SIGNATURE_GROUP_ID = :0 `, [result.rows[0].form_signature_group_id], dbSelectOptions)

					if(form_signature_result.rows.length > 0){
						form_signatures_array = propNamesToLowerCase(form_signature_result.rows)
					}
				}

				await create4900(req.user, result.rows[0], form_signatures_array)

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
	} catch (err) {
		console.log(err)
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: null
		});
		//logger.error(err)
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

//!SELECT form_4900 BY ID
exports.getPdfById = async function (req, res) {
	let connection

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();
		let result = await connection.execute(newQuerySelById, [req.params.id], dbSelectOptions)
		
		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)
			const { file_storage_id, form_signature_group_id } = result.rows[0]

			if (file_storage_id) {//Found a stored PDF.
				let fileStorageResult = await connection.execute("SELECT * FROM file_storage WHERE ID = :0", [file_storage_id], dbSelectOptions)

				if (fileStorageResult.rows.length > 0) {
					fileStorageResult.rows = propNamesToLowerCase(fileStorageResult.rows)
					const { file_name, folder } = fileStorageResult.rows[0]

					let file = path.join(__dirname, `../file_storage/${folder}/${file_name}`);

					fs.readFile(file, function (err, data) {
						res.contentType("application/pdf");
						res.send(data);

					});

					return (res)
				}

			}

			if (result.rows.length > 0) {
				result.rows = propNamesToLowerCase(result.rows)

				const g_keys = filter(Object.keys(result.rows[0]), function (k) { return k.includes('gaining_') })
				const l_keys = filter(Object.keys(result.rows[0]), function (k) { return k.includes('losing_') })
				const hra = { gaining: {}, losing: {} }

				for (const key of g_keys) {
					hra.gaining[key.replace('gaining_', '').replace('os_alias', 'office_symbol_alias')] = result.rows[0][key]
				}

				for (const key of l_keys) {
					hra.losing[key.replace('losing_', '').replace('os_alias', 'office_symbol_alias')] = result.rows[0][key]
				}

				result.rows[0].equipment_group = []
				result.rows[0].hra = hra
				let eg_result = await connection.execute(newQuerySelById2, [result.rows[0].form_equipment_group_id], dbSelectOptions)

				if (eg_result.rows.length > 0) {
					eg_result.rows = propNamesToLowerCase(eg_result.rows)
					result.rows[0].equipment_group = eg_result.rows
					let form_signatures_array = []
					if(form_signature_group_id){
						let form_signature_result = await connection.execute(`SELECT * FROM FORM_SIGNATURE_GROUP FSG
							LEFT JOIN FORM_SIGNATURE FS
							ON FS.ID = FORM_SIGNATURE_ID
							LEFT JOIN FORM_SIGNATURE_TYPE FST
							ON FST.ID = FS.FORM_SIGNATURE_TYPE
							WHERE FSG.FORM_SIGNATURE_GROUP_ID = :0 `, [form_signature_group_id], dbSelectOptions)
						if(form_signature_result.rows.length > 0){
							form_signatures_array = propNamesToLowerCase(form_signature_result.rows)
						}
					}

					const result_pdf = await create4900(req.user, result.rows[0], form_signatures_array)

					if (result_pdf) {
						var file = path.join(__dirname, `../output/output-eng4900-${req.user}.pdf`);

						fs.readFile(file, function (err, data) {
							res.contentType("application/pdf");
							res.send(data);

						});

						return (res)
					}
				}

				return res.status(400).json({ message: 'an error has occured.', error: true });
			}
		}

	} catch (err) {
		console.log(err)
		res.status(400).json({ message: err, error: true });
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

const getQueryForTab = (tab_name, user) => {
	let query = eng4900SearchQuery(user)

	//2 (ROR), 4 (L), 6 (G) signatures required.

	//3 (ROR), 5 (L), 7 (G) signatures completed.

	//10 completed.

	//1	Issue		(ROR, L, G)
	//2	Transfer	(ROR, L, G)
	//3	Repair	 	(ROR, L, G)
	//4	Excess	 	(ROR, L, G)
	//5	FOI			(ROR, L, G)
	if (tab_name == "my_forms") {
		query += `WHERE f.LOSING_HRA IN (${hra_num_form_self(user)} ) AND F.REQUESTED_ACTION in (2,3,4,5) `

	} else if (tab_name == "hra_forms") {
		query += `WHERE f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS NOT IN (7) AND F.REQUESTED_ACTION in (2,3,5) 
		OR f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS NOT IN (9) AND F.REQUESTED_ACTION in (4) 
		OR f.GAINING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS NOT IN (3) AND F.REQUESTED_ACTION in (1) `
	} else if (tab_name == "sign_forms") {//Change: needs to be self.
		query += `WHERE f.GAINING_HRA IN (${hra_num_form_all(user)}) AND F.STATUS IN (6) AND F.REQUESTED_ACTION in (2) 
				OR f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS IN (6) AND F.REQUESTED_ACTION in (2) AND g_hra.gaining_hra_is_registered = 0 AND f.GAINING_HRA NOT IN (SELECT hra_num from hra_authorized_users where hra_num = f.GAINING_HRA) 
				OR f.GAINING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS IN (2) AND F.REQUESTED_ACTION in (1, 2, 3, 4, 5) 
				OR f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS IN (2, 4) AND F.REQUESTED_ACTION in (2, 3, 4, 5) 
				OR f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS IN (6) AND F.REQUESTED_ACTION in (3, 4, 5) 
				OR f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS IN (8) AND F.REQUESTED_ACTION in (4) `

	} else if (tab_name == "completed_and_ipg_forms") {
		query += `WHERE f.GAINING_HRA IN (${hra_num_form_all(user)}) AND F.STATUS = 3 AND F.REQUESTED_ACTION IN (1) 
		OR f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS = 7 AND F.REQUESTED_ACTION in (2,3,5) 
		OR f.LOSING_HRA IN (${hra_num_form_all(user)} ) AND F.STATUS = 9 AND F.REQUESTED_ACTION in (4)  `
	}

	return query
}

const searchEng4900UpdatedData = async (form_id, connection, user) => {

	const tabsReturnObject = {}
	for (let i = 0; i < ALL_ENG4900_TABS.length; i++) {
		const tab_name = ALL_ENG4900_TABS[i]

		let query = getQueryForTab(tab_name, user)
		query = `SELECT * FROM (${query}) WHERE FORM_ID = :0`
		let result = await connection.execute(`${query}`, [form_id], dbSelectOptions)
		let { rows } = result

		if (rows.length > 0) {
			rows = propNamesToLowerCase(rows)

			const form_groups = groupBy(rows, function (r) {
				return r.form_id;
			});

			tabsReturnObject[i] = FormsToMaterialTableFormat(form_groups)
		}
	}

	Object.keys(tabsReturnObject).map(function (tab) {
		if (tabsReturnObject[tab].length > 0) {
			Object.keys(tabsReturnObject[tab]).map(function (elem) {
				const { requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered } = tabsReturnObject[tab][elem]
				const steps = getAllStatusSteps(status, requested_action)
				tabsReturnObject[tab][elem].status_options = getFormStatusOptions(requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered, tab)
				tabsReturnObject[tab][elem].all_status_steps = Object.keys(steps).map((key) => {
					return { id: Number(key), label: steps[key] }
				})

				// Object.keys(FORM_4900_STATUS[requested_action]).map((key) => {
				// 	return {id:Number(key), label:FORM_4900_STATUS[requested_action][key]}
				// })				
			})
		}
	})

	return tabsReturnObject
}

const searchEng4900DeletedData = async (tab_number, tabChanges, form_id) => {
	const data_to_remove = {}

	if (tabChanges.hasOwnProperty(tab_number)) {
		//no changes
	} else {
		data_to_remove[tab_number].push({ form_id: form_id })
	}

	return data_to_remove
}

const getTabData = async (connection, user) => {
	return new Promise(async (resolve) => {
		let tabsReturnObject = {}
		try{
			for (let i = 0; i < ALL_ENG4900_TABS.length; i++) {
				const tab_name = ALL_ENG4900_TABS[i]
				let query = getQueryForTab(tab_name, user)
		
				let result = await connection.execute(`${query}`, {}, dbSelectOptions)
				let { rows } = result
		
				rows = propNamesToLowerCase(rows)
				const form_groups = groupBy(rows, function (r) {
					return r.form_id;
				});
		
				tabsReturnObject[i] = FormsToMaterialTableFormat(form_groups)
		
			}
		
			Object.keys(tabsReturnObject).map(function (tab) {
				if (tabsReturnObject[tab].length > 0) {
					Object.keys(tabsReturnObject[tab]).map(function (elem) {
						const { requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered } = tabsReturnObject[tab][elem]
						const steps = getAllStatusSteps(status, requested_action)
						tabsReturnObject[tab][elem].status_options = getFormStatusOptions(requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered, tab)
						tabsReturnObject[tab][elem].all_status_steps = Object.keys(steps).map((key) => {
							return { id: Number(key), label: steps[key] }
						})
					})
				}
			})
		
			resolve(tabsReturnObject)
		}catch(err){
			console.log(err)
			resolve(tabsReturnObject)
		}
	})
}

//!SELECT form_4900 BY FIELDS DATA
exports.search2 = async function (req, res) {
	let query_search = '';
	let connection
	const edit_rights = UserLevelNameHasEditPermision(req.user_level_alias, "/eng4900")

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();

		if (edit_rights) {
			const { fields, options, tab, init } = req.body;
			if (fields && options && tab && typeof init != undefined) {
				const searchCriteria = filter(Object.keys(fields), function (k) { return fields[k] != '' });
				for (const parameter of searchCriteria) {
					const isStringColumn = eng4900DatabaseColNames[parameter].type == "string"
					const db_col_name = isStringColumn ? `LOWER(${eng4900DatabaseColNames[parameter].name})` : eng4900DatabaseColNames[parameter].name

					if (db_col_name != undefined) {
						const db_col_value = fields[parameter]
						const blacklistedSearchPatterns = ["'' ) or ", "'' ) and "]
						const includesOperator = searchOptions[options.includes[parameter]]
						const multiCharacter = (['LIKE', 'NOT LIKE'].includes(includesOperator) ? '%' : '')

						if (db_col_value.includes(';')) {
							const search_values = filter(db_col_value.split(';'), function (sv) { return sv != '' && !blacklistedSearchPatterns.includes(sv) })

							for (let i = 0; i < search_values.length; i++) {
								const op_chooser = (i == 0 ? and_ : andOR_multiple[options.includes[parameter]])
								const operator = op_chooser(query_search)
								const val = isStringColumn ? `LOWER('${multiCharacter}${search_values[i].replace(/'/, "''")}${multiCharacter}')` : search_values[i].toString().replace(/'/, "''")
								const condition = `${db_col_name} ${includesOperator} ${val} `

								if (i == 0 && !query_search) {
									query_search = query_search + '(' + condition + ' '

								} else if (i == 0 && query_search) {
									query_search = query_search + operator + ' ( ' + condition + ' '

								} else if (i != 0 && i != search_values.length - 1) {
									query_search = query_search + operator + ' ' + condition + ' '

								} else if (i == search_values.length - 1) {
									query_search = query_search + operator + ' ' + condition + ') '
								}
							}


						} else {
							const val = isStringColumn ? `LOWER('${multiCharacter}${db_col_value.replace(/'/, "''")}${multiCharacter}')` : db_col_value.toString().replace(/'/, "''")
							query_search = query_search.concat(`${andOR_single[options.includes[parameter]](query_search)} ${db_col_name} ${includesOperator} ${val} `)
						}
					}
				}

				for (const parameter in options.blanks) {
					const isStringColumn = eng4900DatabaseColNames[parameter].type == "string"
					const db_col_name = isStringColumn ? `LOWER(${eng4900DatabaseColNames[parameter].name})` : eng4900DatabaseColNames[parameter].name
					const blankOperator = searchBlanks[options.blanks[parameter]]
					const and_OR = blankAndOr[options.blanks[parameter]]
					query_search = blankOperator ? query_search + `${and_(query_search)} (${db_col_name} ${blankNull[blankOperator]} null ${and_OR} ${db_col_name} ${blankOperator} ' ')` : query_search
				}

				if (init) {
					const [tabsReturnObject, hras] = await Promise.all([getTabData(connection, req.user), get4900HraAndEquipments(connection, req.user, edit_rights)])
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully get single data!',
						data: tabsReturnObject,
						editable: edit_rights,
						hras: hras
					});
				}

				let query = getQueryForTab(tab, req.user)

				if (query_search) {
					query = `SELECT * FROM (${query}) WHERE ${query_search}`
				}

				let result = await connection.execute(`${query}`, {}, dbSelectOptions)
				let { rows } = result

				rows = propNamesToLowerCase(rows)

				const form_groups = groupBy(rows, function (r) {
					return r.form_id;
				});

				const search_return = FormsToMaterialTableFormat(form_groups)

				search_return.map(function (form_record) {
					const { requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered } = form_record
					form_record.status_options = getFormStatusOptions(requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered, tab)
					const steps = getAllStatusSteps(status, requested_action)
					form_record.all_status_steps = Object.keys(steps).map((key) => {
						return { id: Number(key), label: steps[key] }
					})
					return form_record
				})

				if (search_return.length > 0) {
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully get single data!',
						data: { [ALL_ENG4900_TABS.indexOf(tab)]: search_return },
						editable: edit_rights
					});
				}
			}
		}
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {},
			editable: edit_rights
		});
	} catch (err) {
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: {},
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

const create4900EquipmentGroup = async (equipmentIds, connection) => {
	let result = await connection.execute(`SELECT SEQ_form_equipment_group_ID.nextval from dual`, {}, dbSelectOptions)

	if (result.rows.length > 0) {
		const eGroupId = result.rows[0].NEXTVAL
		let query = `INSERT INTO FORM_EQUIPMENT_GROUP (form_equipment_group_ID, FORM_EQUIPMENT_ID)
		(SELECT ${eGroupId}, ID FROM FORM_EQUIPMENT WHERE ID IN (`

		const uniqEqs = uniq(equipmentIds)

		for (let i = 0; i < uniqEqs.length; i++) {
			query += (i > 0) ? ", :" + i : ":" + i;
		}

		query += "))";

		result = await connection.execute(query, uniqEqs, { autoCommit: true })
		return (result.rowsAffected > 0 ? eGroupId : -1)
	}

	return (-1)
}

//!INSERT EQUIPMENT
const formEquipmentAdd = async (connection, equipments, edipi) => {
	let idArray = []

	try {
		const changes = [...equipments]

		for (const row in changes) {
			if (changes.hasOwnProperty(row)) {
				const newData = changes[row];
				const keys = Object.keys(newData)
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_EQUIPMENT'`, {}, dbSelectOptions)

				if (result.rows.length > 0) {
					result.rows = filter(result.rows, function (c) { return !BANNED_COLS_FORM_EQUIPMENT.includes(c.COLUMN_NAME) })
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					if (keys.length > 0) {
						for (let i = 0; i < keys.length; i++) {
							if (col_names.includes(keys[i])) {
								const col_name = (keys[i] == "employee_id" ? 'user_' + keys[i] : keys[i])
								let comma = i && cols ? ', ' : ''
								cols = cols + comma + col_name
								vals = vals + comma + ':' + keys[i]
								insert_obj[keys[i]] = isValidDate(newData[keys[i]]) && keys[i].toLowerCase().includes('date') ? newData[keys[i]] !== null ? new Date(newData[keys[i]]) : null :
									(typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) : newData[keys[i]]
							}
						}

						let query = `INSERT INTO FORM_EQUIPMENT (${cols}) VALUES (${vals})`
						result = await connection.execute(query, insert_obj, { autoCommit: AUTO_COMMIT.ADD })

						if (result.rowsAffected) {
							result = await connection.execute('SELECT ID FROM FORM_EQUIPMENT WHERE ROWID = :0', [result.lastRowid], dbSelectOptions)
							idArray.push(result.rows[0].ID)
						}
					}
				}
			}
		}
		return (idArray)
	} catch (err) {
		console.log(err)
		return []
	}
};

//!INSERT form_4900
exports.add = async function (req, res) {

	let connection
	const { edipi } = req.headers.cert
	let keys = Object.keys(req.body.form)
	const form = {}
	const cells = {}
	let cols = ""
	let vals = ""
	const { tab } = req.body

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();

		for (const key of keys) {
			if (req.body.form[key]) {
				form[key] = req.body.form[key]
			}
		}

		let result = await connection.execute(`SELECT * FROM REQUESTED_ACTION WHERE UPPER(NAME) = UPPER(:0)`, [form.requested_action], dbSelectOptions)
		form.requested_action = result.rows[0].ID

		if (result.rows.length > 0 && (form.hra.losing.hra_num || form.requested_action == ra["Issue"]) && (form.hra.gaining.hra_num || form.requested_action == ra["Excess"]) && req.body.form.equipment_group.length > 0) {
			form.losing_hra = form.hra.losing.hra_num
			form.gaining_hra = form.hra.gaining.hra_num

			const equipmentIds = await formEquipmentAdd(connection, req.body.form.equipment_group, edipi)

			form.form_equipment_group_id = await create4900EquipmentGroup(equipmentIds, connection)
			delete form.hra
			delete form.equipment_group

			result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'FORM_4900'`, {}, dbSelectOptions)

			if (result.rows.length > 0 && form.form_equipment_group_id != -1) {
				result.rows = filter(result.rows, function (x) { return !BANNED_COLS_ENG4900.includes(x.COLUMN_NAME) })
				const col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())
				keys = Object.keys(form)

				for (let i = 0; i < keys.length; i++) {
					if (col_names.includes(keys[i])) {
						let comma = i && cols ? ', ' : ''
						cols = cols + comma + keys[i]
						vals = vals + comma + ':' + keys[i]
						cells[keys[i]] = (isValidDate(form[keys[i]]) && keys[i].toLowerCase().includes('date')) && !keys[i].toLowerCase().includes('updated_') ? form[keys[i]] !== null ? new Date(form[keys[i]]) : null :
							(typeof form[keys[i]] == 'boolean') ? (form[keys[i]] ? 1 : 2) : form[keys[i]]
					}
					
					if (i == keys.length - 1 && typeof edipi != 'undefined' && !keys.includes('updated_by')) {
						result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0', [edipi], dbSelectOptions)
						if (result.rows.length > 0) {
							const registered_users_id = result.rows[0].ID
							const comma = cols ? ', ' : ''
							cols = cols + comma + 'updated_by'
							vals = vals + comma + ':' + 'updated_by'
							cells['updated_by'] = registered_users_id
						}
					}
				}

				//DELETE - TESTING PURPOSES
				cells.status = 1
				cols = cols + ', status'
				vals = vals + ', :' + 'status'

				let query = `INSERT INTO ${FORM_4900} (${cols}) VALUES (${vals})`
				result = await connection.execute(query, cells, { autoCommit: true })

				if (result.rowsAffected > 0) {
					query = `${eng4900SearchQuery(req.user)} WHERE F.ROWID = :0`
					result = await connection.execute(query, [result.lastRowid], dbSelectOptions)
					result.rows = propNamesToLowerCase(result.rows)

					const form_groups = groupBy(result.rows, function (r) {
						return r.form_id;
					});

					const search_return = FormsToMaterialTableFormat(form_groups)

					search_return.map(function (form_record) {
						const { requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered } = form_record
						form_record.status_options = getFormStatusOptions(requested_action, status, is_losing_hra, is_gaining_hra, losing_hra_is_registered, gaining_hra_is_registered, tab)
						const steps = getAllStatusSteps(status, requested_action)
						form_record.all_status_steps = Object.keys(steps).map((key) => {
							return { id: Number(key), label: steps[key] }
						})
						return form_record
					})
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Successfully added new form!',
						data: search_return[0]
					});
				}
			}
		}
		console.log('error')
		res.status(200).json({
			status: 400,
			error: true,
			message: 'Could not add new form!',
			data: {},
		});
	} catch (err) {
		console.log('error')
		res.status(200).json({
			status: 400,
			error: true,
			message: 'Could not add new form!',
			data: {},
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

const isForm4900Updated = (obj) => obj.complete && !obj.error

const isEquipmentUpdated = (obj) => obj.message && !obj.error

const isFileRecordUpdated = (obj) => obj.deleted && !obj.error && obj.status_downgrade

const isTransactionErrorFound = (db) => db.fs_record.error || db.equipment_result.error || db.form_4900.error

//!UPDATE FROM_4900 DATA
exports.update = async function (req, res) {
	const { edipi } = req.headers.cert
	let notifcations_active = false;

	const db_update_results = {
		fs_record: { deleted: false, status_downgrade: false, signature_removal: false, error: false },
		equipment_result: { error: false },
		form_4900: { complete: false, error: false }
	}
	let connection

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();
		const { changes } = req.body.params

		await connection.execute('SAVEPOINT form_update')

		if (process.env.APPLICATION_ID) {
			let notifications_result = await connection.execute(`SELECT NOTIFICATIONS AS "notifications" FROM APPLICATION_SETTINGS WHERE ID = :0`, [process.env.APPLICATION_ID], dbSelectOptions)
			notifcations_active = notifications_result.rows.length > 0 ? Boolean(notifications_result.rows[0].notifications) : false
		}

		for (const row in changes) {
			if (changes.hasOwnProperty(row)) {
				const { newData } = changes[row];
				const { status, tab_idx } = newData
				const types = [{ name: 'gaining_hra', type: 'number' }, { name: 'gaining_hra', type: 'number' }, { name: "requested_action", type: "number" }]

				for (const column of types) {
					if (newData.hasOwnProperty(column.name)) {
						if (typeof newData[column.name] != column.type) {
							return res.status(400).send('one or more properties type are incorrect!')
						}
					}
				}

				if (newData.hasOwnProperty('file_storage_id')) {//file_storage_id is tied to status change.
					delete newData.file_storage_id
				}

				const cell_id = newData.hasOwnProperty('form_id') ? newData.form_id : (newData.hasOwnProperty('id') ? newData.id : -1)

				if (cell_id != -1 && status) {
					let from_record_result = await connection.execute(`SELECT * FROM (${eng4900SearchQuery(req.user)}) WHERE FORM_ID = :0`, [cell_id], dbSelectOptions)

					if (from_record_result.rows.length > 0) {
						from_record_result.rows = propNamesToLowerCase(from_record_result.rows)
						db_update_results.fs_record.status_downgrade = from_record_result.rows[0].status > status
						const { file_storage_id, requested_action, requested_action_alias, is_losing_hra, is_gaining_hra } = from_record_result.rows[0]

						if (isNewStatusValid(requested_action, status, from_record_result.rows[0].status, is_losing_hra, is_gaining_hra)) {
							db_update_results.fs_record.signature_removal = requiresSignatureRemoval(status, from_record_result.rows[0].status, requested_action_alias)
							let form_4900_changes = {}

							if (db_update_results.fs_record.signature_removal) {
								form_4900_changes = { 0: { ...newData, id: cell_id, file_storage_id: null } }
							} else {
								form_4900_changes = { 0: { ...newData, id: cell_id } }
							}

							db_update_results.form_4900.error = !(await formUpdate(connection, edipi, { ...form_4900_changes }, false))

							if (db_update_results.fs_record.status_downgrade) {

								if (db_update_results.fs_record.signature_removal && file_storage_id) {

									const binds = {
										id: file_storage_id,
										file_name: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
									}

									let file_storage_del_result = await connection.execute('UPDATE FILE_STORAGE SET DELETED = 1 WHERE ID = :0', [file_storage_id], { autoCommit: false })
									db_update_results.fs_record.error = file_storage_del_result.rowsAffected == 0

									if (file_storage_del_result.rowsAffected > 0) {
										db_update_results.fs_record.deleted = true
										let file_storage_fetch_result = await connection.execute('SELECT FILE_NAME FROM FILE_STORAGE WHERE ID = :0', [file_storage_id], dbSelectOptions)

										if (file_storage_fetch_result.rows.length > 0) {
											db_update_results.fs_record.file_name = file_storage_fetch_result.rows[0].FILE_NAME
										}
									}
								}

							}
							// else if(status == 10){//form is completed.
							// 	db_update_results.form_4900.complete = true
							// 	db_update_results.equipment_result = await doTransaction(connection, req.user, {...form_4900_changes[0], requested_action: requested_action})
							// }

							if (!isTransactionErrorFound(db_update_results)) {
								//commit changes.
								await connection.commit()

								if (db_update_results.fs_record.deleted && db_update_results.fs_record.file_name) {
									const pdf_path = path.join(__dirname, `../file_storage/pdf/${db_update_results.fs_record.file_name}`)

									if(fs.existsSync(pdf_path)){
										await fs.promises.unlink(pdf_path, (err) => {
											if (err) {
												console.error(err)
												return
											}
	
											console.log("file removed.")
										})
									}
								}

								const tabsReturnObject = await getTabData(connection, req.user)

								if (notifcations_active) {
									form4900EmailAlert(cell_id)
								}

								return (
									res.status(200).json({
										status: 200,
										error: false,
										tabUpdatedData: tabsReturnObject,
									})
								)
							}
						} else {
							console.log('new_status is not valid')
						}


						//error is found.
						await connection.rollback()
						return (
							res.status(400).json({
								status: 400,
								error: true,
								tabUpdatedData: {}
							})
						)
					}
				}
			}
		}

		return (
			res.status(400).json({
				status: 400,
				error: true,
				message: 'Could not update data',
				tabUpdatedData: {}
			})
		)
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 400,
			error: true,
			message: 'Cannot delete data with id: ',
			tabUpdatedData: {}
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

//!DELETE form_4900 (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.destroy = async function (req, res) {
	let tabsReturnObject = {}
	let connection

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();
		await connection.execute('SAVEPOINT form_delete')

		const changes = req.body.params
		const id = changes.hasOwnProperty('form_id') ? changes.form_id : (changes.hasOwnProperty('id') ? changes.id : -1)

		let result = await connection.execute(`${eng4900SearchQuery(req.user)} 
		LEFT JOIN FILE_STORAGE FS ON FS.ID = F.FILE_STORAGE_ID WHERE F.ID = :0`, [id], dbSelectOptions)

		if (result.rows.length > 0) {
			result.rows = propNamesToLowerCase(result.rows)
			const { file_storage_id, file_name } = result.rows[0]

			if (result.rows[0].status == 1) {
				if (result.rows[0].file_storage_id) {
					//attached file found.
					let file_storage_del_result = await connection.execute('UPDATE FILE_STORAGE SET DELETED = 1 WHERE ID = :0', [file_storage_id], { autoCommit: false })

					if (file_storage_del_result.rowsAffected > 0 && file_name) {
						let form_4900_del_result = await connection.execute(`UPDATE ${FORM_4900} SET DELETED = 1, FILE_STORAGE_ID = null, updated_by = ${req.user} WHERE ID = :0`, [id], { autoCommit: false })

						if (form_4900_del_result.rowsAffected > 0) {
							const pdf_path = path.join(__dirname, `../file_storage/pdf/${file_name}`)

							await connection.commit()
							//await connection.rollback()
							tabsReturnObject = await getTabData(connection, req.user)

							if(fs.existsSync(pdf_path)){
								await fs.promises.unlink(pdf_path, (err) => {
									if (err) {
										console.error(err)
										return
									}
	
									console.log("file removed.")
								})
							}

							return res.status(200).json({
								status: 200,
								error: false,
								message: `Successfully deleted data`, //+ req.params.id
								tabUpdatedData: tabsReturnObject
							});
						}
					}

				} else {
					//no file found,
					let form_4900_del_result = await connection.execute(`UPDATE ${FORM_4900} SET DELETED = 1, FILE_STORAGE_ID = null, updated_by = ${req.user} WHERE ID = :0`, [id], { autoCommit: false })

					if (form_4900_del_result.rowsAffected > 0) {
						await connection.commit()
						tabsReturnObject = await getTabData(connection, req.user)
						return res.status(200).json({
							status: 200,
							error: false,
							message: `Successfully deleted data`, //+ req.params.id
							tabUpdatedData: tabsReturnObject
						});
					}
				}
			} else {
				await connection.rollback()
				return res.status(400).json({
					status: 400,
					error: true,
					message: `Cannot delete data. Form status must be (1).`, //+ req.params.id
					tabUpdatedData: tabsReturnObject
				});
			}
		}

		await connection.rollback()
		return res.status(400).json({
			status: 400,
			error: true,
			message: `Cannot delete data`, //+ req.params.id
			tabUpdatedData: tabsReturnObject
		});

	} catch (err) {
		console.log(err)
		return res.status(400).json({
			status: 400,
			error: true,
			message: `Cannot delete data`, //+ req.params.id
			tabUpdatedData: tabsReturnObject
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

//!UPLOAD form_4900 (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.upload = async function (req, res) {
	let connection

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();

		await connection.execute('SAVEPOINT form_update')
		const changes = await ParseHeaders(req.headers.changes)
		const { edipi } = req.headers.cert
		let notifcations_active = false;
		const db_update_results = {
			fs_record: { deleted: false, status_downgrade: false, signature_removal: false, error: false },
			equipment_result: { error: false },
			form_4900: { complete: false, error: false }
		}

		if (!req.files) {
			return res.status(500).send({ msg: "file is not found" })
		}

		// accessing the file
		const myFile = req.files.file;

		if (isFileValid(myFile.name, 'pdf') && req.params.id >= 0 && Object.keys(changes).length) {
			const { id } = req.params
			const new_status = changes.status

			if (process.env.APPLICATION_ID) {
				let notifications_result = await connection.execute(`SELECT NOTIFICATIONS AS "notifications" FROM APPLICATION_SETTINGS WHERE ID = :0`, [process.env.APPLICATION_ID], dbSelectOptions)
				notifcations_active = notifications_result.rows.length > 0 ? Boolean(notifications_result.rows[0].notifications) : false
			}

			let result = await connection.execute(`SELECT * FROM (${eng4900SearchQuery(req.user)}) F 
		LEFT JOIN file_storage fs on fs.id = f.file_storage_id 
		WHERE F.FORM_ID = :0`, [id], dbSelectOptions)
			let new_filename = ""

			if (result.rows.length != 0) {
				result.rows = propNamesToLowerCase(result.rows)
				const { requested_action, requested_action_alias, is_losing_hra, is_gaining_hra, file_storage_id } = result.rows[0]
				const old_status = result.rows[0].status
				const status_upgrade = new_status > old_status
				db_update_results.fs_record.status_downgrade = old_status > new_status

				if (isNewStatusValid(requested_action, new_status, old_status, is_losing_hra, is_gaining_hra) && status_upgrade) {
					if (file_storage_id > 0) {
						new_filename = result.rows[0].file_name
					} else {
						new_filename = Math.floor(Date.now() / 1000) + "-" + myFile.name
					}

					await new Promise(async (resolve) => {
						myFile.mv(pdfUploadPath + new_filename, async function (err) {
							console.log('file is open.')
							if (err) {
								console.log(err)
								res.status(500).send(err);
								resolve()
							}
	
							const file_id = await saveFileInfoToDatabase(connection, new_filename, 'pdf')
	
							if (file_id != -1) {
								const form_4900_changes = { 0: { ...changes, id: id, file_storage_id: file_id } }
								console.log('Updating FORM_4900 Record...')
	
								db_update_results.form_4900.error = !(await formUpdate(connection, edipi, { ...form_4900_changes }, false))
	
								if (isFormCompleted(new_status, requested_action)) {//form is completed.
									db_update_results.form_4900.complete = true
									db_update_results.equipment_result = await doTransaction(connection, req.user, { ...form_4900_changes[0], requested_action: requested_action })
								}
	
								if (!isTransactionErrorFound(db_update_results)) {
									await connection.commit()
									const tabsReturnObject = await getTabData(connection, req.user)
	
									if (notifcations_active) {
										form4900EmailAlert(id)
									}
	
									res.status(200).json({
										status: 200,
										error: false,
										msg: 'File uploaded!',
										tabUpdatedData: tabsReturnObject,
									})
									resolve()
								} else {
									await connection.rollback()
									res.status(400).json({
										status: 400,
										error: true,
										msg: 'File not uploaded!',
										tabUpdatedData: {},
									})
									resolve()
								}
							} else {
								res.status(400).send({ msg: 'File not uploaded!' });
							}
						});
					});

				} else {
					res.status(400).send({ msg: 'File not uploaded!' });
				}
			} else {
				res.status(400).send({ msg: 'File not uploaded!' });
			}

		} else {
			res.status(400).send({ msg: 'File not uploaded!' });
		}
	} catch (err) {
		res.status(400).send({ msg: 'File not uploaded!' });
	} finally {
		console.log('closing connection...')
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};

const form_status_to_signature_type = {
	3: {id: 1},
	5: {id: 2},
	7: {id: 3},
	9: {id: 5},
	11: {id: 7},
}

//!SIGN form_4900 (THIS OPTION WON'T BE AVAILABLE TO ALL USERS).
exports.sign = async function (req, res) {
	let connection

	try {
		const pool = oracledb.getPool('ADMIN');
		connection = await pool.getConnection();

		await connection.execute('SAVEPOINT form_update')
		const changes = req.body.params
		const { id, status: new_status } = changes
		const { edipi } = req.headers.cert
		let notifcations_active = false;
		let fsGroupId
		const db_update_results = {
			fs_record: { deleted: false, status_downgrade: false, signature_removal: false, error: false },
			equipment_result: { error: false },
			form_4900: { complete: false, error: false }
		}		

		if (process.env.APPLICATION_ID) {
			let notifications_result = await connection.execute(`SELECT NOTIFICATIONS AS "notifications" FROM APPLICATION_SETTINGS WHERE ID = :0`, [process.env.APPLICATION_ID], dbSelectOptions)
			notifcations_active = notifications_result.rows.length > 0 ? Boolean(notifications_result.rows[0].notifications) : false
		}

		let result = await connection.execute(`SELECT * FROM (${eng4900SearchQuery(req.user)}) F 
			LEFT JOIN file_storage fs on fs.id = f.file_storage_id
			WHERE F.FORM_ID = :0`, [id], dbSelectOptions)

		result.rows = propNamesToLowerCase(result.rows)
		const { requested_action, requested_action_alias, is_losing_hra, is_gaining_hra, form_signature_group_id, file_storage_id, can_digitally_sign } = result.rows[0]
		const old_status = result.rows[0].status
		const status_upgrade = new_status > old_status
		db_update_results.fs_record.status_downgrade = old_status > new_status

		if (!(isNewStatusValid(requested_action, new_status, old_status, is_losing_hra, is_gaining_hra) && can_digitally_sign && status_upgrade && !file_storage_id && ![9,11].includes(new_status)))
			return res.status(400).send({ msg: 'Unable to sign document!' });

		if(form_signature_group_id){
			//validate form_signature_group_id sent.
			let result_signatures = await connection.execute(`SELECT FSG.FORM_SIGNATURE_GROUP_ID as "form_signature_group_id" FROM FORM_SIGNATURE_GROUP FSG
			LEFT JOIN FORM_SIGNATURE FS ON FS.ID = FSG.FORM_SIGNATURE_ID
			WHERE FSG.FORM_SIGNATURE_GROUP_ID = :0`, [form_signature_group_id], dbSelectOptions)

			if(result_signatures.rows.length === 0){
				res.status(400).send({ msg: 'Unable to sign document!' });
					return;
			}

			fsGroupId = result_signatures.rows[0].form_signature_group_id
		}else {
			//create new form_signature_group_id.
			let result = await connection.execute(`SELECT SEQ_FORM_SIGNATURE_GROUP_ID.nextval from dual`,{},dbSelectOptions)
			fsGroupId = result.rows[0].NEXTVAL
		}

		const signature_type = form_status_to_signature_type[new_status].id

		let sql = `insert into form_signature (form_signature_type, signature) values (:form_signature_type, :signature) returning id into :id`
		result = await connection.execute(sql, {
			form_signature_type: signature_type,
			signature: req.headers.cert.cn,
			id: {type: oracledb.NUMBER, dir: oracledb.BIND_OUT}
		}, { autoCommit: true });

		if(result.outBinds.id.length === 0)
			return res.status(400).send({ msg: 'Unable to sign document!' });

		const form_signature_id = result.outBinds.id[0]

		sql = `insert into form_signature_group (form_signature_group_id, form_signature_id) values (:fsGroupId, :form_signature_id)`
		result = await connection.execute(sql, {
			fsGroupId: fsGroupId,
			form_signature_id: form_signature_id
		}, { autoCommit: true });

		if(result.rowsAffected === 0)
			return res.status(400).send({ msg: 'Unable to sign document!' });

		// query = `UPDATE ${FORM_4900} SET (form_signature_group_id, status) values (:fsGroupId, :status) WHERE ID = :id`
		// result = await connection.execute(query, {id: id, 
		// 	fsGroupId: fsGroupId,
		// 	status: new_status,
		// }, { autoCommit: true })

		const form_4900_changes = { 0: { ...changes, id: id, form_signature_group_id: fsGroupId } }
		db_update_results.form_4900.error = !(await formUpdate(connection, edipi, { ...form_4900_changes }, false))

		if (isFormCompleted(new_status, requested_action)) {//form is completed.
			db_update_results.form_4900.complete = true
			db_update_results.equipment_result = await doTransaction(connection, req.user, { ...form_4900_changes[0], requested_action: requested_action })
		}

		if (!isTransactionErrorFound(db_update_results)) {
			await connection.commit()
			const tabsReturnObject = await getTabData(connection, req.user)

			if (notifcations_active) {
				form4900EmailAlert(id)
			}

			return res.status(200).json({
				status: 200,
				error: false,
				msg: 'Form was signed!',
				tabUpdatedData: tabsReturnObject,
			})
			
		} else {
			await connection.rollback()
			return res.status(400).json({
				status: 400,
				error: true,
				msg: 'Unable to sign document!',
				tabUpdatedData: {},
			})
		}
	} catch (err) {
		res.status(400).send({ msg: 'Unable to sign document!' });
	} finally {
		console.log('closing connection...')
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};