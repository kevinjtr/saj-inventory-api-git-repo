'use strict';

module.exports = function(app) {
	const controller = require('../controllers/excess-equipment');
	const usersController = require('../controllers/users');

	//!GET
	app.route('/excessequipment').get(usersController.verifyToken,controller.index);

};