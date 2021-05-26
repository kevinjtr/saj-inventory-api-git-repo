const certUtils = require('./utils/certUtils');
//const env = require('../config/main').env;

const usaceCertMiddleware = function (req, res, next) {
  if(typeof req.connection.getPeerCertificate ==='function') {
    if (req.connection.getPeerCertificate()!=='(null)' &&  typeof req.connection.getPeerCertificate()!=='undefined') {
      const cert=  req.connection.getPeerCertificate();
      if(typeof cert !== 'undefined') {
        let certObj = {};
        certObj.originalcert= cert.toString('utf8');
        certObj.cert= cert.toString('utf8');
        if(typeof cert.subject !== 'undefined') {
          const cn = certUtils.getCN(cert);
          if(cn) {
            certObj.cn = cn;
            const edipi = certUtils.getEdipi(cert);
            certObj.edipi = edipi;
          }else{
            certObj ={};
          }  
        }else{
          certObj ={};
        }
        //certObj.edipi =1
        //console.log(certObj)
        req.headers.cert = certObj;
      }
    }
  }
  next();
};

module.exports = usaceCertMiddleware;

// req.cert = {
//       originalcert: privateInfo.certInfo.original,
//       cert: privateInfo.certInfo.cert,
//       edipi: privateInfo.certInfo.edipi,
//       cn: privateInfo.certInfo.cn
//     }