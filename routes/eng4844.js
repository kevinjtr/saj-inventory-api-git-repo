'use strict';

module.exports = function(app) {
	const controller = require('../controllers/eng4844');
	//const usersController = require('../controllers/users');

	//!GET
	//app.route('/eng4844').get(controller.index);

	//app.route('/eng4844/:id').get(controller.getById);
	
	app.route('/eng4844/search').post(controller.search);
	app.route('/eng4844/funding').get(controller.funding);
	app.route('/eng4844/reportableControlCode').get(controller.reportableControlCode);
	app.route('/eng4844/condition').get(controller.condition);
	app.route('/eng4844/utilization').get(controller.utilization);
	app.route('/eng4844/classification').get(controller.classification);
	app.route('/eng4844/piliferableCode').get(controller.piliferableCode);
	app.route('/eng4844/logisticsControlCode').get(controller.logisticsControlCode);
	//!POST
	//app.route('/eng4844').post(usersController.verifyToken, controller.add);
	//app.route('/eng4844').post(controller.add);
	//!PATCH
	//app.route('/eng4844/:id').patch(usersController.verifyToken, controller.update);
	//app.route('/eng4844/:id').patch(controller.update);
	//!DELETE
	//app.route('/eng4844/:id').delete(usersController.verifyToken, controller.destroy);
	//app.route('/eng4844/:id').delete(controller.destroy);
};
