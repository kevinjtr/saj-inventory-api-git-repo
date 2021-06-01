'use strict';

module.exports = function(app) {
	const controller = require('../controllers/annual-inventory');
	const usersController = require('../controllers/users');
	//const {validate} = require('express-validation');
	//const validation = require('./validation/');

	//!GET
	app.route('/annualinventory').get(controller.index);

	app.route('/annualinventory/:id').get(controller.getById);

	app.route('/annualinventory/search').post(controller.search);
	//!POST
	//app.route('/equipment').post(usersController.verifyToken, controller.add);
	app.route('/annualinventory/add').post(usersController.verifyUser,controller.add);
	//!PATCH
	//app.route('/equipment/:id').patch(usersController.verifyToken, controller.update);
	app.route('/annualinventory/update').post(usersController.verifyUser,controller.update);
	//!DELETE
	//app.route('/equipment/:id').delete(usersController.verifyToken, controller.destroy);
	app.route('/annualinventory/destroy').post(usersController.verifyUser,controller.destroy);
};
