'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase} = require('../tools/tools');
const {eng4900_losingHra,eng4900_gainingHra} = require('../config/queries');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');

const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};

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
	// const connection =  await oracledb.getConnection(dbConfig);
	// try{
	// 	let result =  await connection.execute(`SELECT * FROM form_4900 WHERE id = :0`,[req.params.id],dbSelectOptions)
	// 	console.log('getid',result)
	// 	if (result.rows.length > 0) {
	// 		result.rows = result.rows.map(function(r){
	// 			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
	// 			return r;
	// 		})
	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully get single data!',
	// 			data: result.rows
	// 		});
	// 	} else {
	// 		res.status(400).json({
	// 			status: 400,
	// 			error: true,
	// 			message: 'No data found!',
	// 			data: result.rows
	// 		});
	// 	}
	// }catch(err){
	// 	console.log(err)
	// 	//logger.error(err)
	// }
};

//!SELECT form_4900 BY FIELDS DATA
exports.search = async function(req, res) {
    const connection =  await oracledb.getConnection(dbConfig);
	const forms = {}

	try{				
        let query = `SELECT 
        f.id as form_id,
        ra.alias as REQUESTED_ACTION,
		f.LOSING_HRA,
		l_hra.losing_hra_first_name,
		l_hra.losing_hra_last_name,
		f.GAINING_HRA,
		g_hra.gaining_hra_first_name,
		g_hra.gaining_hra_last_name,
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
            e.INDIVIDUAL_ROR_PROP , 
            e.ITEM_TYPE , 
            e.USER_EMPLOYEE_ID
            from form_4900 f, equipment_group eg, equipment e, requested_action ra, ${eng4900_losingHra} l_hra, ${eng4900_gainingHra} g_hra
        where eg.equipment_group_id = f.equipment_group_id and e.id = eg.equipment_id and ra.id = f.requested_action and f.losing_hra = l_hra.losing_hra_num and f.gaining_hra = g_hra.gaining_hra_num`

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
