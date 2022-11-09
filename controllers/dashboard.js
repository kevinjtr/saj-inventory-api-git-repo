'use strict';

const fs = require('fs')
const path = require('path')
const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const groupBy = require('lodash/groupBy');
const orderBy = require('lodash/orderBy')
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase,objectDifference,containsAll,isValidDate} = require('../tools/tools');
const {eng4900SearchQuery, whereEng4900SignFormAuth, whereEng4900SignFormSelf, eng4900_losingHra,eng4900_gainingHra, hra_num_form_self, hra_num_form_all, hra_employee_form_self, hra_employee_form_all, hra_employee, EQUIPMENT, FORM_4900} = require('../config/queries');
const {dbSelectOptions,eng4900DatabaseColNames} = require('../config/db-options');
const { BLANKS_DEFAULT, searchOptions, searchBlanks, blankAndOr, blankNull} = require('../config/constants')
const {rightPermision} = require('./validation/tools/user-database')
const {create4900, ValidateEng4900Signature} = require('../pdf-fill.js');
const { Console } = require('console');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');
const BANNED_COLS_FORM_EQUIPMENT = ['ID','OFFICE_SYMBOL_ALIAS','SYS_','UPDATED_BY']
const BANNED_COLS_ENG4900 = ['ID','UPDATED_BY','SYS_NC00008$','DELETED']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const pdfUploadPath = path.join(__dirname,'../file_storage/pdf/')
const ALL_ENG4900_TABS = ["my_forms","hra_forms","sign_forms","completed_and_ipg_forms"]
const {form4900EmailAlert} = require("../tools/email-notifier")
require('dotenv').config();

const test_something = async () => {
	const connection =  await oracledb.getConnection(dbConfig);
	let result = await connection.execute(`${eng4900SearchQuery(1)}
	 ${whereEng4900SignFormSelf(1)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		result.rows = propNamesToLowerCase(result.rows)
		result.rows = result.rows.map(x => ({losing_hra_num: x.losing_hra_num, gaining_hra_num: x.gaining_hra_num, form_id: x.form_id, status_alias: x.status_alias,requested_action: x.requested_action}))
		
	}
	
	console.log(result.rows)
	await connection.close()
}

//test_something()

exports.index = async function(req, res) {

	const connection =  await oracledb.getConnection(dbConfig);

	const return_object = {
		my_equipments: null,
		my_equipments_cert: null,
		last_login: null,
		system_annoucements: [],
		hras:[],
	}

	try{
		let result =  await connection.execute('SELECT * FROM form_4900',{},dbSelectOptions)
		
		result.rows = result.rows.map(function(r){
			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
			return r;
		})


		response.ok(result.rows, res);
	}catch(err){
		//logger.error(err)
	}
};