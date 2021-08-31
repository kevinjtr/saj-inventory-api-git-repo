'use strict';

module.exports = function(app) {
	const controller = require('../controllers/condition');
	//!GET
	app.route('/condition').get(controller.index);
	//app.route('/officesymbol2').get(controller.index2);
	app.route('/condition/:id').get(controller.getById);
};
