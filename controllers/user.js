/* eslint-disable no-process-env */
// src/routes/users.js

const express = require('express');
const Controller= express.Router();
const validate = require('express-validation');
const validation = require('./validation/');
const jwt = require('jsonwebtoken');
const logger = require('../services/logger');

const allowedEDIPI=[1544978469, 1503957074];
async function getUser(req, res) {
  
  if(req.headers.cert && req.headers.cert.edipi) {
    try {
      //console.log(allowedEDIPI.includes(req.headers.cert.edipi))
      if (allowedEDIPI.includes(req.headers.cert.edipi)) {
        console.log('User entered website :' + req.headers.cert.cn);
        const myToken = jwt.sign({user:{canUpload:true}}, process.env.SECRET);   // {algorithms: ['RS512']}
        res.status(200).json(myToken);
      }else{
        const myToken = jwt.sign({user:{canUpload:false}}, process.env.SECRET);   // {algorithms: ['RS512']}
        res.status(200).json(myToken);
      }      
    } catch(err) {
      res.status(500).send(err);
    }
  }else{
    console.log('user requested from non secure source');
    res.status(502).send('UNKNOWN HOST REQUEST');
  }  
}
Controller.route('/?')
  .get(validate(validation.user), getUser);

module.exports = Controller;
