'use strict';

module.exports = function(app) {
	const controller = require('../controllers/hra');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/hra').get(usersController.verifyToken,controller.index);
	app.route('/hra/form').get(usersController.verifyToken, controller.form);
	app.route('/hra/:id').get(usersController.verifyToken,controller.getById);
	app.route('/hra/search').post(usersController.verifyToken,controller.search);
	
	//!POST
	//app.route('/hra').post(usersController.verifyToken, controller.add);
	app.route('/hra/add').post(usersController.verifyToken,controller.add);
	//!PATCH
	//app.route('/hra/:id').patch(usersController.verifyToken, controller.update);
	app.route('/hra/update').post(usersController.verifyToken,controller.update);
	//!DELETE
	//app.route('/hra/:id').delete(usersController.verifyToken, controller.destroy);
	app.route('/hra/destroy').post(usersController.verifyToken,controller.destroy);
};
