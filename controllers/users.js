'use strict';
require('dotenv').config();


const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {user_rights} = require('../config/queries')
const {propNamesToLowerCase} = require('../tools/tools')

// 	// here the query is executed
//    });
//const connection = require('../connect');
/* This function saves a user to the db
	It uses promises.
 */
const jwt = require('jsonwebtoken');


const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};
	

//!LOGIN USERS
exports.login = async (req, res) => {
	const edipi = req.headers.cert.edipi
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let user = {
			id: 'n/a',
			name: 'guest',
			level: 'user'
		}

		if(edipi){
			let result =  await connection.execute(`${user_rights} where edipi = :0`,[edipi],dbSelectOptions)

			if(result.rows.length > 0){
				result.rows = propNamesToLowerCase(result.rows)

				//console.log(result)
				user = {
					id: result.rows[0]['id'],
					name: result.rows[0]['updated_by_full_name'],
					level: result.rows[0]['user_level'] == 1 ? 'admin' : 'user'
				};
			}	
		}

		//console.log(result,user)
		jwt.sign({ user: user }, process.env.SECRET_KEY, (err, token) => {
			res.json({
				token: token,
				user: user.level
			});
		});
	}catch(err){
		if (err) throw err;
		//logger.error(err)
	}

	// connection.query('SELECT * FROM users where email = ?', email, function(err, results) {
	// 	if (err) throw err;
	// 	var user = {
	// 		id: results[0]['id'],
	// 		name: results[0]['full_name'],
	// 		email: results[0]['email']
	// 	};
	// 	jwt.sign({ user: user }, process.env.SECRET_KEY, (err, token) => {
	// 		res.json({
	// 			token: token
	// 		});
	// 	});
	// });
};

// exports.post = (req, res) => {
// 	jwt.verify(req.token, 'secretkey', (err, authData) => {
// 		if (err) {
// 			res.sendStatus(403);
// 		} else {
// 			res.json({
// 				message: 'Post created...',
// 				authData
// 			});
// 		}
// 	});
// };
//!REGISTER USER
exports.register = async (req, res) => {
	// Mock user
	const { full_name, email, password } = req.body;
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute('INSERT into users (full_name, email, password) values (:0, :1, :2)',[ full_name, email, password ],{autoCommit:true})
		result.rows = result.rows.map(function(r){
			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
			return r;
		})
		res.status(200).json({
			status: 200,
			message: 'Succesfully Create New Users',
			data: {
				full_name: req.body.full_name,
				email: req.body.email
			}
		});
		
	}catch(err){
		console.log(err);
		res.status(400).json({
			status: 400,
			message: 'Error Create New Users'
		});
	}

	// connection.query(
	// 	'INSERT into users (full_name, email, password) values (?, ?, ?)',
	// 	[ full_name, email, password ],
	// 	function(err) {
	// 		if (err) {
	// 			console.log(err);
	// 			res.status(400).json({
	// 				status: 400,
	// 				message: 'Error Create New Users'
	// 			});
	// 		} else {
	// 			res.status(200).json({
	// 				status: 200,
	// 				message: 'Succesfully Create New Users',
	// 				data: {
	// 					full_name: req.body.full_name,
	// 					email: req.body.email
	// 				}
	// 			});
	// 		}
	// 	}
	// );
};

/* When the user from the front-end wants to use a function,
 The below code is an example of using the word authenticate to see if the
 user is actually authenticated
*/
// exports.getUser = (req, res) => {
// 	res.send(req.user);
// };

// FORMAT OF TOKEN
// Authorization: Bearer <access_token>

//! Verify Token

exports.verifyUser = async (req, res, next) => {
	//! Get auth header value
	const {edipi} = req.headers.cert;
	const connection =  await oracledb.getConnection(dbConfig);

	//console.log(req.headers.cert)
	if (typeof edipi !== 'undefined') {
		let result =  await connection.execute('SELECT * FROM USER_RIGHTS WHERE EDIPI = :0',[edipi],dbSelectOptions)
		connection.close()

		if(result.rows.length > 0){
			console.log(`Succesfully identified user: ${edipi}!`);
			req.user = result.rows[0].ID
			next();
			return;
		}
	}

	//! Forbidden
	res.status(400).send({message:'Forbiden call!!'});
	//console.log(connection.on())
};

exports.verifyToken = async function verifyToken(req, res, next) {
	//! Get auth header value
	const bearerToken = req.headers.auth;

	//! Check if bearer is undefined
	if (typeof bearerToken !== 'undefined') {
		req.token = bearerToken;
		//! Next middleware
		jwt.verify(req.token, process.env.SECRET_KEY, (err) => {
			if (err) {
				res.send('Access denied!!');
			} else {
				console.log('Succesfully!');
				next();
			}
		});
	} else {
		//! Forbidden
		res.send('Please login to access app!!');
	}
};
