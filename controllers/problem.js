'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const AUTO_COMMIT = {ADD:true,UPDATE:true,DELETE:false}
const moment = require('moment')


//INSERT PROBLEM
exports.add = async function(req, res) { 
	const connection =  await oracledb.getConnection(dbConfig);
	const edipi = req.headers.cert.edipi
	const today = moment(new Date()).format('MM-DD-yyyy').toString()

	try{
		// Verify the request
		if(req.body.params.hasOwnProperty("newData")){
			const {newData} = req.body.params
			
			if(newData.message){
				let insertQuery = `INSERT INTO PROBLEMS_REPORTED (date_reported,message,edipi,resolved,deleted) VALUES (TO_DATE('${today}','MM-DD-yyyy'),'${newData.message}','${edipi}','No','No')`
				let insertResult = await connection.execute(insertQuery,{},{autoCommit:AUTO_COMMIT.ADD})

				if(insertResult.rowsAffected > 0){
					return res.status(200).json({
						status: 200,
						error: false,
						message: 'Feedback has been submitted.',
					});
				}
		
			}

	}
	res.status(200).json({
				status: 200,
				error: false,
				message: 'No action taken'
			});
	}
	catch(err){
		console.log(err);
		res.status(200).json({
			status: 400,
			error: true,
			message: 'Error adding new data.'
		});
	}  
};
