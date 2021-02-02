'use strict';

exports.ok = function(values, res) {
	const data = {
		status: 200,
		values: values
	};
	res.json(data);
	res.end();
};

exports.get = function(results, res) {
	const data = {
		status: 200,
		error: false,
		message: 'Successfully get single data!'
	};
	res.json(data);
	res.end();
};
