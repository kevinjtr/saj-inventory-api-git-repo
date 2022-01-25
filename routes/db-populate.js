'use strict';

module.exports = function(app) {
	const controller = require('../controllers/db-populate');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/dbpopulate').get(usersController.verifyToken,controller.index);
};
