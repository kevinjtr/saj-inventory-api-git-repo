'use strict';

module.exports = function(app) {
	
	const controller1 = require('../controllers/problem');
	const controller2 = require('../controllers/problem-report-viewer');
	const usersController = require('../controllers/users');

	//!POST
	app.route('/problem/add').post(controller1.add);

    //!GET
    app.route('/problem').get(usersController.verifyToken, controller2.index);
    app.route('/problem/update').post(usersController.verifyToken, controller2.update);
};
