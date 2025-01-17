require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.SERVER_PORT;
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const csv = require('./tools/csv-parser/csv-to-json')
const fileUpload = require('express-fileupload');
const dbConfig = require('./dbconfig.js');
const oracledb = require('oracledb');
const crypto = require("crypto");
const crypto_orig_createHash = crypto.createHash;
crypto.createHash = algorithm => crypto_orig_createHash(algorithm == "md4" ? "sha256" : algorithm);

let usaceCertMiddleware;

if (process.env.NODE_ENV === 'development') {
	app.use(cors());
	usaceCertMiddleware = require('./middleware/usace-cert-middleware');
} else {
	//var methods = ["log", "debug"];
    //for(var i=0;i<methods.length;i++){
        //console[methods[i]] = function(){};
    //}
	
	usaceCertMiddleware = require('./middleware/usace-cert-middleware_apache');
}


//!parse application/x-www-form-urlencoded
app.use(
	bodyParser.urlencoded({
		extended: true
	})
);
//! parse application/json
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(usaceCertMiddleware);
app.use(fileUpload({
	limits: { fileSize: 5 * 1024 * 1024 },//5mb
  }));
//app.use(cors());

// app.use((req, res, next) => {
// 	res.header('Acces-Control-Allow-Origin', 'http://192.168.43.83');
// 	res.header('Access-Controll-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
// 	if (req.method === 'OPTIONS') {
// 		res.header('Access-Controll-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
// 		res.ok().json({});
// 	}
// 	next();
// });

const usersRoutes = require('./routes/users');
const handleError = require('./routes/routes');
const equipmentRoutes = require('./routes/equipment');
const eng4900Routes = require('./routes/eng4900');
const employee = require('./routes/employee');
const hra = require('./routes/hra');
const officeSymbol = require('./routes/office-symbol');
const conditionRoutes = require('./routes/condition');
//const eng4844Routes = require('./routes/eng4844');
const changeHistoryRoutes = require('./routes/change-history');
const annualInventoryRoutes = require('./routes/annual-inventory');
const dbPopulateRoutes = require('./routes/db-populate.js');
const user = require('./routes/user');
const register = require('./routes/register');
const problem = require('./routes/problem');
const authorizedUsers = require('./routes/authorized-users');
const registeredUsers = require('./routes/registered-users');
const dashboard = require('./routes/dashboard');
const account = require('./routes/account');

usersRoutes(app);
handleError(app);
equipmentRoutes(app);
eng4900Routes(app);
employee(app);
hra(app);
officeSymbol(app);
conditionRoutes(app);
//eng4844Routes(app);
changeHistoryRoutes(app)
annualInventoryRoutes(app)
dbPopulateRoutes(app)
user(app)
register(app)
problem(app)
authorizedUsers(app)
registeredUsers(app)
dashboard(app)
account(app)

const adminPool = oracledb.createPool(dbConfig);

Promise.all([adminPool]).then(function(pools){
	console.info(`Created ${pools[0].poolAlias} Pool`);

	if (process.env.HTTPS === 'true') {
		const fs = require('fs');
		const https = require('https');
		const httpsOptions = {
			key: fs.readFileSync(path.join(__dirname, 'private/server.key')),
			cert: fs.readFileSync(path.join(__dirname, 'private/server.cert')),
			requestCert: true,
			rejectUnauthorized: false
		};
		const httpsServer = https.createServer(httpsOptions, app);
		httpsServer.timeout = 240000;
		httpsServer.listen(port);
		console.info(`Server is listening on https://localhost:${port}`);
		//csv.run()
	} else {
		
		const http = require('http');
		const httpServer = http.createServer(app);
		httpServer.timeout = 240000;
		httpServer.listen(port);
		console.info(`Server is listening on http://localhost:${port}`);
	}
})