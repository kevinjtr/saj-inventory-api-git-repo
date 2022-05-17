'use strict';

module.exports = function(app) {
	const controller = require('../controllers/employee');
	const controller2 = require('../controllers/employee2');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/employee').get(usersController.verifyToken,controller.index);
	app.route('/employee/:id').get(usersController.verifyToken,controller.getById);
	app.route('/employee/search').post(usersController.verifyToken,controller.search);
	app.route('/employee2').get(usersController.verifyToken,controller2.index);
	app.route('/employee2/add').post(usersController.verifyToken,controller2.add);
	app.route('/employee2/getByEDIPIWithOffice').get(usersController.verifyToken,controller2.getByEDIPIWithOffice);

	//!POST
	//app.route('/employee').post(usersController.verifyToken, controller.add);
	app.route('/employee/add').post(usersController.verifyToken,controller.add);
	app.route('/employee/update').post(usersController.verifyToken,controller.update);
	app.route('/employee/destroy').post(usersController.verifyToken,controller.destroy);
	
	//!PATCH
	//app.route('/employee/:id').patch(usersController.verifyToken, controller.update);

	//!DELETE
	//app.route('/employee/:id').delete(usersController.verifyToken, controller.destroy);

};
