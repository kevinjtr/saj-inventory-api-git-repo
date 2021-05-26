/* eslint-disable no-process-env */
const jwt  = require('jsonwebtoken');
const secrets=require('../middleware/utils/auth-key');

module.exports = function verifyJWTToken(token) {
  return new Promise((resolve, reject) => {
    const key = process.env.SECRET || secrets.GET_PUBLIC_KEY();
    // {algorithms: ['RS512']}
    jwt.verify(token, key, (err, decodedToken) => {
      if (err || !decodedToken) {
        return reject(err);
      }
      return resolve(decodedToken);
    });
  });
};
