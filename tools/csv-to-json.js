const fs = require('fs');
const path = require('path');
const merge = require('lodash/merge');
const orderBy = require('lodash/orderBy');
const filter = require('lodash/filter');
const uniqBy = require('lodash/uniqBy')
const findIndex = require('lodash/findIndex');
const csv=require('csvtojson')

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
    };
    
    //this will generate a new field in the database if employee not found.

const blacklsitedEmployeesHRA = ["Pending","Barcode"]

async function GetEmployeeWithID(employee,col1Name,col2Name) {

	const connection =  await oracledb.getConnection(dbConfig);

	try{
        const col1LowerCase = employee[col1Name] ? employee[col1Name].toLowerCase() : null
        const col2LowerCase = employee[col2Name] ? employee[col2Name].toLowerCase() : null
		let result =  await connection.execute('SELECT * FROM employee where LOWER(first_name) = :0 and LOWER(last_name) = :1 ',[col1LowerCase,col2LowerCase],dbSelectOptions)
        
        if(result.rows.length == 0){
            result =  await connection.execute(`INSERT INTO employee (first_name,last_name) values (:0,:1)`,[employee[col1Name],employee[col2Name]],{autoCommit:true})

            if(result.rowsAffected > 0){
                const rowid = result.lastRowid
                result =  await connection.execute('SELECT * FROM employee where rowid = :0 ',[rowid],dbSelectOptions)
                console.log(`new employee added: ${result.rows[0].FIRST_NAME} ${result.rows[0].LAST_NAME} id[${result.rows[0].ID}]`)
            }
        }

        if(result.rows.length > 0){
            result.rows = result.rows.map(function(r){
                r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
                return r;
            })

            return(result.rows[0])
        }{
            return({error:true})
        }
	}catch(err){
		console.log(err)
	}
};

const non_bartag_cols = ['Last Name','First Name','HRA','Email']

 const EquipmentConvert = async () =>  {
        const csvFilePath = `./tools/csv-files/equipments.csv`
    
        if(fs.existsSync(csvFilePath)){
            
            const equipments = await csv({ignoreEmpty:true}).fromFile(csvFilePath);

            for(let i=0;i<equipments.length;i++){
                equipments[i].USER_EMPLOYEE_ID = null
                equipments[i].HRA_ID = equipments[i].HRA_ID ? Number(equipments[i].HRA_ID) : null
                equipments[i].PROP_ID = equipments[i].PROP_ID ? Number(equipments[i].PROP_ID) : null
                equipments[i].PROP_ACQUISITION_DATE = equipments[i].PROP_ACQUISITION_DATE ? new Date(equipments[i].PROP_ACQUISITION_DATE) : null
                equipments[i].PROP_ACQUISITION_COST = equipments[i].PROP_ACQUISITION_COST ? parseFloat(equipments[i].PROP_ACQUISITION_COST.replace(',','')): null
            }

            await fs.promises.writeFile(path.join(__dirname, 'equipments.json'), JSON.stringify(equipments,null,2))
                .then(() => {
                    console.log('equipments saved!');
                })
                .catch(err => {
                console.log('equipments: Some error occured - file either not saved or corrupted file saved.');
                });
        }
}

const EmployeesConvert = async () => {
        const csvFilePath = `./tools/csv-files/employees.csv`
    
        if(fs.existsSync(csvFilePath)){
            
            const jsonArray = await csv({ignoreEmpty:true}).fromFile(csvFilePath);

            for(let i=0;i<jsonArray.length;i++){
                const objKeys = Object.keys(jsonArray[i])
                const btNamesArray = filter(objKeys,function(o){ return !non_bartag_cols.includes(o);})
                let btArray = []

                for(const bt_name of btNamesArray){
                    btArray.push(jsonArray[i][bt_name])
                    delete jsonArray[i][bt_name];
                }

                jsonArray[i]['bartags'] = btArray
            }

            await fs.promises.writeFile(path.join(__dirname, 'employees.json'), JSON.stringify(jsonArray,null,2))
                .then(() => {
                    console.log('employees saved!');
                })
                .catch(err => {
                console.log('employees: Some error occured - file either not saved or corrupted file saved.');
                });
        }
}

const loadJSON = async (filepath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, 'utf8', (err, content) => {
        if(err) {
          reject(err)
        } else {
          try {
            resolve(JSON.parse(content));
          } catch(err) {
            reject(err)
          }
        }
      })
    });
  }

const AddEmployees = async () => {
        const employees = await loadJSON('./tools/employees.json')
        const equipments = await loadJSON('./tools/equipments.json')

        for(const emp of employees){
            if(!blacklsitedEmployeesHRA.includes(emp.HRA)){
                const employee = await GetEmployeeWithID(emp,"First Name","Last Name")
                //console.log(employee)
    
                if(emp.bartags.length != 0){
                    for(let i=0;i<emp.bartags.length;i++){
                    const empBartag = emp.bartags[i]
                    const empHra = emp.HRA
    
                    try{        
                        const eqIdx = findIndex(equipments,function(e){ return (Number(e.PROP_ID) == Number(empBartag) && Number(e.HRA_ID) == Number(empHra)) })
    
                        if(eqIdx != -1){
                            equipments[eqIdx].USER_EMPLOYEE_ID = employee.id
                        }
    
                        }catch(err){
                            console.log(err)
                        }
                    }
                }
            }          
        }

        await fs.promises.writeFile(path.join(__dirname, 'equipments-new.json'), JSON.stringify(equipments,null,2))
                .then(() => {
                    console.log('equipments-new saved!');
                })
                .catch(err => {
                console.log('equipments-new: Some error occured - file either not saved or corrupted file saved.');
                });
}

const AddHraEmployees = async () => {
    const hraEmployees = await loadJSON('./tools/hraEmployees.json')
    const connection =  await oracledb.getConnection(dbConfig);

    for(const tempEmp of hraEmployees){
        const employee = await GetEmployeeWithID(tempEmp,"FIRST_NAME","LAST_NAME")

        if(typeof tempEmp.HRA_NUM == "object"){//hra with multiple hra accounts
            for(let hra_num of tempEmp.HRA_NUM){
                let result =  await connection.execute('SELECT * FROM hra where hra_num = :0',[hra_num],dbSelectOptions)

                if(result.rows.length == 0){
                    result =  await connection.execute(`INSERT INTO hra (hra_num,employee_id) values (:0,:1)`,[hra_num,employee.id],{autoCommit:true})
                    console.log(`HRA Added: ${employee.first_name} ${employee.last_name} (${hra_num})`)
        
                    if(result.rowsAffected > 0){
                        const rowid = result.lastRowid
                        result =  await connection.execute('SELECT * FROM hra where rowid = :0 ',[rowid],dbSelectOptions) 
                    }
                }
            }
        }else{//hra with single hra account.
            let result =  await connection.execute('SELECT * FROM hra where hra_num = :0',[tempEmp.HRA_NUM],dbSelectOptions)

            if(result.rows.length == 0){
                result =  await connection.execute(`INSERT INTO hra (hra_num,employee_id) values (:0,:1)`,[tempEmp.HRA_NUM,employee.id],{autoCommit:true})
                console.log(`HRA Added: ${employee.first_name} ${employee.last_name} hra(${tempEmp.HRA_NUM})`)
    
                if(result.rowsAffected > 0){
                    const rowid = result.lastRowid
                    result =  await connection.execute('SELECT * FROM hra where rowid = :0 ',[rowid],dbSelectOptions) 
                }
            }
        }
    }
}

const createHraList = async () => {
    const equipments = await loadJSON('./tools/equipments.json')
    const uniqueHRAs = uniqBy(equipments,'HRA_ID')
    let hraEmployees = []

   for(const hra of uniqueHRAs){
       try{
        const flipNames = hra.HRA_NAME.includes(',') ? true : false

        let name = hra.HRA_NAME.replace(/(^|\s).(\s|[.]|$)|\(.*\)/,' ').replace(/[.,]/,'').split(' ')
        name = filter(name,function(n){ return n != ''})
 
        if(name.length > 2){
            name.splice(1,1)
        }
 
        name = flipNames ? name.reverse() : name
        
        hraEmployees.push({
            HRA_NUM: Number(hra.HRA_ID),
            FIRST_NAME: name[0].substr(0,1) + (name[0].substr(1,name[0].length-1)).toLowerCase(),
            LAST_NAME: name[1].substr(0,1) + (name[1].substr(1,name[1].length-1)).toLowerCase()
        })

        //console.log(`${hra.HRA_NAME} (${hra.HRA_ID}) --- ${name}`)
       }catch{
           //missing fields row. ignore error throw.
       }


   }

   const employeesWithMultipleHraNumbers = uniqBy(
                                                    filter(hraEmployees, v => 
                                                        filter(hraEmployees, v1 => v1.FIRST_NAME === v.FIRST_NAME && v1.LAST_NAME === v.LAST_NAME).length > 1)
                                                        ,function(e){  return [e.FIRST_NAME, e.LAST_NAME].join();});
    

    for(const hra of employeesWithMultipleHraNumbers){
        const duplicatedHras = filter(hraEmployees,function(o){ return o.FIRST_NAME == hra.FIRST_NAME && o.LAST_NAME == hra.LAST_NAME})

        if(duplicatedHras.length > 1){
            const hraNumbers = duplicatedHras.map(x => x.HRA_NUM)
            hraEmployees = filter(hraEmployees,function(o){ return !hraNumbers.includes(o.HRA_NUM);})

            hraEmployees.push({
                HRA_NUM:hraNumbers,
                FIRST_NAME:hra.FIRST_NAME,
                LAST_NAME:hra.LAST_NAME
            })
        }
    }

    hraEmployees = orderBy(hraEmployees,'HRA_NUM')

   if(hraEmployees.length > 0){
                await fs.promises.writeFile(path.join(__dirname, 'hraEmployees.json'), JSON.stringify(hraEmployees,null,2))
                    .then(() => {
                        console.log('hraEmployees saved!');
                    })
                    .catch(err => {
                    console.log('hraEmployees: Some error occured - file either not saved or corrupted file saved.');
                    });
            }

   //console.log(hraEmployees)
    // if(uniqueHRAs.length > 0){
    //             await fs.promises.writeFile(path.join(__dirname, 'uniqueHRAs.json'), JSON.stringify(uniqueHRAs,null,2))
    //                 .then(() => {
    //                     console.log('uniqueHRAs saved!');
    //                 })
    //                 .catch(err => {
    //                 console.log('uniqueHRAs: Some error occured - file either not saved or corrupted file saved.');
    //                 });
    //         }

    // for(const equipment of equipments){

        

    //     console.log(uniqueHRAs)
    //     if(uniqueHRAs.length > 0){
    //         await fs.promises.writeFile(path.join(__dirname, 'uniqueHRAs.json'), JSON.stringify(jsonArray,null,2))
    //             .then(() => {
    //                 console.log('uniqueHRAs saved!');
    //             })
    //             .catch(err => {
    //             console.log('uniqueHRAs: Some error occured - file either not saved or corrupted file saved.');
    //             });
    //     }
        
    // //   if(employee.bartags.length != 0){
    // //     for(let i=0;i<employee.bartags.length;i++){

    // //       const empBartag = employee.bartags[i]
    // //       const empHra = employee.bartags[i]

    // //       try{        
    // //         const eqIdx = findIndex(equipments,function(e){ return (e.PROP_ID == empBartag && e.HRA == empHra) })

    // //         if(eqIdx != -1){
    // //             equipments[eqIdx].USER_EMPLOYEE_ID == employee.id
    // //         }


    // //     }catch(err){
    // //         console.log(err)
    // //     }
    // //     }
    // //   }
      
    // }
}

const AddEquipments = async (filterbyEmployeeAvailable) => {
    const connection =  await oracledb.getConnection(dbConfig);
    let equipments = await loadJSON('./tools/equipments-new.json')

    if(filterbyEmployeeAvailable){
        equipments = filter(equipments,function(e){ return e.USER_EMPLOYEE_ID != null; })
    }


	try{
        for(const equipment of equipments){
            let result =  await connection.execute('SELECT * FROM equipment where bar_tag_num = :0 ',[equipment.PROP_ID],dbSelectOptions)
        
            const eq = { 
                "PROP_ID": 48428,
                "CATALOG_ID": "702501C082781",
                //null
                "PROP_MFGR": "DELL",
                "PROP_MODEL_NO": "1800FP",
                //null
                "PROP_SERIAL_NO": "MX07R47748323G61W",
                "PROP_ACQUISITION_DATE": "2004-02-06T05:00:00.000Z",
                "PROP_ACQUISITION_COST": 300,
                //null
                //null
                "CATALOG_NOMINCLATURE": "MONITOR, COLOR IMPE: 19 DELL",
                "HRA_ID": 939,
                "USER_EMPLOYEE_ID": null,
                "ORG_NAME": "USAE JACKSONVILLE DISTRIC",
            "FOA_CODE": "K3",
            "CATALOG_NOUN": "MONITOR, COLOR",
            "CATALOG_UPDATE_DATE": "1/14/2013  12:32:43 AM",
            "HRA_NAME": "HANSLER BEALYER",
            "PROP_TOT_ACCS_COST": "0.00",
            "PROP_EXTENDED_COST": "300.00",
            "AUTH_ID": "IMA MOD",
            "PROP_DOC_REG_NO": "40149902",
            "PROP_FUND_CODE": "R",
            "PROP_LOC": "PROU",
            "PROP_ROOM_NO": "DCESAJ",
            "PROP_PURCHASE_REQ_NO": "DABL10-03-D-1008",
            "PROP_REQ_NO": "W32CS540149902",
            "PROP_PART_NO": "18.1\" SCREEN",
            "PROP_INV_DATE": "11/28/2019  12:00:00 AM",
            "TRANS_ID": "72280006",
            "TRANS_DATE": "8/16/2017  12:00:00 AM",
            "MAINT_REQ": "N",
            "PBIC_CODE": "O",
            }

            if(result.rows.length == 0){

                const options = [
                    equipment.PROP_ID,
                    equipment.CATALOG_ID,
                    null,
                    equipment.PROP_MFGR ? equipment.PROP_MFGR.replace(/\\/g, '') : null,
                    equipment.PROP_MODEL_NO ? equipment.PROP_MODEL_NO.replace(/\\/g, '') : null,
                    null,
                    equipment.PROP_SERIAL_NO,
                    new Date(equipment.PROP_ACQUISITION_DATE),
                    equipment.PROP_ACQUISITION_COST,
                    null,
                    null,
                    equipment.CATALOG_NOMINCLATURE ? equipment.CATALOG_NOMINCLATURE.replace(/\\/g, '') : null,
                    equipment.HRA_ID,
                    equipment.USER_EMPLOYEE_ID,
                ]

                //console.log(options)

                result =  await connection.execute(`INSERT INTO equipment (
                    BAR_TAG_NUM, 
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
                    ITEM_TYPE, 
                    HRA_NUM, 
                    USER_EMPLOYEE_ID
                ) values (:0,:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13)`,options,{autoCommit:true})

                if(result.rowsAffected > 0){
                    const rowid = result.lastRowid
                    result =  await connection.execute('SELECT * FROM equipment where rowid = :0 ',[rowid],dbSelectOptions)
                    console.log(`new equipment added: ${result.rows[0].MANUFACTURER} ${result.rows[0].ITEM_TYPE} bt{${result.rows[0].BAR_TAG_NUM}}`)
                }
            }
        }
	}catch(err){
		console.log(err)
	}
}

const run = async () => {
     //EmployeesConvert();
     //EquipmentConvert();
     //createHraList();
     //AddHraEmployees()
     //AddEmployees();
     AddEquipments(true); 
}

run();