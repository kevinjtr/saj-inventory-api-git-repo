'use strict';

module.exports = function(app) {
	const controller = require('../controllers/registered-users');
	const usersController = require('../controllers/users');

	//GET REGISTERED USER
	app.route('/registered-users/getByEDIPI/:edipi').get(usersController.verifyToken,controller.getByEDIPI);

	//POST REGISTERED USER
	app.route('/registered-users/add').post(usersController.verifyToken,controller.add);

	app.route('/registered-users/notifications/:active').post(usersController.verifyToken,controller.notifications);
};
