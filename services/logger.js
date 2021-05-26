const fs = require('fs');
const path = require('path');
const dateFns =require('date-fns');
const { createLogger, format, transports } = require('winston');
const forIn = require('lodash/forIn');
// const  { combine, label, printf } = format;

const timestamp = format((info, opts) => {
  const time= dateFns.format(new Date(), 'MM/DD/YYYY HH:mm:ss [GMT]ZZ');
  info.time = time;
  return info;
});

// const Elasticsearch = require('winston-elasticsearch');

const { combine, printf } = format;

const myFormat = printf(({ level, message, time }) => {
  return `${time} ${level}: ${message}`;
});
const logFiles={
  all:path.join(__dirname, './logs/inventory-all.log'),
  error:path.join(__dirname, './logs/inventory-error.log')
};

forIn(logFiles, function (value) {
  if (!fs.existsSync(value)) {
    fs.closeSync(fs.openSync(value, 'wx'));
  }
});


const logger = createLogger({
  format: combine(
    timestamp(),
    myFormat
  ),
  transports: [
    // new Elasticsearch({
    //   name: 'es-log',
    //   level: 'info',
    //   clientOpts: {
    //     host: 'http://192.168.17.141:9200'
    //   }
    // }),
    new transports.Console({
      name: 'console-log',
      level: 'debug'
    }),
    new transports.File({
      name: 'debug-log',
      filename:logFiles.all,
      maxsize: 1000000,
      maxFiles: 5,
      level: 'debug'
    }),
    new transports.File({
      name: 'verbose-log',
      filename:logFiles.all,
      maxsize: 1000000,
      maxFiles: 5,
      level: 'verbose'
    }),
    new transports.File({
      name: 'error-log',
      filename: logFiles.error,
      maxsize: 1000000,
      maxFiles: 5,
      level: 'error'
    })
  ]
});

module.exports = logger;
