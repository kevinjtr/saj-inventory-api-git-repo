'use strict';

module.exports = function(app) {
	const controllers = require('../controllers/users');
	//!REGISTER
	app.route('/register').post(controllers.register);
	//!LOGIN USER
	app.route('/login').post(controllers.login);
	//!POST USER
	// app.route('/post').post(controllers.verifyToken, controllers.post);
};
