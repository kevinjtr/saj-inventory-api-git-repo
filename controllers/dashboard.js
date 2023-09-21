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
const BANNED_COLS_FORM_EQUIPMENT = ['ID','OFFICE_SYMBOL_ALIAS','SYS_','UPDATED_BY']
const BANNED_COLS_ENG4900 = ['ID','UPDATED_BY','SYS_NC00008$','DELETED']
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const pdfUploadPath = path.join(__dirname,'../file_storage/pdf/')
const ALL_ENG4900_TABS = ["my_forms","hra_forms","sign_forms","completed_and_ipg_forms"]
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

const getSystemAnnoucements = (connection) => {
	return new Promise((resolve) => {
		try{
			connection.execute(`${system_annoucements()}`,{},dbSelectOptions, function(err, result){
				if(result.rows.length > 0){
					result.rows = propNamesToLowerCase(result.rows)
					resolve(result.rows)
				}
	
				resolve([])
			})

		}catch(err){
			resolve([])
		}
	})
}

const getHraAccounts = async (connection, id) => {
	return new Promise(async (resolve) => {
		let return_array = []
		try{
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
		
			resolve(return_array);
		}catch(err){
			resolve([])
		}
	})
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

const getEng4900FormsToSign = (connection, hra_num, id) => {
	return new Promise(resolve => {
		try{
			const query = `SELECT F.ID, F.REQUESTED_ACTION, F.LOSING_HRA, F.GAINING_HRA, F.STATUS, CASE WHEN GHA.ID is not null THEN 1 ELSE 0 END gaining_hra_is_registered
			FROM FORM_4900 F
			LEFT JOIN HRA H
			ON H.HRA_NUM = F.GAINING_HRA
			LEFT JOIN EMPLOYEE E
			ON E.ID = H.EMPLOYEE_ID
			LEFT JOIN REGISTERED_USERS GHA
			ON GHA.EMPLOYEE_ID = E.ID
			WHERE f.GAINING_HRA = ${hra_num} AND F.STATUS IN (6) AND F.REQUESTED_ACTION in (2)
			OR f.LOSING_HRA = ${hra_num} AND F.STATUS IN (6) AND F.REQUESTED_ACTION in (2) AND GHA.ID is not null AND f.GAINING_HRA NOT IN (SELECT hra_num from hra_authorized_users where hra_num = f.GAINING_HRA)
			OR f.GAINING_HRA = ${hra_num} AND F.STATUS IN (2) AND F.REQUESTED_ACTION in (1, 2, 3, 4, 5)
			OR f.LOSING_HRA = ${hra_num} AND F.STATUS IN (2, 4) AND F.REQUESTED_ACTION in (2, 3, 4, 5)
			OR f.LOSING_HRA = ${hra_num} AND F.STATUS IN (6) AND F.REQUESTED_ACTION in (3, 4, 5)
			OR f.LOSING_HRA = ${hra_num} AND F.STATUS IN (8) AND F.REQUESTED_ACTION in (4) `

			connection.execute(query,{},dbSelectOptions,function(err, result){
				resolve(result.rows.length)
			})
			
		}catch(err){
			resolve(0)
		}
	})
	
}

const EmployeeEquipmentData = (connection, id) => {
	return new Promise((resolve) => {
		try{
			connection.execute(getUserDashboardEquipment(id),{},dbSelectOptions, function(err, result){
				if(result.rows.length > 0){
					result.rows[0].last_login_string = result.rows[0].last_login_string ? moment(result.rows[0].last_login_string).format('dddd, MMMM Do, YYYY') : null
					resolve(result.rows[0])
				}
	
				resolve([])
			})
			
		}catch(err){
			resolve([])
		}
	})
}

const HraEquipmentData = (connection, hra_num) => {
	return new Promise(resolve => {
		try{
			connection.execute(getHraUserDashboardEquipment(hra_num),{},dbSelectOptions,function(err, result){
				if(result.rows.length > 0){
					resolve(result.rows[0])
				}
	
				resolve([])
			})
		}catch(err){
			resolve([])
		}
	})
}

exports.index = async function(req, res) {
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		const id = req.user || req.user_level_num

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
		
		// return_object.my_equipments = await getMyTotalEquipments(connection, req.user)
		// return_object.my_equipments_cert = await getMyEquipmentsCertCurrentFy(connection, req.user)
		// return_object.my_equipments_cert_porcentage = ((return_object.my_equipments_cert / (return_object.my_equipments == 0 ? 1 : return_object.my_equipments)) * 100).toFixed(1)
		// return_object.last_login_string = await getMyLastLogin(connection, req.user)
		//return_object = {...return_object, ...(await EmployeeEquipmentData(connection, id))}
		//return_object.system_annoucements = await getSystemAnnoucements(connection)
		//USER LEVEL IS ADMIN, HRA OR AUTHORIZED USER
		if([1, 9, 11].includes(id)){
			//const hras_obj_array = await getHraAccounts(connection, id)

			//if(hras_obj_array.length === 0){
			const [temp_obj, sys_annoucements, hras_obj_array] = await Promise.all([EmployeeEquipmentData(connection, id), getSystemAnnoucements(connection), getHraAccounts(connection, id)])
			return_object = {...return_object, ...temp_obj, system_annoucements: sys_annoucements}
			//}
			for(const hra of hras_obj_array){
				const {hra_num, full_name, is_self} = hra
				//let temp_hra_obj = {}

				
				//temp_hra_obj = {...temp_hra_obj, ...(await HraEquipmentData(connection, hra_num))}
				//temp_hra_obj.hra_num = hra_num
				//temp_hra_obj.full_name = full_name
				//temp_hra_obj.total_employees = await getHraTotalEmployees(connection, hra_num)
				//temp_hra_obj.total_equipments = await getHraTotalEquipments(connection, hra_num)
				//temp_hra_obj.total_equipments_cert = await getHraTotalEmployeesEquipmentCertCurrentFy(connection, hra_num)
				//temp_hra_obj.total_equipments_cert_porcentage = ((temp_hra_obj.total_equipments_cert / (temp_hra_obj.total_equipments == 0 ? 1 : temp_hra_obj.total_equipments)) * 100).toFixed(1)

				//temp_hra_obj.eng4900_form_notifications = await getEng4900FormsToSign(connection, hra_num, id)

				const [result_hra_obj, form_notify] = await Promise.all([HraEquipmentData(connection, hra_num), getEng4900FormsToSign(connection, hra_num, id)])
				//return_object = 

				//return_object = {...temp_obj, system_annoucements: sys_annoucements}
				return_object.hras.push({...result_hra_obj, eng4900_form_notifications: form_notify})
			}
		}else{
			const [temp_obj, sys_annoucements] = await Promise.all([EmployeeEquipmentData(connection, id), getSystemAnnoucements(connection)])
			return_object = {...return_object, ...temp_obj, system_annoucements: sys_annoucements}
		}

		console.log(return_object)
	
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
	} finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
	
}

//test_something()

// exports.index = async function(req, res) {

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