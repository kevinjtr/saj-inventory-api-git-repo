require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.SERVER_PORT;
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');

//!parse application/x-www-form-urlencoded
app.use(
	bodyParser.urlencoded({
		extended: true
	})
);
//! parse application/json
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

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
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const equipmentRoutes = require('./routes/equipment');
const eng4900Routes = require('./routes/eng4900');
const employee = require('./routes/employee');
const hra = require('./routes/hra');
const officeSymbol = require('./routes/office-symbol');
const eng4844Routes = require('./routes/eng4844');
const changeHistoryRoutes = require('./routes/change-history');

usersRoutes(app);
handleError(app);
productsRoutes(app);
categoriesRoutes(app);
equipmentRoutes(app);
eng4900Routes(app);
employee(app);
hra(app);
officeSymbol(app);
eng4844Routes(app);
changeHistoryRoutes(app)

app.listen(port);
console.log('Started');
