'use strict';

module.exports = function(app) {
	const controller = require('../controllers/updates-maintenance-messages');
	//const usersController = require('../controllers/users');

	//!GET
	app.route('/updates_maintenance_messages').get(controller.index);
    //app.route('/updatesmaintenancemessages').get(usersController.verifyToken,controller.index);
};
