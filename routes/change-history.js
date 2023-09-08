'use strict';

module.exports = function(app) {
    //const controller = require('../controllers/change-history');
    
    const controller = require('../controllers/change-history');
	const usersController = require('../controllers/users');

	//!GET
	//app.route('/eng4844').get(controller.index);

	//app.route('/eng4844/:id').get(controller.getById);
	
	app.route('/change-history/equipment/:id').get(controller.equipment);
    app.route('/change-history/hra/:hra_num').get(usersController.verifyToken,controller.hra);
    app.route('/change-history/employee/:id').get(usersController.verifyToken,controller.employee);
    app.route('/change-history/eng4900/:id').get(usersController.verifyToken,controller.eng4900);
	app.route('/change-history/annualinventory/:id').get(usersController.verifyToken,controller.annualInventory);

	app.route('/change-history').post(usersController.verifyToken,controller.index);
	
	
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
