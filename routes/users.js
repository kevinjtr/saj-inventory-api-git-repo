'use strict';

module.exports = function(app) {
	const controllers = require('../controllers/users');
	//!REGISTER
	//app.route('/register').post(controllers.register);
	//!LOGIN USER
	app.route('/login').get(controllers.login);
	app.route('/record-new-user').get(controllers.userAccessInsert);
	//!POST USER
	// app.route('/post').post(controllers.verifyToken, controllers.post);
};
