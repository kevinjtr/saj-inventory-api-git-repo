'use strict';

const response = require('../response');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
//const connection =  oracledb.getConnection(dbConfig);
//const connection = require('../connect');


const dbSelectOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
    // extendedMetaData: true,               // get extra metadata
    // prefetchRows:     100,                // internal buffer allocation size for tuning
    // fetchArraySize:   100                 // internal buffer allocation size for tuning
	};

//! sortBy || sort || limit || pagenation || seacrh
exports.allProducts = async function(req, res) {
	const sortBy = req.query.sortBy || 'id';
	const sort = req.query.sort || 'ASC';
	const limit = req.query.limit || 5;
	const page = (req.query.page - 1) * limit || 0;
	const search = req.query.search;

	const connection =  await oracledb.getConnection(dbConfig);

	let query =
		'SELECT p.id as id, p.product_name as product_name, p.description as description, p.image as image, c.name as category, p.quantity as quantity, p.date_added as date_added, p.date_updated as date_updated from products p INNER JOIN categories c ON c.id = p.id_category ';
	if (search != null && search != '') {
		//console.log(`search: '${search}'`)
		//query += ' AND product_name like "%' + search + '%"';
	}
	query += ' ORDER BY ' + sortBy + ' ' + sort + ' OFFSET ' + page + ' ROWS FETCH NEXT ' + limit + ' ROWS ONLY ';

	console.log(query)
	try{
		let result =  await connection.execute(query, {}, dbSelectOptions)
		result.rows = result.rows.map(function(r){
			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
			return r;
		})
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully',
			data: result.rows
		});

	}catch(err){
		console.log('allProducts',err);
	}
	



	// let query =
	// 	'SELECT id, product_name, description, image, (select name from categories where products.id_category = categories.id) as category, quantity, date_added, date_updated from products ';
	// if (search != null) {
	// 	query += ' WHERE product_name like "%' + search + '%"';
	// }
	// query += ' ORDER BY ' + sortBy + ' ' + sort + ' limit ' + page + ', ' + limit;


	// connection.query(query, function(err, results) {
	// 	if (err) {
	// 		console.log(err);
	// 	} else {
	// 		res.status(200).json({
	// 			status: 200,
	// 			error: false,
	// 			message: 'Successfully',
	// 			data: results
	// 		});
	// 	}
	// });
};

//!GET ALL DATA PRODUCTS
exports.products = async function(req, res) {

	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute('SELECT * FROM products', {}, dbSelectOptions)
		result.rows = result.rows.map(function(r){
			r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
			return r;
		})
		response.ok(result.rows, res);

	}catch(err){
		console.log('products',err);
	}
	


	// connection.query('SELECT * FROM products', function(error, rows, f ields) {
	// 	if (error) {
	// 		console.log(error);
	// 	} else {
	// 		response.ok(rows, res);
	// 	}
	// });
};

//!GET DATA PRODUCTS BY ID
exports.getId = async function(req, res) {

	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(`SELECT * FROM products WHERE id = :0`,[req.params.id],dbSelectOptions)
		if (result.rows.length > 0) {
			result.rows = result.rows.map(function(r){
				r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				return r;
			})
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully get data products by id!',
				data: result.rows
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'No data found!'
			});
		}
	}catch(err){
		console.log('getId',err);
	}

	// connection.query('SELECT * FROM `products` WHERE `id` = ?', req.params.id, function(err, results, fields) {
	// 	if (err) {
	// 		console.log(err);
	// 	} else {
	// 		if (results.length > 0) {
	// 			res.status(200).json({
	// 				status: 200,
	// 				error: false,
	// 				message: 'Successfully get data products by id!',
	// 				data: results
	// 			});
	// 		} else {
	// 			res.status(400).json({
	// 				status: 400,
	// 				error: true,
	// 				message: 'No data found!'
	// 			});
	// 		}
	// 	}
	// });
};

//!INSERT DATA PRODUCTS
exports.add = async function(req, res) {
	// const name = req.body.name ? req.body.name : 'no data' || ternary operator
	// const desc = req.body.desc ? req.body.desc : 'no data'
	// const price = req.body.price ? req.body.price : 'no data'
	const { product_name, description, image, id_category, quantity, date_added, date_updated } = req.body;
	const connection =  await oracledb.getConnection(dbConfig);

	try{
		let result =  await connection.execute(`INSERT INTO products (product_name, description, image, id_category, quantity, date_added, date_updated) values (:0, :1, :2, :3, :4, :5, :6)`,[ product_name, description, image, id_category, quantity, date_added, new Date() ],{autoCommit:true})
		
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Successfully add new data!',
			data: req.body
		});
		
	}catch(err){
		console.log('add',err);

		res.status(400).json({
			status: 400,
			message: 'Error add new data!'
		});
	}

	// connection.query(
	// 	'INSERT INTO `products` (product_name, description, image, id_category, quantity, date_added, date_updated) values (?, ?, ?, ?, ?, ?, ?)',
	// 	[ product_name, description, image, id_category, quantity, date_added, new Date() ],
	// 	function(err, results) {
	// 		if (err) {
	// 			console.log(err);
	// 			res.status(400).json({
	// 				status: 400,
	// 				message: 'Error add new data!'
	// 			});
	// 		} else {
	// 			res.status(200).json({
	// 				status: 200,
	// 				error: false,
	// 				message: 'Successfully add new data!',
	// 				data: req.body
	// 			});
	// 		}
	// 	}
	// );
};


const arrayOfEng4900sObjects = [{ID:9,REQUESTED_ACTION:2,LOSING_HRA:941,GAINING_HRA:982,EQUIPMENT_GROUP_ID:1,DATE_CREATED: new Date('09-JAN-2020'),FOLDER_LINK:'somelink'},
{ID:10,REQUESTED_ACTION:2,LOSING_HRA:982,GAINING_HRA:941,EQUIPMENT_GROUP_ID:5,DATE_CREATED: new Date('09-JAN-2020'),FOLDER_LINK:'somelink'}]

for(const eng4900 of arrayOfEng4900sObjects){
	UpdateEquipmentGroupFunction(eng4900)
}

async function UpdateEquipmentGroupFunction(data){
//for now save new euipment group data into a json file.
}

//!UPDATE DATA PRODUCTS
exports.update = async function(req, res) {
	const { product_name, description, image, id_category, quantity, date_added, date_updated } = req.body;
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		if (!product_name || !description || !image || !id_category || !quantity || !date_added) {
			res.status(300).json({
				status: 300,
				error: true,
				message:
					'product_name, description, image, id_category, quantity, date_added, date_updated needed for update!'
			});
		} else {

		}

		let result =  await connection.execute(`UPDATE products SET product_name = :0, description = :1, image = :2, id_category = :3, quantity = :4, date_added = :5, date_updated = :6 where id = :7`,[ product_name, description, image, id_category, quantity, date_added, new Date(), req.params.id ],{autoCommit:true})
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully update data with id: ' + req.params.id,
				data: req.body
			});
	}catch(err){
		console.log('update',err);
	}

	// if (!product_name || !description || !image || !id_category || !quantity || !date_added) {
	// 	res.status(300).json({
	// 		status: 300,
	// 		error: true,
	// 		message:
	// 			'product_name, description, image, id_category, quantity, date_added, date_updated needed for update!'
	// 	});
	// } else {
	// 	connection.query(
	// 		'UPDATE `products` SET product_name = ?, description = ?, image = ?, id_category = ?, quantity = ?, date_added = ?, date_updated = ? where id = ?',
	// 		[ product_name, description, image, id_category, quantity, date_added, new Date(), req.params.id ],
	// 		function(err, results) {
	// 			if (err) {
	// 				console.log(err);
	// 			} else {
	// 				res.status(200).json({
	// 					status: 200,
	// 					error: false,
	// 					message: 'Successfully update data with id: ' + req.params.id,
	// 					data: req.body
	// 				});
	// 			}
	// 		}
	// 	);
	// }
};

//!DELETE DATA PRODUCTS
exports.destroy = async function(req, res) {
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`DELETE from products WHERE id = :0`,[req.params.id ],{autoCommit:true})
		if (result.rowsAffected > 0) {
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Successfully delete data with id: ' + req.params.id
			});
		} else {
			res.status(400).json({
				status: 400,
				error: true,
				message: 'Cannot delete data with id: ' + req.params.id
			});
		}
	}catch(err){
		console.log('destroy',err);
	}

	// connection.query('DELETE from `products` WHERE `id` = ?', [ req.params.id ], function(err, results) {
	// 	if (err) {
	// 		console.log(err);
	// 	} else {
	// 		if (results.affectedRows > 0) {
	// 			res.status(200).json({
	// 				status: 200,
	// 				error: false,
	// 				message: 'Successfully delete data with id: ' + req.params.id
	// 			});
	// 		} else {
	// 			res.status(400).json({
	// 				status: 400,
	// 				error: true,
	// 				message: 'Cannot delete data with id: ' + req.params.id
	// 			});
	// 		}
	// 	}
	// });
};

//! ADD QUANTITY PRODUCTS
exports.addProducts = async function(req, res) {
	let number = req.params.number;
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`UPDATE products set quantity = quantity + ${number} where id = :0`,[ req.params.id  ],{autoCommit:true})
		res.status(200).json({
			status: 200,
			error: false,
			message: 'Quantity successfully added ' + number + ' at : ' + req.params.id
		});
	}catch(err){
		console.log('addProducts',err);
	}
	
	// connection.query(
	// 	'UPDATE products set quantity = quantity + ' + number + ' where id = ?',
	// 	[ req.params.id ],
	// 	function(err, results) {
	// 		if (err) {
	// 			console.log(err);
	// 		} else {
	// 			res.status(200).json({
	// 				status: 200,
	// 				error: false,
	// 				message: 'Quantity successfully added ' + number + ' at : ' + req.params.id
	// 			});
	// 		}
	// 	}
	// );
};

//!REDUCE QUANTITY PRODUCTS
exports.reduceProducts = async function(req, res) {

	let number = req.params.number;
	const connection =  await oracledb.getConnection(dbConfig);
	try{
		let result =  await connection.execute(`UPDATE products set quantity = GREATEST(quantity - ${number}, 0) where id = :0 and quantity >=  ${number}`,[ req.params.id ],{autoCommit:true})
		if (result.rowsAffected == 0) {
			result.rows = result.rows.map(function(r){
				r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				return r;
			})
			res.status(400).json({
				status: 400,
				error: true,
				message: 'Cannot reduce ' + number + ', Number must be lower than quantity'
			});
		} else {
			res.status(200).json({
				status: 200,
				error: false,
				message: 'Quantity successfully reduced ' + number + ' at id products: ' + req.params.id
			});
		}
	}catch(err){
		console.log('reduceProducts',err);
	}

	// connection.query(
	// 	'UPDATE products set quantity = GREATEST(quantity - ' + number + ' ,0) where id = ? and quantity >=' + number,
	// 	[ req.params.id ],
	// 	function(err, results) {
	// 		if (err) {
	// 			console.log(err);
	// 		} else {
	// 			if (results.affectedRows == 0) {
	// 				res.status(400).json({
	// 					status: 400,
	// 					error: true,
	// 					message: 'Cannot reduce ' + number + ', Number must be lower than quantity'
	// 				});
	// 			} else {
	// 				res.status(200).json({
	// 					status: 200,
	// 					error: false,
	// 					message: 'Quantity successfully reduced ' + number + ' at id products: ' + req.params.id
	// 				});
	// 			}
	// 		}
	// 	}
	// );
};
