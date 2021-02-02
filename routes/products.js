'use strict';

module.exports = function(app) {
	const controller = require('../controllers/products');
	const userController = require('../controllers/users');
	//!GET
	app.route('/products').get(controller.allProducts);
	app.route('/products').get(controller.products);
	app.route('/products/:id').get(controller.getId);
	//!POST
	//app.route('/products').post(userController.verifyToken, controller.add);
	app.route('/products').post(controller.add);
	//!PATCH || UPDATE
	//app.route('/products/:id/add=:number').patch(userController.verifyToken, controller.addProducts);
	//app.route('/products/:id/reduce=:number').patch(userController.verifyToken, controller.reduceProducts);
	//app.route('/products/:id').patch(userController.verifyToken, controller.update);
	//app.route('/products/:id').delete(userController.verifyToken, controller.destroy);
	app.route('/products/:id/add=:number').patch(controller.addProducts);
	app.route('/products/:id/reduce=:number').patch(controller.reduceProducts);
	app.route('/products/:id').patch(controller.update);
	app.route('/products/:id').delete(controller.destroy);
};