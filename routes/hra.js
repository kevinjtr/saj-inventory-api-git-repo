'use strict';

module.exports = function(app) {
	const controller = require('../controllers/hra');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/hra').get(controller.index);

	app.route('/hra/:id').get(controller.getById);

	app.route('/hra/search').post(controller.search);
	//!POST
	//app.route('/hra').post(usersController.verifyToken, controller.add);
	app.route('/hra/add').post(usersController.verifyUser,controller.add);
	//!PATCH
	//app.route('/hra/:id').patch(usersController.verifyToken, controller.update);
	app.route('/hra/update').post(usersController.verifyUser,controller.update);
	//!DELETE
	//app.route('/hra/:id').delete(usersController.verifyToken, controller.destroy);
	app.route('/hra/destroy').post(usersController.verifyUser,controller.destroy);
};
