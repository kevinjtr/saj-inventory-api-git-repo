
const verifyJWTToken = require('../services/jwtAuth');

module.exports = function verifyJWT(req, res, next) {
  const bearerHeader = req.headers.authorization;
  if(typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    verifyJWTToken(bearerToken)
      .then((decodedToken) => {
        req.headers.user = Object.assign({}, decodedToken.user);
        next();
      })
      .catch((err) => {
        res.status(400)
          .json({message: 'Invalid auth token provided.', err: err});
      });
  } else {
    res.status(400).json({message: 'Invalid auth token provided.'});
  }
};
