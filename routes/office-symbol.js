'use strict';

module.exports = function(app) {
	const controller = require('../controllers/office-symbol');
	//!GET
	app.route('/officesymbol').get(controller.index);
	//app.route('/officesymbol2').get(controller.index2);
	app.route('/officesymbol/:id').get(controller.getById);
};
