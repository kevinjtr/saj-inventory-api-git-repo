const csv = require('../tools/csv-parser/csv-to-json');
const {registered_users_all_cols} = require('../config/queries')
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const filter = require('lodash/filter');
const {dbSelectOptions} = require('../config/db-options');

const AUTH_DB_POPULATE_USERS = [1544978469]

exports.index = async function(req, res) {
    const edipi = req.headers.cert.edipi
    let connection
    try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

        if (typeof edipi !== 'undefined') {

            let result =  await connection.execute(registered_users_all_cols,{},dbSelectOptions)
    
            if(result.rows.length > 0){//user is registered.
                const users = filter(result.rows,function(r){ return AUTH_DB_POPULATE_USERS.includes(r.EDIPI)})
                if(users.length > 0){
                    csv.run()
                }
            }
        }
    
        return res.status(200).json({
            message: 'Successfully started DB Populate',
        });
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
};