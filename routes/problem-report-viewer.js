'use strict';

module.exports = function (app) {
    const controller = require('../controllers/problem-report-viewer');
    const usersController = require('../controllers/users');


    //!GET
    app.route('/problemreportviewer').get(controller.index);

    app.route('/problemreportviewer/update').post(usersController.verifyUser, controller.update);

};