'use strict';

module.exports = function(app) {
	const controller1 = require('../controllers/register');
	const controller2 = require('../controllers/registration-viewer');
	const usersController = require('../controllers/users');

	//app.route('/register/division').get(controller.division);
	//app.route('/register/district').get(controller.district);
	//app.route('/register/officeSymbol').get(controller.officeSymbol);
	//app.route('/register/userType').get(controller.userType);
	//app.route('/register/registrationDropDownData').get(controller.registrationDropDownData);

	//POST REGISTRATION
	app.route('/register/add').post(controller1.add);

	//GET REGISTRATION
	app.route('/registrationviewer').get(usersController.verifyToken, controller2.index);
    app.route('/registrationviewer/destroy').post(usersController.verifyToken, controller2.destroy);

};
