'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');

const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};




//Division dropdown
exports.division = async function(req, res) {
    const connection =  await oracledb.getConnection(dbConfig);
    const returnDivision = []

	try{
        let query = `SELECT * from division` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
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

//District dropdown
exports.district = async function(req, res) {
    const connection =  await oracledb.getConnection(dbConfig);
    const returnDistrict = []

	try{
        let query = `SELECT * from district` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
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

//Office Symbol dropdown
exports.officeSymbol = async function(req, res) {
    const connection =  await oracledb.getConnection(dbConfig);
    const returnOfficeSymbol = []

	try{
        let query = `SELECT * from office_symbol` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
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

//User Type dropdown
exports.userType = async function(req, res) {
    const connection =  await oracledb.getConnection(dbConfig);
    const returnusertypes = []

	try{
        let query = `SELECT * from user_level` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
				         
        }    
		console.log(result.rows);
		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: result.rows
			            }); 
            
        
		} 
	catch(err){
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