'use strict';

module.exports = function (app) {
    const controller = require('../controllers/authorized-users');
    const usersController = require('../controllers/users');


    //GET
    app.route('/authorizedusers').get(usersController.verifyToken, controller.index);
    // app.route('/authorizedusers/getNames').get(usersController.verifyToken,controller.getNames);
    // app.route('/authorizedusers/getHRAs').get(usersController.verifyToken,controller.getHRAs);
    // app.route('/authorizedusers/getAuthorizedUsers').get(usersController.verifyToken,controller.getHRAs);
    //POST
    app.route('/authorizedusers/add').post(usersController.verifyToken,controller.add);
   // app.route('/authorizedusers/update').post(usersController.verifyUser, controller.update);
    app.route('/authorizedusers/delete').post(usersController.verifyToken,controller.delete);
};
