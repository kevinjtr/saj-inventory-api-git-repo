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
const path = require('path');
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

const getDistrictId = async function() {
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
	}
}

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

			// Convert District Symbol to District Id
			let districtQuery = `select id from district where symbol = :0`
			let districtResult = await connection.execute(districtQuery,[newData.district],dbSelectOptions) 
			newData.district = districtResult.rows[0].ID
			
			const {user_type} = newData
			
					//Verify if user is registered.
					let query = `select * from registered_users where edipi = :0`
					let result = await connection.execute(query,[cac_info.edipi],dbSelectOptions)
	
					let registered_users_rows = result.rows
					
					if(registered_users_rows.length > 0){
						//User is registered.
						return res.status(200).json({
							status: 200,
							error: false,
							message: 'User has already been registered.  Please sign in using CAC authentication.',
						}); 
					} 

					//Verify if user has a pending request
					let pending_query = `select * from employee_registration where edipi = :0`
					let pending_result = await connection.execute(pending_query,[cac_info.edipi],dbSelectOptions)
					
					let pending_users_rows = pending_result.rows

					if(pending_users_rows.length > 0){
						//User is pending registration.
						return res.status(200).json({
							status: 200,
							error: false,
							message: 'Unable to submit registration.  Your previous registration request is awaiting approval.',
						}); 
					} 
					
					const return_messages = {}
					
					if(newData.user_type === 2){
						
						//Flag to mark if employee was updated
						let employeeUpdated=false
						
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
								let mergeQuery = `MERGE INTO REGISTERED_USERS ru
								USING (SELECT 1 FROM DUAL) m
								ON (ru.edipi = ${cac_info.edipi})
								WHEN NOT MATCHED THEN
								INSERT (ru.edipi,ru.full_name,ru.employee_id,ru.user_level) 
								VALUES (${cac_info.edipi}, '${hra_record.first_name + " " + hra_record.last_name}', ${hra_record.id}, 11)
								`
								//let insertQuery = `INSERT /*+ ignore_row_on_dupkey_index(registered_users(EDIPI)) */ INTO registered_users (EDIPI, FULL_NAME, EMPLOYEE_ID, USER_LEVEL) VALUES (${cac_info.edipi}, '${hra_record.first_name + " " + hra_record.last_name}', ${hra_record.id}, 11)`
								let insertResult = await connection.execute(mergeQuery,{},{autoCommit:AUTO_COMMIT.ADD})
								return_messages[hra_num] = insertResult.rowsAffected > 0 ? "HRA user rights granted" : "Error inserting user rights"
								
								// If the user was registered and employee was not already updated, also update their employee record with information they entered into the form
								if(insertResult.rowsAffected > 0 && !employeeUpdated){
									try{

										// Check if user exists in the employee table
										//let employeeQuery = `SELECT * FROM EMPLOYEE
										//WHERE OFFICE_SYMBOL = ${Number(newData.office_symbol)} 
										//and DIVISION = ${Number(newData.division)} 
										//and DISTRICT = ${Number(newData.district)} 
										//and UPPER(first_name) = '${cac_info.first_name.toUpperCase()}' 
										//and	UPPER(last_name) = '${cac_info.last_name.toUpperCase()}'`

										//let employeeResult = await connection.execute(employeeQuery,{},dbSelectOptions)

										// Record return from original HRA/employee query
										const hra_employee_record = propNamesToLowerCase(result.rows)[0]//grabbing first element.
										
										// Employee fields to be updated
										const updates = ['title','work_phone','email','office_location_id']
										let cols = ''
										let vals = []
										for(let i=0;i<updates.length;i++){
											if(newData.hasOwnProperty(updates[i]) && newData[updates[i]] !== ''){
												cols = cols + updates[i] + '= :' + i + ','
												vals.push(newData[updates[i]]) 
											// If the column is office_location_id, set blank so any previous office information is removed from employee table
											} else if (newData.hasOwnProperty('office_location_id') && newData.office_location_id === ''){
												cols = cols + updates[i] + '= :' + i + ','
												vals.push(newData[updates[i]]) 
											}
										}
										// Remove last comma
										if(cols !== ''){cols = cols.slice(0,-1)}
			
										const updateQuery = `UPDATE EMPLOYEE SET ${cols}
															WHERE ID = '${hra_employee_record.employee_id}'`
										let updateResult = await connection.execute(updateQuery,vals,{autoCommit:AUTO_COMMIT.ADD})
										
										if(updateResult.rowsAffected > 0){
											employeeUpdated = true
											console.log('HRA Employee information was updated')
										} else {
											console.log('HRA Employee information was NOT updated')
										}

									} catch(err){
										console.log('HRA user was registered but there was an error when updating employee information')
										console.log(err)
									}
								}
							}
								
							else{
								// CHECK IF HRA IS ASSIGNED TO ANOTHER USER
								let query = `SELECT * FROM HRA
								WHERE HRA_NUM = ${Number(hra_num)}` //and UPPER(e.first_name) = '${cac_info.first_name.toUpperCase()}' and 
								//UPPER(e.last_name) = '${cac_info.last_name.toUpperCase()}'`

								let result = await connection.execute(query,{},dbSelectOptions)

								let statusComment = result.rows.length > 0 ? "HRA user account tied to different employee" : "No existing HRA user account found"

								// HRA INFO AND CAC INFO DO NOT MATCH
								let insertQuery = `INSERT INTO EMPLOYEE_REGISTRATION (EDIPI, first_name, last_name, title, office_symbol, work_phone, deleted, division, district, email, user_type, hras, status_comment,first_name_cac,last_name_cac,office_location_id) VALUES (${cac_info.edipi}, '${newData.first_name}', '${newData.last_name}', '${newData.title}', ${newData.office_symbol}, '${newData.work_phone}', 2 , ${newData.division}, ${newData.district}, '${newData.email}', ${newData.user_type}, ${hra_num}, '${statusComment}','${cac_info.first_name}','${cac_info.last_name}',${newData.office_location_id?newData.office_location_id:null})`
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

					let statusComment = newData.user_type === 2 ? "User did not specify HRA number" : "Regular user"

					// Check if user exists in the employee table
					let employeeQuery = `SELECT * FROM EMPLOYEE
							WHERE OFFICE_SYMBOL = ${Number(newData.office_symbol)} 
							and DIVISION = ${Number(newData.division)} 
							and DISTRICT = ${Number(newData.district)} 
							and UPPER(first_name) = '${cac_info.first_name.toUpperCase()}' 
							and	UPPER(last_name) = '${cac_info.last_name.toUpperCase()}'`
	
					let employeeResult = await connection.execute(employeeQuery,{},dbSelectOptions)

					if(employeeResult.rows.length > 0 && newData.user_type === 4){

						const employee_record = propNamesToLowerCase(employeeResult.rows)[0]//grabbing first element.

						let mergeQuery = `MERGE INTO REGISTERED_USERS ru
								USING (SELECT 1 FROM DUAL) m
								ON (ru.edipi = ${cac_info.edipi})
								WHEN NOT MATCHED THEN
								INSERT (ru.edipi,ru.full_name,ru.employee_id,ru.user_level) 
								VALUES (${cac_info.edipi}, '${employee_record.first_name + " " + employee_record.last_name}', ${employee_record.id}, 7)
						`

						let mergeResult = await connection.execute(mergeQuery,{},{autoCommit:AUTO_COMMIT.ADD})

						if(mergeResult.rowsAffected > 0){

							// If the user was registered, also update their employee record with information they entered into the form
							try{
								// Employee fields to be updated
								const updates = ['title','work_phone','email','office_location_id']
								let cols = ''
								let vals = []
								for(let i=0;i<updates.length;i++){
									if(newData.hasOwnProperty(updates[i]) && newData[updates[i]] !== ''){
										cols = cols + updates[i] + '= :' + i + ','
										vals.push(newData[updates[i]]) 
									// If the column is office_location_id, set blank so any previous office information is removed from employee table
									} else if (newData.hasOwnProperty('office_location_id') && newData.office_location_id === ''){
										cols = cols + updates[i] + '= :' + i + ','
										vals.push(newData[updates[i]]) 
									}
								}
								// Remove last comma
								if(cols !== ''){cols = cols.slice(0,-1)}

								const updateQuery = `UPDATE EMPLOYEE SET ${cols}
													WHERE ID = '${employee_record.id}'`
								let updateResult = await connection.execute(updateQuery,vals,{autoCommit:AUTO_COMMIT.ADD})
								
								if(updateResult.rowsAffected >0){
									console.log('Regular Employee information was updated')
								} else {
									console.log('Regular Employee information was NOT updated')
								}

							} catch(err){
								console.log('Regular user was registered but there was an error when updating employee information')
								console.log(err)
							}
							
							

							return res.status(200).json({
								status: 200,
								error: false,
								message: 'Your registration has been approved and you may now log in using CAC authentication.',
							});
						}

					} else {
						
						let insertQuery = `INSERT INTO EMPLOYEE_REGISTRATION (EDIPI, first_name, last_name, title, office_symbol, work_phone, deleted, division, district, email, user_type, status_comment,first_name_cac,last_name_cac,office_location_id) VALUES (${cac_info.edipi}, '${newData.first_name}', '${newData.last_name}', '${newData.title}', ${newData.office_symbol}, '${newData.work_phone}', 2 , ${newData.division}, ${newData.district}, '${newData.email}', ${newData.user_type}, '${statusComment}','${cac_info.first_name}','${cac_info.last_name}',${newData.office_location_id?newData.office_location_id:null})`
					
						let insertResult = await connection.execute(insertQuery,{},{autoCommit:AUTO_COMMIT.ADD})
							
						if(insertResult.rowsAffected > 0){
							return res.status(200).json({
								status: 200,
								error: false,
								message: 'Your registration request has been submitted and is now pending approval.',
							});
						}
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
			message: 'An error happened in the registration process.'
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
