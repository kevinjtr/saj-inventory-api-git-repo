'use strict';
require('dotenv').config();


const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {registered_users} = require('../config/queries')
const {propNamesToLowerCase, tokenHasEditPermision} = require('../tools/tools')
const certTools = require('../middleware/utils/cert-tools');
const path = require('path')
const multer  = require('multer')
const upload = multer({ dest: path.join(__dirname,'../public/') })
const DB_NOT_READ = false
const jwt = require('jsonwebtoken');
const {REGISTERED_USERS_VIEW} = require('../config/constants');

const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};

const EDIT_ROUTES = ['add','update','destroy','upload']

const includesAnyEditRoutes = (str) => {
	let flag = false
	EDIT_ROUTES.map(elem => {
		if(str.includes(elem))
			flag = true
	})
	return flag
}

const tokenIsAuthorized = (decoded_token, path) => {
	const {user} = decoded_token
	const route_to_access = path.split('/').filter(Boolean)[0].replace(/-/g, "")

	if(includesAnyEditRoutes(path)){//is edit route
		if(REGISTERED_USERS_VIEW.hasOwnProperty(user.level)){
			if(REGISTERED_USERS_VIEW[user.level].hasOwnProperty(route_to_access)){
				return REGISTERED_USERS_VIEW[user.level][route_to_access].edit
			}
			return user.level == "admin"
		}		
	}

	if(REGISTERED_USERS_VIEW.hasOwnProperty(user.level)){//is view route
		if(REGISTERED_USERS_VIEW[user.level].hasOwnProperty(route_to_access)){
			return REGISTERED_USERS_VIEW[user.level][route_to_access].view
		}
		return user.level == "admin"
	}
	
	console.log('SOMETHING WENT WRONG WHILE VERIFYING TOKEN ACCESS!')
	return false
}

//!LOGIN USERS
exports.login = async (req, res) => {
	const edipi = req.headers && req.headers.cert && req.headers.cert.edipi
	let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
		let user = {
			id: 'n/a',
			name: 'guest',
			level: 'user'
		}

		if(edipi){
			if(typeof req.headers.cert != 'undefined' && Object.keys(req.headers.cert).length > 0) {
				await certTools.UpdateUserAccessHistory(req.headers.cert)
			}

			if(DB_NOT_READ){
				user = {
					id: 1,
					name: "Kevin Alemany",
					level: "admin",
					level_name: "Administrator",
					access: Object.keys(REGISTERED_USERS_VIEW).includes("admin") ? REGISTERED_USERS_VIEW["admin"] : REGISTERED_USERS_VIEW.user_1,
					notifications: 1,
					district_office: "CESAJ-EN-DG"
				};

				const token_exp = Math.floor(Date.now() / 1000) + (60 * 60 * 12)//12hrs

				jwt.sign({ user: user, exp: token_exp}, process.env.SECRET_KEY, (err, token) => {
					res.json({
						token: token,
						user: user.level,
						level_name:user.level_name,
						user_name: user.name,
						exp: token_exp,
						access: user.access,
						message: 'Login success.',
						district_office: user.district_office,
						notifications: user.notifications
					});
				});

				return;
			}

			let result =  await connection.execute(`${registered_users} where edipi = :0`,[edipi],dbSelectOptions)

			if(result.rows.length > 0){
				result.rows = propNamesToLowerCase(result.rows)
				const {id, updated_by_full_name, user_level, user_level_alias, user_level_name, user_district_office, notifications} = result.rows[0]
				user = {
					id: id,
					level_num: user_level,
					name: updated_by_full_name,
					level: user_level_alias,
					level_name: user_level_name,
					access: Object.keys(REGISTERED_USERS_VIEW).includes(user_level_alias) ? REGISTERED_USERS_VIEW[user_level_alias] : REGISTERED_USERS_VIEW.user_1,
					notifications: notifications,
					district_office: user_district_office
				};

				const token_exp = Math.floor(Date.now() / 1000) + (60 * 60 * 12)//12hrs

				jwt.sign({ user: user, exp: token_exp}, process.env.SECRET_KEY, (err, token) => {
					res.json({
						token: token,
						user: user.level,
						level_num: user.level_num,
						level_name:user.level_name,
						user_name: user.name,
						exp: token_exp,
						access: user.access,
						message: 'Login success.',
						district_office: user.district_office,
						notifications: user.notifications
					});
				});

				return;
			}	
		}

		res.status(200).json({
			token: '',
			user: '',
			user_name: '',
			exp: '',
			access: {},
			message: 'User account was not found.'
		});
		
	}catch(err){
		if (err) throw err;

		res.status(400).json({
			token: '',
			user: '',
			user_name: '',
			exp: '',
			access: {},
			message: 'A server error occured.'
		});
	}  finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}	
};


exports.verifyUser = async (req, res, next) => {
	//! Get auth header value
	const {edipi} = req.headers.cert;
	let connection
	try{
		const {changes} = req.body.params
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

		if (typeof edipi !== 'undefined') {
			let result =  await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0',[edipi],dbSelectOptions)
	
			if(result.rows.length > 0){
				console.log(`Succesfully identified user: ${edipi}!`);
				req.user = result.rows[0].ID
				req.user_level_num = result.rows[0].USER_LEVEL
				next();
				return;
			}
		}

		//! Forbidden
		res.status(400).send({message:'Forbiden call!!'});

	}catch(err){
		console.log(err)
	} finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}	
};

exports.verifyToken = async (req, res, next) => {
	//! Get auth header value
	const bearerToken = req.headers.auth;

	if (typeof bearerToken !== 'undefined') {
		req.token = bearerToken;
		//! Next middleware
		
		jwt.verify(req.token, process.env.SECRET_KEY, (err,decode) => {

			if (err) {
				res.send('Access denied!!');
			} else {
				
				if(tokenIsAuthorized(decode, req.path)){
					req.user = decode.user.id
					req.decode = decode
					const edit_rights = tokenHasEditPermision(decode, req.path)
					req.edit_rights = edit_rights
					req.user_level_alias = decode.user.level					
					req.user_level_num = decode.user.level_num
					next();
				}else{
					console.log('not authorized')
				}
			}
		});

		return;
	}
	//else {
		//! Forbidden
		//res.send('Please login to access app!!');
	//}

	res.status(400).send('Please login to access app!!');
};

exports.verifyTokenAndBufferUpload = async function post(req, res, next) {
	try {
		
	// const form = formidable({ multiples: true, uploadDir: __dirname });

	// form.parse(req, (err, fields, files) => {
	// console.log('fields:', fields);
	// console.log('files:', files);
	// });

	//   const maxFileSize = 1024 * 1024 * 50; // 50MB; OCI limit is 1 GB unless streaming
	//   let contentBuffer = [];
	//   let totalBytesInBuffer = 0;
	//   let contentType = req.headers['content-type'] || 'application/octet';
	//   let fileName = req.headers['x-file-name'];
  
	//   if (fileName === '') {
	// 	res.status(400).json({error: `The file name must be 
	// 						  passed to the via x-file-name header`});
	// 	return;
	//   }

	//console.log('here')
	//   const form = new IncomingForm();
	//   form.multiples = false
	//   form.maxFileSize = 10 * 1024 * 1024 //10mb
	//   form.uploadDir = path.join(__dirname,'../public')

	//   form.parse(req, (err, fields, files) => {
	// 	  console.log(files)
	// 	if (err) {
	// 		res.status(400).json({error: `something went wrong`});
	// 	  return;
	// 	}
	// 	res.json({ fields, files });
	//   });
  
	//   req.on('data', chunk => {
	// 	  console.log('on data')
	// 	contentBuffer.push(chunk);
	// 	totalBytesInBuffer += chunk.length;
  
	// 	if (totalBytesInBuffer > maxFileSize) {
	// 		console.log('error')
	// 	  req.pause();
  
	// 	  res.header('Connection', 'close');
	// 	  res.status(413).json({error: `The file size exceeded the 
	// 							limit of ${maxFileSize} bytes`});
  
	// 	  req.connection.destroy();
	// 	}
	//   });
  
	//   req.on('end', async function() {
	// 	contentBuffer = Buffer.concat(contentBuffer, totalBytesInBuffer);
		
	// 	try {
	// 		req.upload = {fileName: fileName, contentType: contentType, contentBuffer: contentBuffer}
	// 	  //const fileId = await files.create(fileName, contentType, contentBuffer);
  
	// 	  console.log('here before next.')
	// 	  next();
	// 	//   res.status(201).json({fileId: fileId});
	// 	} catch (err) {
	// 	  console.log(err);
  
	// 	  res.header('Connection', 'close');
	// 	  res.status(500).json({error: 'Oops, something broke!'});
  
	// 	  req.connection.destroy();
	// 	}
	//   });
	} catch (err) {
		res.send('error on the api side');
	}
}

exports.userAccessInsert = async (req, res) => {

	if(typeof req.headers.cert != 'undefined' && Object.keys(req.headers.cert).length > 0) {
		const success = await certTools.insertUserAccessHistory(req.headers.cert)

		if(success){
			return res.send('success: your credentials have been recorded.')
		}
	}

	return res.send('error: your credentials have not been recorded.')
}