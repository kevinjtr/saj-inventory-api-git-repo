const x509 = require('x509.js');

module.exports = {
  parseCert: function (encodedCertRaw) {
    let encodedCert = encodedCertRaw;
    const beginCert = '-----BEGIN CERTIFICATE----- ';
    const endCert = ' -----END CERTIFICATE-----';
    encodedCert = encodedCert.replace(beginCert, '');
    encodedCert = encodedCert.replace(endCert, '');
    encodedCert = encodedCert.replace(/ /g, '\n');
    encodedCert = beginCert.trim() + '\n' + encodedCert + endCert.trim() + '\n';
    return x509.parseCert(encodedCert);
  },
  getEdipi: function (decodedCert) {
    return Number(decodedCert.subject.CN.substr(-10));
  },
  getCN: function (decodedCert) {
    return decodedCert.subject.CN;
  }
};
