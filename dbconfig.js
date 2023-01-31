require('dotenv').config();

module.exports = {
    user: process.env.DB_USER,
  
    // Get the password from the environment variable
    // NODE_ORACLEDB_PASSWORD.  The password could also be a hard coded
    // string (not recommended), or it could be prompted for.
    // Alternatively use External Authentication so that no password is
    // needed.
    password: process.env.DB_PASSWORD,
  
    poolMin: 10,
    poolMax: 10,
    poolIncrement: 0,
    // For information on connection strings see:
    // https://oracle.github.io/node-oracledb/doc/api.html#connectionstrings
    //DB_HOST
    //DB_PORT
    //DB_SID=
    connectString: "saj-ora-db05.saj.usace.army.mil:1521/K3CMAPP1.saj.usace.army.mil",
  
    // Setting externalAuth is optional.  It defaults to false.  See:
    // https://oracle.github.io/node-oracledb/doc/api.html#extauth
    externalAuth: false
  };