'use strict';

module.exports = function(app) {
	const controller = require('../controllers/equipment');
	const usersController = require('../controllers/users');
	//const {validate} = require('express-validation');
	//const validation = require('./validation/');

	//!GET
	app.route('/equipment').get(usersController.verifyToken,controller.index);
	app.route('/equipment/form').get(usersController.verifyToken,controller.form);

	app.route('/equipment/:id').get(usersController.verifyToken,controller.getById);

	app.route('/equipment/search').post(usersController.verifyToken,controller.search);
	//!POST
	//app.route('/equipment').post(usersController.verifyToken, controller.add);
	app.route('/equipment/add').post(usersController.verifyToken,controller.add);
	//!PATCH
	//app.route('/equipment/:id').patch(usersController.verifyToken, controller.update);
	app.route('/equipment/update').post(usersController.verifyToken,controller.update);
	//!DELETE
	//app.route('/equipment/:id').delete(usersController.verifyToken, controller.destroy);
	app.route('/equipment/destroy').post(usersController.verifyToken,controller.destroy);
};
