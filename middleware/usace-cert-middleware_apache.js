const certUtils = require('./utils/certUtils_apache');

const usaceCertMiddleware = function (req, res, next) {
  if(req.get('SSL_CLIENT_CERT')!=='(null)' && typeof req.get('SSL_CLIENT_CERT') !== 'undefined') {
    const header = req.get('SSL_CLIENT_CERT');
    const cert = certUtils.parseCert(header);
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
      req.headers.cert = certObj;
    }
  }
  next();
};

module.exports = usaceCertMiddleware;

// DEV CRED
// req.cert = {
//       originalcert: privateInfo.certInfo.original,
//       cert: privateInfo.certInfo.cert,
//       edipi: privateInfo.certInfo.edipi,
//       cn: privateInfo.certInfo.cn
//     }
