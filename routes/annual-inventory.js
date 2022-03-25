'use strict';

module.exports = function(app) {
	const controller = require('../controllers/annual-inventory');
	const usersController = require('../controllers/users');
	//const {validate} = require('express-validation');
	//const validation = require('./validation/');

	//!GET
	app.route('/annualinventory').get(usersController.verifyToken,controller.index);

	app.route('/annualinventory/:id').get(usersController.verifyToken,controller.getById);

	// app.route('/annualinventory/search').post(usersController.verifyToken,controller.search);
	//!POST
	//app.route('/equipment').post(usersController.verifyToken, controller.add);
	app.route('/annualinventory/add').post(usersController.verifyToken,controller.add);
	//!PATCH
	//app.route('/equipment/:id').patch(usersController.verifyToken, controller.update);
	app.route('/annualinventory/update').post(usersController.verifyToken,controller.update);
	//!DELETE
	//app.route('/equipment/:id').delete(usersController.verifyToken, controller.destroy);
	app.route('/annualinventory/destroy').post(usersController.verifyToken,controller.destroy);
};
