const dbConfig = require('../../dbconfig.js');
const {dbSelectOptions} = require('../../config/db-options');
const oracledb = require('oracledb');
const moment = require('moment')

module.exports = {
  UpdateUserAccessHistory : async (certObj) => {
    let connection
    try{
      const pool = oracledb.getPool('ADMIN');
      connection =  await pool.getConnection();

      const today = moment(new Date()).format('MM-DD-yyyy').toString()
      let result = await connection.execute(`SELECT * from USER_ACCESS_HISTORY WHERE EDIPI = :0 AND to_char(date_accessed,'mm-dd-yyyy') = :1`,[certObj.edipi,today],dbSelectOptions)
    
      if(result.rows.length == 0){
        const nameArray = certObj.cn.split('.')
        if(nameArray.length > 2) {
          nameArray.pop()//remove edipi number from cn.
        }
    
        const name = nameArray.length > 2 ? (nameArray[1] + ' ' + (nameArray[2].length > 1 ? nameArray[2] : nameArray[2] + '.') + ' ' + nameArray[0]) : (nameArray.length > 0 ? nameArray[1] + ' ' + nameArray[0] : nameArray[0])
        let result = await connection.execute(`INSERT INTO USER_ACCESS_HISTORY (EDIPI, FULL_NAME) VALUES (:0, :1)`,[certObj.edipi,name],{autoCommit:true})
        console.log(`USER ENTERED SITE: ${certObj.cn}`)
      }else{
        console.log(`USER ENTERED SITE: ${certObj.cn}`)
      }
    }catch(err){
      console.log(err)
    } finally {
      if (connection) {
        try {
          await connection.close(); // Put the connection back in the pool
        } catch (err) {
          console.log(err)
        }
      }
    }
  },
  insertUserAccessHistory : async (certObj) => {
    let connection
    try{
      const pool = oracledb.getPool('ADMIN');
      connection =  await pool.getConnection();

      let return_result = false
      const nameArray = certObj.cn.split('.')

      if(nameArray.length > 2) {
        nameArray.pop()//remove edipi number from cn.
      }

      const name = nameArray.length > 2 ? (nameArray[1] + ' ' + (nameArray[2].length > 1 ? nameArray[2] : nameArray[2] + '.') + ' ' + nameArray[0]) : (nameArray.length > 0 ? nameArray[1] + ' ' + nameArray[0] : nameArray[0])
      let result = await connection.execute(`INSERT INTO USER_ACCESS_HISTORY (EDIPI, FULL_NAME) VALUES (:0, :1)`,[certObj.edipi,name],{autoCommit:true})

      if(result.rowsAffected > 0){
        console.log(`RECORDED USER: ${certObj.cn}`)
        return_result = true
      }
      
      return return_result
    }catch(err){
      console.log(err)
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
};
