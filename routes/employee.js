'use strict';

module.exports = function(app) {
	const controller = require('../controllers/employee');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/employee').get(controller.index);

	app.route('/employee/:id').get(controller.getById);

	app.route('/employee/search').post(controller.search);
	//!POST
	//app.route('/employee').post(usersController.verifyToken, controller.add);
	app.route('/employee/add').post(usersController.verifyUser,controller.add);
	//!PATCH
	//app.route('/employee/:id').patch(usersController.verifyToken, controller.update);
	app.route('/employee/update').post(usersController.verifyUser,controller.update);
	//!DELETE
	//app.route('/employee/:id').delete(usersController.verifyToken, controller.destroy);
	app.route('/employee/destroy').post(usersController.verifyUser,controller.destroy);
};
