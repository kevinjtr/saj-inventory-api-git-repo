'use strict';

module.exports = function(app) {
	const controller = require('../controllers/eng4900');
	//const usersController = require('../controllers/users');

	//!GET
	//app.route('/eng4900').get(controller.index);

	//app.route('/eng4900/:id').get(controller.getById);

	app.route('/eng4900/search').post(controller.search);
	//!POST
	//app.route('/eng4900').post(usersController.verifyToken, controller.add);
	//app.route('/eng4900').post(controller.add);
	//!PATCH
	//app.route('/eng4900/:id').patch(usersController.verifyToken, controller.update);
	//app.route('/eng4900/:id').patch(controller.update);
	//!DELETE
	//app.route('/eng4900/:id').delete(usersController.verifyToken, controller.destroy);
	//app.route('/eng4900/:id').delete(controller.destroy);
};
