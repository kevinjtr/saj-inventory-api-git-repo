'use strict';

module.exports = function(app) {
	const controller = require('../controllers/problem');

	app.route('/problem/add').post(controller.add);
};
