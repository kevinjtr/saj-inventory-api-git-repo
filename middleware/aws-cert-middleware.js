const aWsCertMiddleware = function (req, res, next) {
    req.headers.cert = {
      cn: 'ALEMANY.KEVIN.LUIS.1544978469',
      edipi: 1544978469,
    }

  next();
};

module.exports = aWsCertMiddleware;