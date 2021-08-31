const fs = require('fs');
const path = require('path');

module.exports = {
  GET_PRIVATE_KEY:function () {
    const key = fs.readFileSync(path.join(__dirname, '../../private/dev.key'));
    return key;
  },
  GET_PUBLIC_KEY:function () {
    const key = fs.readFileSync(path.join(__dirname, '../../private/devcert.pem'));
    return key;
  }
};