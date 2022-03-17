'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const { propNamesToLowerCase, objectDifference } = require('../tools/tools');
const { dbSelectOptions } = require('../config/db-options');
const { rightPermision } = require('./validation/tools/user-database')
const AUTO_COMMIT = { ADD: true, UPDATE: true, DELETE: true }
const BANNED_COLS = ['ID']
const filter = require('lodash/filter');
const { exitOnError } = require('winston');

const printElements = (elements) => {
	let str = ""
	for(let i=0; i<elements.length; i++){
		str = str + (i ? ',' : '') + elements[i]
	}
	return str
}

const arraytoObject = (array, param) => {
    let obj = {}
    for (const elem of array) {
        const val = elem[param]
        obj[val] = elem

    }
    return obj
}
//SELECT * Get current users' HRAs
const getHRAs = async function(connection, EDIPI)  {
   // const connection = await oracledb.getConnection(dbConfig);
    var resultArray = [];
    try {
       // const EDIPI = req.headers.cert.edipi
        //console.log(EDIPI)
       // const edit_rights = await rightPermision(req.headers.cert.edipi)
        var HRA_NUM = await connection.execute(`SELECT HRA_NUM FROM HRA FULL JOIN REGISTERED_USERS ON HRA.EMPLOYEE_ID = REGISTERED_USERS.EMPLOYEE_ID WHERE EDIPI = ${EDIPI}`, {}, dbSelectOptions)
       // HRA_NUM = HRA_NUM.rows.map(x => x.HRA_NUM)
       // HRA_NUM = propNamesToLowerCase(HRA_NUM)
       
       // console.log(HRA_NUM)
       if (HRA_NUM.rows.length > 0){
        HRA_NUM.rows = propNamesToLowerCase(HRA_NUM.rows)
        resultArray = HRA_NUM.rows
    }
    return resultArray
      // return HRA_NUM
        /* res.status(200).json({
            status: 200,
            error: false,
            message: 'Successfully get single data!',
            data: HRA_NUM,
            editable: edit_rights
        });
         */
       

    } catch (err) {
        console.log(err)
        return resultArray
       /*  res.status(400).json({
            status: 400,
            error: true,
            message: 'No data found!',
            data: [],
            editable: false
        }); */

    }
};


//SELECT * Registered Users Names
const getNames = async function(connection) {
    //const connection = await oracledb.getConnection(dbConfig);
    var resultArray = [];
    try {
       // const EDIPI = req.headers.cert.edipi
        //console.log(EDIPI)
       // const edit_rights = await rightPermision(req.headers.cert.edipi)
     
        let result = await connection.execute(`SELECT "ID", "ID" as registered_users_id, 
        "EDIPI", 
        "FULL_NAME", 
        "EMPLOYEE_ID", 
        "USER_LEVEL"  FROM REGISTERED_USERS`, {}, dbSelectOptions)
       
        if (result.rows.length > 0){
            result.rows = propNamesToLowerCase(result.rows)
            resultArray = result.rows
        }
        return resultArray
        //console.log(resultArray)
     /*    res.status(200).json({
            status: 200,
            error: false,
            message: 'Successfully get single data!',
            data: resultArray,
            editable: edit_rights
        }); */
        
       

    } catch (err) {
        console.log(err)
        return resultArray
       /*  res.status(400).json({
            status: 400,
            error: true,
            message: 'No data found!',
            data: [],
            editable: false
        });
 */
    }
};

const registered_users_sql = `SELECT "ID" as REGISTERED_USERS_ID,EDIPI,FULL_NAME,EMPLOYEE_ID,USER_LEVEL FROM REGISTERED_USERS `

//SELECT * FROM HRA_AUTHORIZED_USERS that are authorized for a specific HRA
const getAuthorizedUsers = async function(connection, EDIPI)  {
    //const connection = await oracledb.getConnection(dbConfig);
    try {
       // const EDIPI = req.headers.cert.edipi
        //console.log(EDIPI)
        //const edit_rights = await rightPermision(req.headers.cert.edipi)
        var HRA_NUM = await connection.execute(`SELECT HRA_NUM FROM HRA h FULL JOIN (${registered_users_sql}) ru ON h.EMPLOYEE_ID = ru.EMPLOYEE_ID WHERE EDIPI = ${EDIPI}`, {}, dbSelectOptions)
        HRA_NUM = HRA_NUM.rows.map(x => x.HRA_NUM)
       // console.log(HRA_NUM)
       // console.log(HRA_NUM.rows.length)
       if(HRA_NUM.length > 0){
        var resultArray = [];

        if (HRA_NUM.length > 1){
            let arrayPrint = printElements(HRA_NUM)
            //for( var i=0; i < HRA_NUM.length; i++){
                //console.log(HRA_NUM.rows[i].HRA_NUM)
                let iResult = await connection.execute(`SELECT * FROM HRA_AUTHORIZED_USERS FULL JOIN (${registered_users_sql}) ru ON HRA_AUTHORIZED_USERS.REGISTERED_USERS_ID = ru.registered_users_id WHERE HRA_NUM in (${arrayPrint}) AND DELETED = 2`, {}, dbSelectOptions)
                resultArray = propNamesToLowerCase(iResult.rows)
                return resultArray
                // if(iResult.rows.length > 0){
                //     resultArray = [...resultArray, ...iResult.rows]
                // }   
            //}
            //result.rows = propNamesToLowerCase(result.rows)
        }else {
            let result = await connection.execute(`SELECT * FROM HRA_AUTHORIZED_USERS FULL JOIN (${registered_users_sql}) ru ON HRA_AUTHORIZED_USERS.REGISTERED_USERS_ID = ru.registered_users_id WHERE (HRA_NUM = ${HRA_NUM[0]} AND DELETED = 2)`, {}, dbSelectOptions)
            result.rows = propNamesToLowerCase(result.rows)
            resultArray = result.rows
            return resultArray
        }

        //console.log(resultArray)
     /*    res.status(200).json({
            status: 200,
            error: false,
            message: 'Successfully get single data!',
            data: resultArray,
            editable: edit_rights
        }); */
        
       }else {
        return resultArray
           /*  res.status(400).json({
                status: 400,
                error: true,
                message: 'Failed to get single data!',
                data: [],
                editable: edit_rights
            }); */
       } 

    } catch (err) {
       
        console.log(err)
        return resultArray
       /*  res.status(400).json({
            status: 400,
            error: true,
            message: 'No data found!',
            data: [],
            editable: false
        }); */

    }
};

//Single API call for dropdown data and authorized users
exports.index = async function(req, res) {
    const connection =  await oracledb.getConnection(dbConfig);
     var return_object = {
             registeredUsers: [],
             hras: [],
             authorizedUsers:[]
        
    }
    try{
        const EDIPI = req.headers.cert.edipi
        //console.log(EDIPI)
        const edit_rights = await rightPermision(req.headers.cert.edipi)

        //console.log(await getAuthorizedUsers(connection, EDIPI))
        return_object = {
            registeredUsers: await getNames(connection),
            hras: await getHRAs(connection, EDIPI),
            authorizedUsers: await getAuthorizedUsers(connection, EDIPI)
            
        }

/* 	await fs.promises.writeFile(path.join(__dirname, '../dd-items.json'), JSON.stringify(return_object,null,2))
                .then(() => {
                    console.log('dditems saved!');
                    AddEquipments()
                })
                .catch(err => {
                console.log('dditems: Some error occured - file either not saved or corrupted file saved.');
                }) */

	

		   res.status(200).json({
			                status: 200,
			                error: false,
			                message: 'Successfully get single data!',
			                data: return_object,
                            editable: edit_rights
			            }); 
            
        
		} 
	catch(err){
		console.log(err)
	
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: return_object,
            editable: false
		});

}
};
//ADD AUTHORIZED USER
exports.add = async function(req, res) { 
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert
	try{
		const {changes} = req.body.params

        console.log(changes)
		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
				let {newData} = changes[row];


                            const keys = Object.keys(newData);
                            //let cols = ''
                            let insert_obj = {}
                            //console.log(keys)
                            let result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'HRA_AUTHORIZED_USERS'`,{},dbSelectOptions)
                        // console.log(result)
                            if(result.rows.length > 0){
                                result.rows = filter(result.rows,function(c){ return !BANNED_COLS.includes(c.COLUMN_NAME)})
                                let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())
                
                                for(let i=0; i<keys.length; i++){
                                    if(col_names.includes(keys[i])){
                                        //const comma = i && cols ? ', ': ''
                                        //cols = cols + comma + keys[i] + " = :" + keys[i]
                                        insert_obj[keys[i]] = keys[i].toLowerCase().includes('date') ? new Date(newData[keys[i]]) :
                                        (typeof newData[keys[i]] == 'boolean') ? (newData[keys[i]] ? 1 : 2) :  newData[keys[i]]
                                    }
                                }

                            }



                            if(insert_obj.hra_num && insert_obj.registered_users_id){
                                let query = `MERGE INTO HRA_AUTHORIZED_USERS ru
                                USING (SELECT 1 FROM DUAL) m
                                ON ( ru.hra_num = ${insert_obj.hra_num} AND ru.registered_users_id = ${insert_obj.registered_users_id}  )
                                WHEN NOT MATCHED THEN
                                INSERT (ru.hra_num, ru.registered_users_id)
                                VALUES (${insert_obj.hra_num}, ${insert_obj.registered_users_id})`

                                console.log(query)
                                result = await connection.execute(query,{},{autoCommit:AUTO_COMMIT.ADD})
                                console.log(result.rowsAffected)

                                return res.status(200).json({
                                    status: 200,
                                    error: result.rowsAffected == 0,
                                    message: result.rowsAffected == 0 ? 'Could not add new data!' : 'Sucessfully added new data!',
                                    //data: null//req.body
                                });
                            }
                            

                            

                            return res.status(400).json({
                                status: 400,
                                error: true,//result.rowsAffected == 0,
                                message: 'Could not add new data!',
                                //data: null//req.body
                            });
                        }
                    
                        }
                
	

		res.status(400).json({
			status: 400,
			error: true,
			message: 'Unable to add new data!',
			//data: null//req.body
		});
	}catch(err){
		console.log(err);
		res.status(400).json({
			status: 400,
			error: true,
			message: 'Error adding new data!'
		});
	}
};


//DELETE AUTHORIZED USERS
exports.delete = async function(req, res) {
	//let ids = ''
	const connection =  await oracledb.getConnection(dbConfig);
	const {edipi} = req.headers.cert
	try{
		const {changes} = req.body.params

		for(const row in changes){
			if(changes.hasOwnProperty(row)) {
                //console.log(changes[row].oldData)

                const {id} = changes[row].rowData
                //console.log(changes[row].rowData)
				//const {id} = changes[row].oldData
				//let cols = ''

				// if(typeof edipi != 'undefined'){
				// 	let result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
				// 	if(result.rows.length > 0){
				// 		const registered_users_id = result.rows[0].ID
				// 		//comma =  cols ? ', ': ''
				// 		//cols = cols + comma + 'updated_by = :updated_by'
				// 		cols = `, UPDATED_BY = ${registered_users_id}`
				// 	}
				// }

                if(id){
                    console.log('id: ' + id)
                    let result = await connection.execute(`DELETE FROM HRA_AUTHORIZED_USERS WHERE ID = :0`,[id],{autoCommit:AUTO_COMMIT.DELETE})
                    //let result = await connection.execute(`UPDATE HRA_AUTHORIZED_USERS SET DELETED = 1 WHERE ID = :0`,[id],{autoCommit:AUTO_COMMIT.DELETE})

                    if(result.rowsAffected > 0){
                        return res.status(200).json({
                            status: 200,
                            error: false,
                            message: `Successfully delete data` //+ req.params.id
                        });
                    }
                }
				
				//ids = (ids != '' ? ids + ', ' : ids) + changes[row].oldData.id
				//console.log(result)
			}
            connection.close()
		}

		return res.status(400).json({
			status: 400,
			error: true,
			message: `Unable to delete data` //+ req.params.id
		});

	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: `Cannot delete data.` //+ req.params.id
		});
	}
};