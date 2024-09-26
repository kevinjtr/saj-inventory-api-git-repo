'use strict';

module.exports = function(app) {
	const controller = require('../controllers/controller');
	const route = process.env.NODE_ENV === "awslambda" ? '/hello' : '/'
	
	app.route(route).get(controller.index);
};
