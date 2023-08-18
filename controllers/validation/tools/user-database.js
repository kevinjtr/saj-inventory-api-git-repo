const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');
const { dbSelectOptions } = require('../../../config/db-options');
const { REGISTERED_USERS_VIEW } = require('../../../config/constants');

exports.rightPermision = async (edipi) => {
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		if (typeof edipi !== 'undefined') {
			let result =  await connection.execute(`SELECT ALIAS as "alias" FROM registered_users ru
			LEFT JOIN USER_LEVEL ul on ru.USER_LEVEL = ul.id WHERE ru.EDIPI = :0`,[edipi],dbSelectOptions)
	
			if(result.rows.length > 0){//user is registered.
				return REGISTERED_USERS_VIEW[result.rows[0].alias].edit
			}
		}
		return false//user is not registered.
	}catch(err){
		console.log(err)
	}  finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}	
}