'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
const {propNamesToLowerCase,objectDifference,containsAll} = require('../tools/tools');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const BANNED_COLS = ['ID','OFFICE_SYMBOL_ALIAS','UPDATED_DATE',"UPDATED_BY_FULL_NAME","SYS_"]
const {employee_officeSymbol} = require('../config/queries');
//const { fstat } = require('fs');
const fs = require('fs')
const path = require('path')
const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};

const sql_binds_array = (elements) => {
	let vals = ""
	for(let i=0; i<elements.length; i++){
		vals = `${vals}${(i ? `, :` : `:`)}${i}`
	}
	return vals
}

const getdivisions = async function() {
    const connection =  await oracledb.getConnection(dbConfig);
    //const returnDivision = []

	try{
        let query = `SELECT * from division` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
			return result.rows         
        }   

		return []   
        
		} 
	catch(err){
		console.log(err)
		
			return []
		//logger.error(err)
}
};

const getdistricts = async function() {
    const connection =  await oracledb.getConnection(dbConfig);

	try{
        let query = `SELECT * from district` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
			return result.rows         
        }   

		return []   
        
		} 
	catch(err){
		console.log(err)
		
			return []
		//logger.error(err)
}
};

const getofficesymbols = async function() {
    const connection =  await oracledb.getConnection(dbConfig);

	try{
        let query = `SELECT * from office_symbol` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
			return result.rows         
        }   

		return []   
        
		} 
	catch(err){
		console.log(err)
		
			return []
		//logger.error(err)
}
};

const getusertypes = async function() {
    const connection =  await oracledb.getConnection(dbConfig);

	try{
        let query = `SELECT * from user_level where not alias in ('admin','high','pbo','logistics')` 

        let result =  await connection.execute(query,{},dbSelectOptions)

        if(result.rows.length > 0){
			result.rows = result.rows.map(function(r){
				                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				                return r;
				            })
				            
			return result.rows         
        }   

		return []   
        
		} 
	catch(err){
		console.log(err)
		
			return []
		//logger.error(err)
}
};

//Single API call for all dropdown data
exports.registrationDropDownData = async function(req, res) {
    //const connection =  await oracledb.getConnection(dbConfig);

	const return_object = {
		division: await getdivisions(),
		district: await getdistricts(),
		officeSymbol: await getofficesymbols(),
		userType: await getusertypes()
	}

	await fs.promises.writeFile(path.join(__dirname, '../dd-items.json'), JSON.stringify(return_object,null,2))
                .then(() => {
                    console.log('dditems saved!');
                    AddEquipments()
                })
                .catch(err => {
                console.log('dditems: Some error occured - file either not saved or corrupted file saved.');
                })

	try{

		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: return_object
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
	
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: return_object
		});

}
};

//INSERT EMPLOYEE
exports.add = async function(req, res) { 
	const connection =  await oracledb.getConnection(dbConfig);
	const {cn, edipi} = req.headers.cert
	const cacArray = cn.split('.')
	const cac_info = {first_name:cacArray[1],last_name:cacArray[0],edipi:edipi}

	try{
		// Verify the request
		if(req.body.params.hasOwnProperty("newData")){
			const {newData} = req.body.params
			if(newData.first_name && newData.last_name && newData.title && newData.office_symbol && newData.work_phone && newData.division && newData.district && newData.email && newData.user_type ){
			console.log("validation complete")
			
			const {user_type} = newData
					//Verify if user is registered.
					 let query = `select * from user_rights where edipi = :0`
					let result = await connection.execute(query,[cac_info.edipi],dbSelectOptions)
	
					let user_rights_rows = result.rows
					
					if(user_rights_rows.length > 0){
						//User is registered.
						/* return res.status(200).json({
							status: 200,
							error: false,
							message: 'user is registered',
						}); */
					} 
					const return_messages = {}
					if(newData.user_type === 2){
						//User is not registered
						for(let i=0;i<newData.hras.length;i++){//user_type = 2 [HRA]
							//User wants to register as an HRA.
							const hra_num = newData.hras[i]
	
							let query = `SELECT h.*,e.* FROM HRA h LEFT JOIN (${employee_officeSymbol}) e 
							on h.employee_id = e.id
							WHERE HRA_NUM = ${Number(hra_num)} and UPPER(e.first_name) = '${cac_info.first_name.toUpperCase()}' and 
							UPPER(e.last_name) = '${cac_info.last_name.toUpperCase()}'`
	
							let result = await connection.execute(query,{},dbSelectOptions)
	
							if(result.rows.length > 0){//HRA account was found.
								const hra_record = propNamesToLowerCase(result.rows)[0]//grabbing first element.
								let insertQuery = `INSERT INTO USER_RIGHTS (EDIPI, FULL_NAME, EMPLOYEE_ID, USER_LEVEL) VALUES (${cac_info.edipi}, '${hra_record.first_name + " " + hra_record.last_name}', ${hra_record.id}, 2)`
								let insertResult = await connection.execute(insertQuery,{},{autoCommit:AUTO_COMMIT.ADD})
								return_messages[hra_num] = insertResult.rowsAffected > 0 ? "HRA user rights granted" : "Error inserting user rights"		
							}
								
								else{
									// HRA INFO AND CAC INFO DO NOT MATCH
									let insertQuery = `INSERT INTO EMPLOYEE_REGISTRATION (first_name, last_name, title, office_symbol, work_phone, division, district, email, user_type, hras) VALUES ('${newData.first_name}', '${newData.last_name}', '${newData.title}', ${newData.office_symbol}, '${newData.work_phone}', ${newData.division}, ${newData.district}, '${newData.email}', ${newData.user_type}, ${hra_num})`
									let insertResult = await connection.execute(insertQuery,{},{autoCommit:AUTO_COMMIT.ADD})
									return_messages[hra_num] = insertResult.rowsAffected > 0 ? "HRA user rights pending" : "Error inserting employee registration"
								}
								
	
						}
						//Return messages
						if(newData.hras.length > 0 && Object.keys(return_messages.length > 0)){
							return res.status(200).json({
								status: 200,
								error: false,
								message: return_messages,
							});
						}
					}
					
				
					//User wants to register as non HRA. user_type = 4 [Regular Employee] - Admin can make him any user_type.
					
						let insertQuery = `INSERT INTO EMPLOYEE_REGISTRATION (first_name, last_name, title, office_symbol, work_phone, division, district, email, user_type) VALUES ('${newData.first_name}', '${newData.last_name}', '${newData.title}', ${newData.office_symbol}, '${newData.work_phone}', ${newData.division}, ${newData.district}, '${newData.email}', ${newData.user_type})`
				
						let insertResult = await connection.execute(insertQuery,{},{autoCommit:AUTO_COMMIT.ADD})
						
						if(insertResult.rowsAffected > 0){
							return res.status(200).json({
								status: 200,
								error: false,
								message: 'Record created in the employee registration table',
							});
						}
		}

	}
	res.status(200).json({
				status: 200,
				error: false,
				message: 'No action taken'
			});
	}
	catch(err){
		console.log(err);
		res.status(200).json({
			status: 400,
			error: true,
			message: 'Error adding new data.'
		});
	}  
};

//Division dropdown
/* exports.division = async function(req, res) {
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
}; */
