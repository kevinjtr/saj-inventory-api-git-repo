'use strict';

module.exports = function(app) {
    //const controller = require('../controllers/change-history');
    
    const controller = require('../controllers/change-history');

	//const usersController = require('../controllers/users');

	//!GET
	//app.route('/eng4844').get(controller.index);

	//app.route('/eng4844/:id').get(controller.getById);
	
	app.route('/change-history/equipment/').get(controller.equipment);
    app.route('/change-history/hra/').get(controller.hra);
    app.route('/change-history/employee/').get(controller.employee);
    app.route('/change-history/eng4900/').get(controller.eng4900);
    //app.route('/change-history/eng4844/').get(controller.eng4844);

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
