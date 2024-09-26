require('dotenv').config();

module.exports = {
    user: process.env.DB_USER,
    poolAlias:'ADMIN',
    password: process.env.DB_PASSWORD,
    poolTimeout:30,
    queueTimeout:60000,
    poolMin: 10,
    poolMax: 10,
    connectString: process.env.DB_CONNECT_STRING,
  };