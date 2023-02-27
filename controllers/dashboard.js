'use strict';

const fs = require('fs')
const path = require('path')
const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const groupBy = require('lodash/groupBy');
const orderBy = require('lodash/orderBy')
const uniqBy = require('lodash/uniqBy');
const filter = require('lodash/filter');
const moment = require('moment');
const {propNamesToLowerCase,objectDifference,containsAll,isValidDate} = require('../tools/tools');


const {eng4900SearchQuery, whereEng4900SignFormAuthNotInSelf, whereEng4900SignFormSelf, whereEng4900SignFormWithHraNum,
	 hra_num_form_auth_not_in_self, hra_num_form_self, hra_num_form_all,hra_total_employees, hra_total_equipments,
	  hra_total_employees_cert_current_fy, last_login, my_total_equipments, my_equipments_cert_current_fy,
	   getUserDashboardEquipment, getHraUserDashboardEquipment, system_annoucements} = require('../config/queries');
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
const {form4900EmailAlert} = require("../tools/email-notifier");
const { isDate } = require('moment');
require('dotenv').config();

const getMyTotalEquipments = async (connection, id) => {

	let result = await connection.execute(`${my_total_equipments(id)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		return result.rows[0].MY_TOTAL_EQUIPMENTS
	}

	return 0
}

const getMyEquipmentsCertCurrentFy = async (connection, id) => {

	let result = await connection.execute(`${my_equipments_cert_current_fy(id)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		return result.rows[0].MY_EQUIPMENTS_CERT_CURRENT_FY
	}

	return 0
}

const getMyLastLogin = async (connection, id) => {
	let result = await connection.execute(`${last_login(id)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		const return_date = moment(result.rows[0].DATE_ACCESSED).format('dddd, MMMM Do, YYYY')
		return return_date
	}

	const return_date = moment(new Date()).format('dddd, MMMM Do, YYYY')
	return return_date
}

const getSystemAnnoucements = async (connection) => {

	let result = await connection.execute(`${system_annoucements()}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		result.rows = propNamesToLowerCase(result.rows)
		return result.rows
	}

	return []
}

const getHraAccounts = async (connection, id) => {
	let return_array = []

	let result = await connection.execute(`${hra_num_form_self(id,true)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		result.rows = propNamesToLowerCase(result.rows)
		result.rows.map(x => {
			x.is_self = true
			return x
		})
		return_array = result.rows
	}

	result = await connection.execute(`${hra_num_form_auth_not_in_self(id,true)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		result.rows = propNamesToLowerCase(result.rows)
		result.rows.map(x => {
			x.is_self = false
			return x
		})

		return_array = [...return_array, ...result.rows]
	}

	return return_array;
}

const getHraTotalEmployees = async (connection, hra_num) => {

	let result = await connection.execute(`${hra_total_employees(hra_num)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		return result.rows[0].TOTAL_EMPLOYEES
	}

	return 0
}

const getHraTotalEquipments = async (connection, hra_num) => {

	let result = await connection.execute(`${hra_total_equipments(hra_num)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		return result.rows[0].TOTAL_EQUIPMENTS
	}

	return 0
}

const getHraTotalEmployeesEquipmentCertCurrentFy = async (connection, hra_num) => {

	let result = await connection.execute(`${hra_total_employees_cert_current_fy(hra_num)}`,{},dbSelectOptions)

	if(result.rows.length > 0){
		return result.rows[0].TOTAL_EMPLOYEES_CERT_CURRENT_FY
	}

	return 0
}

const getEng4900FormsToSign = async (connection, hra_num, id) => {
	let result = await connection.execute(`${eng4900SearchQuery(id)} ${whereEng4900SignFormWithHraNum(id, hra_num)}`,{},dbSelectOptions)
	return result.rows.length
}

const EmployeeEquipmentData = async (connection, id) => {
	try{
		let result = await connection.execute(getUserDashboardEquipment(id),{},dbSelectOptions)

		if(result.rows.length > 0){
			result.rows[0].last_login_string = result.rows[0].last_login_string ? moment(result.rows[0].last_login_string).format('dddd, MMMM Do, YYYY') : null
			return result.rows[0]
		}
	}catch(err){
		console.log(err)
	}
	
	return {}
}

const HraEquipmentData = async (connection, hra_num) => {
	try{
		let result = await connection.execute(getHraUserDashboardEquipment(hra_num),{},dbSelectOptions)

		if(result.rows.length > 0){
			return result.rows[0]
		}
	}catch(err){
		console.log(err)
	}
	
	return {}
}

exports.index = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	const id = req.user || req.user_level_num

	//req.user = await GetUserID(connection, req.headers.cert.edipi)

	if(!id){
		return res.status(400).json({
			status: 400,
			error: true,
			message: 'Unable to get dashboard data!',//return form and bartags.
			data: {}
		});
	}

	let return_object = {
		fiscal_year: `FY${moment(new Date()).add(3,"months").format("YY")}`,
		my_equipments: 0,
		my_equipments_cert: 0,
		my_equipments_cert_porcentage: 0,
		last_login_string: null,
		system_annoucements: [],
		hras:[],
	}

	try{
		
		// return_object.my_equipments = await getMyTotalEquipments(connection, req.user)
		// return_object.my_equipments_cert = await getMyEquipmentsCertCurrentFy(connection, req.user)
		// return_object.my_equipments_cert_porcentage = ((return_object.my_equipments_cert / (return_object.my_equipments == 0 ? 1 : return_object.my_equipments)) * 100).toFixed(1)
		// return_object.last_login_string = await getMyLastLogin(connection, req.user)
		return_object = {...return_object, ...(await EmployeeEquipmentData(connection, id))}
		return_object.system_annoucements = await getSystemAnnoucements(connection)

		//USER LEVEL IS ADMIN, HRA OR AUTHORIZED USER
		if([1, 9, 11].includes(id)){
			const hras_obj_array = await getHraAccounts(connection, id)
	
			
			for(const hra of hras_obj_array){
				const {hra_num, full_name, is_self} = hra
				let temp_hra_obj = {}

				
				temp_hra_obj = {...temp_hra_obj, ...(await HraEquipmentData(connection, hra_num))}
				//temp_hra_obj.hra_num = hra_num
				//temp_hra_obj.full_name = full_name
				//temp_hra_obj.total_employees = await getHraTotalEmployees(connection, hra_num)
				//temp_hra_obj.total_equipments = await getHraTotalEquipments(connection, hra_num)
				//temp_hra_obj.total_equipments_cert = await getHraTotalEmployeesEquipmentCertCurrentFy(connection, hra_num)
				//temp_hra_obj.total_equipments_cert_porcentage = ((temp_hra_obj.total_equipments_cert / (temp_hra_obj.total_equipments == 0 ? 1 : temp_hra_obj.total_equipments)) * 100).toFixed(1)

				temp_hra_obj.eng4900_form_notifications = await getEng4900FormsToSign(connection, hra_num, id)

				return_object.hras.push(temp_hra_obj)
			}
		}

		await connection.close()
	
		return res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully get dashboard data!',//return form and bartags.
			data: return_object
		});

	}catch(err){
		console.log(err)

		return res.status(400).json({
			status: 400,
			error: true,
			message: 'Unable to get dashboard data!',//return form and bartags.
			data: {}
		});
	}
	
}

//test_something()

// exports.index = async function(req, res) {

// 	const connection =  await oracledb.getConnection(dbConfig);

// 	const return_object = {
// 		my_equipments: null,
// 		my_equipments_cert: null,
// 		last_login: null,
// 		system_annoucements: [],
// 		hras:[],
// 	}

// 	try{
// 		let result =  await connection.execute('SELECT * FROM form_4900',{},dbSelectOptions)
		
// 		result.rows = result.rows.map(function(r){
// 			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
// 			return r;
// 		})


// 		response.ok(result.rows, res);
// 	}catch(err){
// 		//logger.error(err)
// 	}
// };