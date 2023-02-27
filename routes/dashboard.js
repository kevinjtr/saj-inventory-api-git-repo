'use strict';

module.exports = function(app) {
	const controller = require('../controllers/dashboard');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/dashboard').get(usersController.verifyToken, controller.index);
    //app.route('/updatesmaintenancemessages').get(usersController.verifyToken,controller.index);
};
