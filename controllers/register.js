'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const uniq = require('lodash/uniq');
const filter = require('lodash/filter');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const BANNED_COLS = ['ID','OFFICE_SYMBOL_ALIAS','UPDATED_DATE',"UPDATED_BY_FULL_NAME","SYS_"]

const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};


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
        let query = `SELECT * from user_level` 

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
//exports.add = async function(req, res) { 
	console.log('you hit the api!')
	console.log(req.body)
	
	//await connection.execute('Insert') 
	//const {edipi} = req.headers.cert

	/* try{

		const connection =  await oracledb.getConnection(dbConfig);
		let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EMPLOYEE_REGISTRATION'`,{},dbSelectOptions)
		let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())
		let cols = ''
		let vals = ''
		const keys = Object.keys(dataIn);
					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + keys[i]
							vals = vals + comma + ' :'+ keys[i]
							insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(dataIn[keys[i]]) :
							(typeof dataIn[keys[i]] == 'boolean') ? (dataIn[keys[i]] ? 1 : 2) :  dataIn[keys[i]]
						}
					}
		
		const employee = {
			first_name: '',
			last_name: '',
			title: '',
			email: '',
			work_phone: '',
			division: '',
			district: '' ,
			office_symbol: '',
			user_type: '',
			hras: '',
		}; 
		employee.first_name = dataIn.first_name;
		employee.last_name = dataIn.last_name;
		employee.title = dataIn.title;
		employee.email = dataIn.email;
		employee.work_phone = dataIn.work_phone;
		employee.division = Number(dataIn.division);
		employee.district = Number(dataIn.district);
		employee.office_symbol = Number(dataIn.office_symbol);
		employee.user_type = Number(dataIn.user_type);
		let query = `INSERT INTO EMPLOYEE_REGISTRATION (${}) VALUES (${employee.first_name, employee.last_name })`
			console.log(query)

			result = await connection.execute(query,employee,{autoCommit:AUTO_COMMIT.ADD})

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully added new data!',
			data: null//req.body
		});
	}
	catch(err){
		console.log(err);
		res.status(200).json({
			status: 400,
			error: true,
			message: 'Error adding new data'
		});
	}  */
	const connection =  await oracledb.getConnection(dbConfig);
	//await connection.execute('Insert') 
	const {edipi} = req.headers.cert
	try{
		const {newData} = req.body.params
		//for(const row in changes){
			//if(changes.hasOwnProperty(row)) {
				//console.log(row)
				//let {newData} = changes[row];
				const keys = Object.keys(newData);
				let cols = ''
				let vals = ''
				let insert_obj = {}

				let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'EMPLOYEE_REGISTRATION'`,{},dbSelectOptions)
				//console.log(result)
				if(result.rows.length > 0){
					result.rows = filter(result.rows,function(c){ return !BANNED_COLS.includes(c.COLUMN_NAME)})
					let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

					for(let i=0; i<keys.length; i++){
						if(col_names.includes(keys[i])){
							const comma = i && cols ? ', ': ''
							cols = cols + comma + keys[i]
							vals = vals + comma + ' :'+ keys[i]
							insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(newData[keys[i]]) :
							(typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) :  newData[keys[i]]
						}


						if(i == keys.length - 1 && typeof edipi != 'undefined'){
							result = await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
							if(result.rows.length > 0){
								const user_rights_id = result.rows[0].ID
								const comma = cols ? ', ': ''
								cols = cols + comma + 'updated_by'
								vals = vals + comma + ':' + 'updated_by'
								insert_obj['updated_by'] = user_rights_id
							}
						}
					}

				}

				//console.log(keys)
				// for(let i=0; i<keys.length; i++){
				// 	if(keys[i] != 'id'){
				// 		const comma = i ? ', ': ''
				// 		cols = cols + comma + keys[i]
				// 		vals = vals + comma + ' :'+ keys[i]
				// 	}else{
				// 		delete newData.id
				// 	}
				// }

				let query = `INSERT INTO EMPLOYEE_REGISTRATION (${cols}) VALUES (${vals})`
				console.log(query)
				console.log(insert_obj)

				result = await connection.execute(query,insert_obj,{autoCommit:AUTO_COMMIT.ADD})
				//console.log(result)
			//}
	//	}

		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully added new data!',
			data: null//req.body
		});
	}catch(err){
		console.log(err);
		res.status(200).json({
			status: 400,
			error: true,
			message: 'Error adding new data!'
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
