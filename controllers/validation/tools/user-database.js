const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');
const {dbSelectOptions} = require('../../../config/db-options');

exports.rightPermision = async (edipi) => {
	const connection =  await oracledb.getConnection(dbConfig);

	if (typeof edipi !== 'undefined') {
		let result =  await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)

        if(result.rows.length > 0){//user is registered.
            connection.close()
			return true
		}
	}

    connection.close()
	return false//user is not registered.
}