'use strict';

module.exports = function(app) {
	const controller = require('../controllers/register');

	app.route('/register/division').get(controller.division);
	app.route('/register/district').get(controller.district);
	app.route('/register/officeSymbol').get(controller.officeSymbol);
	app.route('/register/userType').get(controller.userType);

};
