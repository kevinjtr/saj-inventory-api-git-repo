const dbConfig = require('../../dbconfig.js');
const {dbSelectOptions} = require('../../config/db-options');
const oracledb = require('oracledb');
const moment = require('moment')

module.exports = {
  UpdateUserAccessHistory : async (certObj) => {
    const connection =  await oracledb.getConnection(dbConfig);
    const today = moment(new Date()).format('MM-DD-yyyy').toString()
    let result = await connection.execute(`SELECT * from USER_ACCESS_HISTORY WHERE EDIPI = :0 AND to_char(date_accessed,'mm-dd-yyyy') = :1`,[certObj.edipi,today],dbSelectOptions)
  
    if(result.rows.length == 0){
      const nameArray = certObj.cn.split('.')
      if(nameArray.length > 2) {
        nameArray.pop()//remove edipi number from cn.
      }
  
      const name = nameArray.length > 2 ? (nameArray[1] + ' ' + (nameArray[2].length > 1 ? nameArray[2] : nameArray[2] + '.') + ' ' + nameArray[0]) : (nameArray.length > 0 ? nameArray[1] + ' ' + nameArray[0] : nameArray[0])
      let result = await connection.execute(`INSERT INTO USER_ACCESS_HISTORY (EDIPI, FULL_NAME) VALUES (:0, :1)`,[certObj.edipi,name],{autoCommit:true})
      console.log(`USER ENTERED SITE: ${certObj.cn} [${Number(result.rowsAffected > 0)}]`)
    }
    connection.close()
  }
};
