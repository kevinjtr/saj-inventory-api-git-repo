'use strict';

module.exports = function(app) {
  const controller = require('../controllers/user');
  //const {validate} = require('express-validation');
  //const validation = require('./validation/');
  app.use('/user',controller);
};