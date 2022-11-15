'use strict';

module.exports = function(app) {
	const controller = require('../controllers/account');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/account').get(usersController.verifyToken,controller.index);

	//!POST
	app.route('/account/update').post(usersController.verifyToken,controller.update);

};
