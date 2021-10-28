'use strict';

module.exports = function(app) {
	const controller = require('../controllers/eng4900');
	const usersController = require('../controllers/users');

	//!GET
	//app.route('/eng4900').get(controller.index);

	app.route('/eng4900/:id').get(usersController.verifyUser,controller.getById);
	app.route('/eng4900/pdf/:id').get(usersController.verifyUser,controller.getPdfById);
	app.route('/eng4900/search2').post(usersController.verifyUser,controller.search2);
	app.route('/eng4900/upload').post(usersController.verifyUser, controller.upload);

	//app.route('/eng4900/testpdf').post(controller.testPdfBuild);
	//!POST
	app.route('/eng4900/add').post(usersController.verifyUser, controller.add);
	app.route('/eng4900/update').post(usersController.verifyUser, controller.update);
	//app.route('/eng4900').post(controller.add);
	//!PATCH
	//app.route('/eng4900/:id').patch(usersController.verifyToken, controller.update);
	//app.route('/eng4900/:id').patch(controller.update);
	//!DELETE
	//app.route('/eng4900/:id').delete(usersController.verifyToken, controller.destroy);
	//app.route('/eng4900/:id').delete(controller.destroy);
};
