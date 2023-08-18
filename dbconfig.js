require('dotenv').config();

module.exports = {
    user: process.env.DB_USER,
    poolAlias:'ADMIN',
    password: process.env.DB_PASSWORD,
    poolTimeout:30,
    queueTimeout:60000,
    poolMin: 10,
    poolMax: 10,
    connectString: "saj-ora-db05.saj.usace.army.mil:1521/K3CMAPP1.saj.usace.army.mil",
  };