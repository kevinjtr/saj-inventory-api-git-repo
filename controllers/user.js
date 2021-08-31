//const oracledb = require('oracledb');
//const dbConfig = require('../dbconfig.js');
//const {dbSelectOptions} = require('../config/db-options');
const {rightPermision} = require('./validation/tools/user-database');

exports.user = async (req,res) => {

  const edit_rights = await rightPermision(req.headers.cert.edipi)
  
  if(edit_rights){
    return res.status(200).json({
			status: 200,
			level: 'admin',
			editable: edit_rights
		});
  }

  return res.status(200).json({
    status: 200,
    level: 'user',
    editable: edit_rights
  });
}

/* eslint-disable no-process-env */
// src/routes/users.js

// const express = require('express');
// const Controller= express.Router();
// const validate = require('express-validation');
// const validation = require('./validation/');
// const jwt = require('jsonwebtoken');
// const logger = require('../services/logger');

// const allowedEDIPI=[1544978469, 1503957074];
// async function getUser(req, res) {
  
//   CONSOLE.LOG('USER ENTERED WEBSITE.')
//   if(req.headers.cert && req.headers.cert.edipi) {
//     try {
//       //console.log(allowedEDIPI.includes(req.headers.cert.edipi))
//       if (allowedEDIPI.includes(req.headers.cert.edipi)) {
//         console.log('User entered website :' + req.headers.cert.cn);
//         const myToken = jwt.sign({user:{canUpload:true}}, process.env.SECRET);   // {algorithms: ['RS512']}
//         res.status(200).json(myToken);
//       }else{
//         const myToken = jwt.sign({user:{canUpload:false}}, process.env.SECRET);   // {algorithms: ['RS512']}
//         res.status(200).json(myToken);
//       }      
//     } catch(err) {
//       res.status(500).send(err);
//     }
//   }else{
//     console.log('user requested from non secure source');
//     res.status(502).send('UNKNOWN HOST REQUEST');
//   }  
// }
// Controller.route('/?')
//   .get(validate(validation.user), getUser);

// module.exports = Controller;
