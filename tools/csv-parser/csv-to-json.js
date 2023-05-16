const fs = require('fs');
const path = require('path');
const merge = require('lodash/merge');
const orderBy = require('lodash/orderBy');
const filter = require('lodash/filter');
const uniqBy = require('lodash/uniqBy')
const findIndex = require('lodash/findIndex');
const csv=require('csvtojson')
const oracledb = require('oracledb');
const dbConfig = require('../../dbconfig.js');
const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
};

const AUTO_COMMIT = true;
const fix_names = [{name: 'AMANDA L. MAARIN', new:'Amanda Marin'}]
//module.exports = function() {
    //this will generate a new field in the database if employee not found.

    const blacklsitedEmployeesHRA = ["Pending","Barcode"]

    const enDgHras = [941, 982, 979, 907, 802, 935, 981]//filtered hra nums.
    
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
    
    async function GetEmployeeWithID(employee,col1Name,col2Name) {
    
        const connection =  await oracledb.getConnection(dbConfig);
        //const result = {rows:[]}
    
        try{
            const col1LowerCase = employee[col1Name] ? employee[col1Name].toLowerCase() : null
            const col2LowerCase = employee[col2Name] ? employee[col2Name].toLowerCase() : null
    
            const query = `SELECT * FROM employee where LOWER(first_name) ${col1LowerCase ? '=' : 'is'} ${col1LowerCase ? `'${col1LowerCase.replace(/'/,"''")}'`: col1LowerCase} and LOWER(last_name) ${col2LowerCase ? '=' : 'is'} ${col2LowerCase ? `'${col2LowerCase.replace(/'/,"''")}'`: col2LowerCase} `
            let result =  await connection.execute(query,{},dbSelectOptions)
            
            if(result.rows.length == 0){
                result =  await connection.execute(`INSERT INTO employee (first_name,last_name) values (:0,:1)`,[employee[col1Name],employee[col2Name]],{autoCommit: AUTO_COMMIT})
    
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
                console.log('STOP')
                return({error:true})
            }
        }catch(err){
            console.log(err)
        }
    };
    
    const non_bartag_cols = ['Last Name','First Name','HRA','Email']
    
    const AddEquipments = async () => {
        console.log('AddEquipments')

        const connection =  await oracledb.getConnection(dbConfig);
        let equipments = await loadJSON(path.join(__dirname,`./output/equipments.json`))
        
        // if(filterbyHraNumber){
        //     equipments = filter(equipments,function(e){ return enDgHras.includes(e.HRA_ID); })
        // }
    
        try{
            for(let i=0;i<equipments.length;i++){
                console.log(`equipment ${i+1} of ${equipments.length}`)
                const equipment = equipments[i]

                const bartag = equipment.PROP_ID ? Number(equipment.PROP_ID.toString().substr(0,5)) : null
    
                if(bartag != null){
                    let result =  await connection.execute('SELECT * FROM equipment where bar_tag_num = :0 ',[bartag],dbSelectOptions)
    
                    if(result.rows.length == 0){
    
                        const options = [
                            bartag,
                            equipment.CATALOG_ID,
                            null,
                            equipment.PROP_MFGR ? equipment.PROP_MFGR.replace(/\\/g, '') : null,
                            equipment.PROP_MODEL_NO ? equipment.PROP_MODEL_NO.replace(/\\/g, '') : null,
                            null,
                            equipment.PROP_SERIAL_NO,
                            new Date(equipment.PROP_ACQUISITION_DATE),
                            equipment.PROP_ACQUISITION_COST,
                            null,
                            //null,
                            equipment.CATALOG_NOMINCLATURE ? equipment.CATALOG_NOMINCLATURE.replace(/\\/g, '') : null,
                            equipment.HRA_ID,
                            equipment.USER_EMPLOYEE_ID,
                        ]
    
                        try{
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
                                ITEM_TYPE, 
                                HRA_NUM, 
                                USER_EMPLOYEE_ID
                            ) 
                            SELECT 
                                :0, :1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12
                            FROM dual
                            WHERE NOT EXISTS (
                                SELECT 1
                                FROM equipment
                                WHERE BAR_TAG_NUM = :0) `,options,{autoCommit: AUTO_COMMIT})
                        }catch(err){
                            console.log('equipment could not be added')
                        }

                        if(result.rowsAffected > 0){
                            const rowid = result.lastRowid
                            result =  await connection.execute('SELECT * FROM equipment where rowid = :0 ',[rowid],dbSelectOptions)
                            console.log(`new equipment added: ${result.rows[0].MANUFACTURER} ${result.rows[0].ITEM_TYPE} bt{${result.rows[0].BAR_TAG_NUM}}`)
                        }
                    }else{
                        console.log('bartag exists')
                    }
                }else{
                    console.log('null bartag')
                }
            }
            console.log('done')
        }catch(err){
            console.log(err)
        }
    }
    
    const AddEmployees = async () => {
        
        const employees_path = path.join(__dirname,`./output/employees.json`)
        const employees = fs.existsSync(employees_path) ? await loadJSON(employees_path) : []
        const equipments = await loadJSON(path.join(__dirname,`./output/equipments.json`))

        for(const emp of employees){
            if(!blacklsitedEmployeesHRA.includes(emp.HRA)){
                const employee = await GetEmployeeWithID(emp,"First Name","Last Name")
                //console.log(employee)
    
                if(emp.equipments.length != 0){
                    for(let i=0;i<emp.equipments.length;i++){
                    //console.log(`equipment ${i+1} of ${emp.equipments.length}`)
                    const empBartag = emp.equipments[i].bartag
    
                    try{        
                        const eqIdx = findIndex(equipments,function(e){ return (Number(e.PROP_ID) == Number(empBartag)) })
    
                        if(eqIdx != -1){
                            equipments[eqIdx].USER_EMPLOYEE_ID = employee.id
                            if(employee.HRA != null && employee.HRA != undefined && employee.HRA != ''){
                                equipments[eqIdx].HRA_ID = Number(employee.HRA)
                            }
                            
                        }else{
                            if(empBartag != null && empBartag != undefined){
                                const item_type = emp.equipments[i].item_type ? emp.equipments[i].item_type : null
    
                                equipments.push({
                                    "ORG_NAME": null,
                                    "FOA_CODE": null,
                                    "CATALOG_ID": null,
                                    "CATALOG_NOUN": null,
                                    "CATALOG_NOMINCLATURE": item_type,
                                    "CATALOG_UPDATE_DATE": null,
                                    "HRA_ID": emp.HRA ? Number(emp.HRA) : null,
                                    "HRA_NAME": null,
                                    "PROP_ID": Number(empBartag),
                                    "PROP_ACQUISITION_DATE": null,
                                    "PROP_ACQUISITION_COST": null,
                                    "PROP_TOT_ACCS_COST": null,
                                    "PROP_EXTENDED_COST": null,
                                    "AUTH_ID": null,
                                    "PROP_FUND_CODE": null,
                                    "PROP_LOC": null,
                                    "PROP_ROOM_NO": null,
                                    "PROP_MFGR": null,
                                    "PROP_MODEL_NO": null,
                                    "PROP_INV_DATE": null,
                                    "TRANS_ID": null,
                                    "TRANS_DATE": null,
                                    "MAINT_REQ": null,
                                    "PROP_ORG_CODE": null,
                                    "PBIC_CODE": null,
                                    "USER_EMPLOYEE_ID": Number(employee.id)
                                })
                            }
                        }
    
                        }catch(err){
                            console.log(err)
                        }
                    }
                }
            }          
        }
    
        await fs.promises.writeFile(path.join(__dirname, './output/equipments.json'), JSON.stringify(equipments,null,2))
                .then(() => {
                    console.log('equipments saved!');
                    AddEquipments()
                })
                .catch(err => {
                console.log('equipments: Some error occured - file either not saved or corrupted file saved.');
                });
    }
    
    const AddHraEmployees = async () => {
        
        const hraEmployees = await loadJSON(path.join(__dirname,`./output/hraEmployees.json`))
        const connection =  await oracledb.getConnection(dbConfig);
        console.log('AddHraEmployees',hraEmployees.length)

        for(let i=0; i < hraEmployees.length; i++){
            console.log(`Hra Employee ${i+1} of ${hraEmployees.length}`)
            const tempEmp = hraEmployees[i]
            const employee = await GetEmployeeWithID(tempEmp,"FIRST_NAME","LAST_NAME")
    
            if(typeof tempEmp.HRA_NUM == "object"){//hra with multiple hra accounts
                console.log('in object1')
                for(let hra_num of tempEmp.HRA_NUM){
                    console.log('in object2')
                    const sql = `INSERT INTO hra (hra_num, employee_id)
                    SELECT :0, :1
                    FROM dual
                    WHERE NOT EXISTS (SELECT 1 FROM hra WHERE hra_num = :0) `

                    let result =  await connection.execute(sql,[hra_num,employee.id],{autoCommit: AUTO_COMMIT})

                    if(result.rowsAffected > 0){
                        console.log(`HRA Added: ${employee.first_name} ${employee.last_name} (${hra_num})`)
                        //const rowid = result.lastRowid
                        //result =  await connection.execute('SELECT * FROM hra where rowid = :0 ',[rowid],dbSelectOptions) 
                    }
                    
                    // if(result.rows.length == 0){
                    //     result =  await connection.execute(`INSERT INTO hra (hra_num,employee_id) values (:0,:1)`,[hra_num,employee.id],{autoCommit:false})
                    //     console.log(`HRA Added: ${employee.first_name} ${employee.last_name} (${hra_num})`)
            
                    //     if(result.rowsAffected > 0){
                    //         const rowid = result.lastRowid
                    //         result =  await connection.execute('SELECT * FROM hra where rowid = :0 ',[rowid],dbSelectOptions) 
                    //     }
                    // }
                }
            }else {//hra with single hra account.
                //let result =  await connection.execute('SELECT * FROM hra where hra_num = :0',[tempEmp.HRA_NUM],dbSelectOptions)
                //if(result.rows.length == 0){

                const sql = `INSERT INTO hra (hra_num, employee_id)
                SELECT :0, :1
                FROM dual
                WHERE NOT EXISTS (SELECT 1 FROM hra WHERE hra_num = :0) `

                let result =  await connection.execute(sql,[tempEmp.HRA_NUM,employee.id],{autoCommit: AUTO_COMMIT})

                //result =  await connection.execute(`INSERT INTO hra (hra_num,employee_id) values (:0,:1)`,[tempEmp.HRA_NUM,employee.id],{autoCommit:false})
                //console.log(`HRA Added: ${employee.first_name} ${employee.last_name} hra(${tempEmp.HRA_NUM})`)
    
                if(result.rowsAffected > 0){
                    console.log(`HRA Added: ${employee.first_name} ${employee.last_name} hra(${tempEmp.HRA_NUM})`)
                    //const rowid = result.lastRowid
                    //result =  await connection.execute('SELECT * FROM hra where rowid = :0 ',[rowid],dbSelectOptions) 
                }//else{
                    //console.log('could not add HRA')
                //}

                   
            }
            //}
        }
    
        console.log('add employees')
        AddEmployees()
    }
    
    const createHraList = async () => {
        

        const equipments = await loadJSON(path.join(__dirname,`./output/equipments.json`))
        const uniqueHRAs = uniqBy(equipments,'HRA_ID')
        let hraEmployees = []
        console.log('createHraList')
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
                    await fs.promises.writeFile(path.join(__dirname, './output/hraEmployees.json'), JSON.stringify(hraEmployees,null,2))
                        .then(() => {
                            console.log('hraEmployees saved!');
                            AddHraEmployees()
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
    
    const EquipmentConvert = async () =>  {
            const csvFilePath = path.join(__dirname,`./csv-files/equipments.csv`)
            console.log('EquipmentConvert')
            if(fs.existsSync(csvFilePath)){
                
                const equipments = await csv({ignoreEmpty:true}).fromFile(csvFilePath);
    
                for(let i=0;i<equipments.length;i++){
                    equipments[i].USER_EMPLOYEE_ID = null
                    equipments[i].HRA_ID = equipments[i].HRA_ID ? Number(equipments[i].HRA_ID) : null
                    equipments[i].PROP_ID = equipments[i].PROP_ID ? Number(equipments[i].PROP_ID) : null
                    equipments[i].PROP_ACQUISITION_DATE = equipments[i].PROP_ACQUISITION_DATE ? new Date(equipments[i].PROP_ACQUISITION_DATE) : null
                    equipments[i].PROP_ACQUISITION_COST = equipments[i].PROP_ACQUISITION_COST ? parseFloat(equipments[i].PROP_ACQUISITION_COST.replace(',','')): null
                }
    
                await fs.promises.writeFile(path.join(__dirname, './output/equipments.json'), JSON.stringify(equipments,null,2))
                    .then(() => {
                        console.log('equipments saved!');
                        createHraList()
                    })
                    .catch(err => {
                    console.log('equipments: Some error occured - file either not saved or corrupted file saved.');
                    });
            }
    }
    
    const EmployeesConvert = async () => {
            const csvFilePath = path.join(__dirname,`./csv-files/employees.csv`)
        
            console.log('EmployeesConvert',fs.existsSync(csvFilePath))
            if(fs.existsSync(csvFilePath)){
                
                const jsonArray = await csv({ignoreEmpty:true}).fromFile(csvFilePath);
    
                for(let i=0;i<jsonArray.length;i++){
                    const objKeys = Object.keys(jsonArray[i])
                    const btNamesArray = filter(objKeys,function(o){ return !non_bartag_cols.includes(o);})
                    let btArray = []
    
                    for(const bt_name of btNamesArray){
                        btArray.push({'bartag':jsonArray[i][bt_name],'item_type':bt_name.replace(/\s\d/,'')})
                        delete jsonArray[i][bt_name];
                    }
    
                    jsonArray[i]['equipments'] = btArray
                }
    
                await fs.promises.writeFile(path.join(__dirname, './output/employees.json'), JSON.stringify(jsonArray,null,2))
                    .then(() => {
                        console.log('employees saved!');
                        EquipmentConvert()
                    })
                    .catch(err => {
                    console.log('employees: Some error occured - file either not saved or corrupted file saved.');
                    });
            }
    }
    
    //return {
        //run : () => {EquipmentConvert()}
    //}
//}();

//EquipmentConvert()

const VerifyChangedHraAccounts = async () => {
    console.log('VerifyChangedHraAccounts')

    try{
        const csvFilePath = path.join(__dirname,`./csv-files/inventory-schedule.csv`)  
        const jsonArray = await csv({ignoreEmpty:true}).fromFile(csvFilePath);
        const connection =  await oracledb.getConnection(dbConfig);

        for(let i=0;i<jsonArray.length;i++){
            const { HRA: hra, NAME: full_name } = jsonArray[i]
            const first_name = full_name.split(' ')[0]
    
            const binds = {
                hra: !isNaN(hra) ? Number(hra) : null
            }
    
            const result = await connection.execute(`SELECT * FROM HRA H
            LEFT JOIN EMPLOYEE E
            ON E.ID = H.EMPLOYEE_ID
            WHERE hra_num = :hra AND e.first_name like '%${first_name}%' `, binds, dbSelectOptions)
    
            if(result.rows.length == 0){

                const result2 = await connection.execute(`SELECT e.first_name as "first_name", e.last_name as "last_name"  FROM HRA H
                    LEFT JOIN EMPLOYEE E
                    ON E.ID = H.EMPLOYEE_ID
                    WHERE hra_num = :hra `,binds, dbSelectOptions)
    
                    if(result2.rows.length > 0){
                        const person = result2.rows[0]
                        console.log(`HRA [${hra}] ${person.first_name} ${person.last_name} - Name changed to ${full_name} `)
                    }
    
            }else{
                console.log(`HRA [${hra}] name did not changed. `)
            }
    
            // const objKeys = Object.keys(jsonArray[i])
            // const btNamesArray = filter(objKeys,function(o){ return !non_bartag_cols.includes(o);})
            // let btArray = []
    
            // for(const bt_name of btNamesArray){
            //     btArray.push({'bartag':jsonArray[i][bt_name],'item_type':bt_name.replace(/\s\d/,'')})
            //     delete jsonArray[i][bt_name];
            // }
    
            // jsonArray[i]['equipments'] = btArray
        }
    }catch(err){
        console.log(err)
    }

    // await fs.promises.writeFile(path.join(__dirname, './output/hras-changed.json'), JSON.stringify(jsonArray,null,2))
    //     .then(() => {
    //         console.log('employees saved!');
    //         EquipmentConvert()
    //     })
    //     .catch(err => {
    //     console.log('employees: Some error occured - file either not saved or corrupted file saved.');
    //     });
}

//VerifyChangedHraAccounts()

const VerifyNewOffices = async () => {
    console.log('VerifyNewOffices')

    try{
        const csvFilePath = path.join(__dirname,`./csv-files/inventory-schedule.csv`)  
        const jsonArray = await csv({ignoreEmpty:true}).fromFile(csvFilePath);
        const connection =  await oracledb.getConnection(dbConfig);

        for(let i=0;i<jsonArray.length;i++){
            const { LOCATION } = jsonArray[i]
            const location = LOCATION.replace('CESAJ-','').trim()

            const binds = {
                location: location.replace('CESAJ-','').trim()
            }
    
            const result = await connection.execute(`SELECT * from office_symbol
            where alias = :location`, binds, dbSelectOptions)
    
            if(result.rows.length == 0 && location){
                console.log(`Office [${location}] is not available. `)
            }
        }
    }catch(err){
        console.log(err)
    }

    // await fs.promises.writeFile(path.join(__dirname, './output/hras-changed.json'), JSON.stringify(jsonArray,null,2))
    //     .then(() => {
    //         console.log('employees saved!');
    //         EquipmentConvert()
    //     })
    //     .catch(err => {
    //     console.log('employees: Some error occured - file either not saved or corrupted file saved.');
    //     });
}

//VerifyNewOffices()