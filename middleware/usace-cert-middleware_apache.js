const certUtils = require('./utils/certUtils_apache');
const certTools = require('./utils/cert-tools');

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

      // if(typeof certObj != 'undefined' && Object.keys(certObj).length > 0) {
      //   certTools.UpdateUserAccessHistory(certObj)
      // }
      
      req.headers.cert = certObj;
    }
  }
  next();
};

module.exports = usaceCertMiddleware;