const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
require('dotenv').config();
//!Connect to Database ENV
const connect =  oracledb.getConnection(dbConfig);

// connect.connect(function(err) {
// 	if (err) throw err;
// });

module.exports = connect;
