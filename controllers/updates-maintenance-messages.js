'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {propNamesToLowerCase} = require('../tools/tools');
const {dbSelectOptions} = require('../config/db-options');
const fs = require('fs');

//!SELECT * FROM UPDATES_MAINTENANCE_MESSAGES
exports.index = async function(req, res) {
	try{
		fs.readFile('./public/updates-maintenance-messages.json', (err, data) => {
			if (err){
				res.status(400).json({
					status: 400,
					error: true,
					message: 'Successfully get single data!',
					data: []
				});

				throw err;
			} 
			let messages = JSON.parse(data);
			console.log(messages);

			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get single data!',
				data: messages
			});
		});

        
	}catch(err){
		console.log(err)
		res.status(400).json({
			status: 400,
			error: true,
			message: 'No data found!',
			data: []
        });
        
	}
};
 


