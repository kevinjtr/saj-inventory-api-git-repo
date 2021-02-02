'use strict';

module.exports = function(app) {
	const controller = require('../controllers/categories');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/categories').get(controller.index);

	app.route('/categories/:id').get(controller.getId);
	//!POST
	//app.route('/categories').post(usersController.verifyToken, controller.add);
	app.route('/categories').post(controller.add);
	//!PATCH
	//app.route('/categories/:id').patch(usersController.verifyToken, controller.update);
	app.route('/categories/:id').patch(controller.update);
	//!DELETE
	//app.route('/categories/:id').delete(usersController.verifyToken, controller.destroy);
	app.route('/categories/:id').delete(controller.destroy);
};
