const fs = require("fs");
var globals = require('./globals');
var configProd = require('./config-prod');
var sharedTools = require('./../libs/tools');
var sharedConfig = require('./../libs/config');

const mysqlParams = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'web_tools'
}

const ipsBlacklist = ['127.0.0.1'];
const ipsWhitelist = ['127.0.0.1', '192.168.0.102'];

const app = {
    streams:2,
    port: 10000,
    portHttps: 10001,
    statusRepeatTime:3000, //msec
    maxFileSize: 100 * 1024 * 1024, //Bytes, 100 - MB
    maxOutFileSize: 1000 * 1024 * 1024, //Bytes, 1000 - MB
    uploadDir: './files/',
    awsUploadBucket: 'test.testserv.org',
    awsDownloadPath: 'https://s3.us-east-2.amazonaws.com/test.testserv.org/',
    statusUrl: 'http://localhost:8000/status-update'
}

//File processing steps
const workSteps = {
    received: 'received',
    working: 'working',
    converted: 'converted',
    uploading: 'uploading',
    uploaded: 'uploaded',
    error: 'error'
}

const httpsOptions = {
    // key: fs.readFileSync("key.key"), // путь к ключу
    // cert: fs.readFileSync("cert.crt") // путь к сертификату
}

const copyrights = {
    remove: ['calibre 3.10.0'],
    add: 'WebTools.com 1.0'
}

module.exports.mysqlParams = mysqlParams;
module.exports.ipsBlacklist = ipsBlacklist;
module.exports.ipsWhitelist = ipsWhitelist;
module.exports.app = app;
module.exports.httpsOptions = httpsOptions;
module.exports.copyrights = copyrights;
module.exports.workSteps = workSteps;

if(globals.env == 'prod') {
    console.log('Load production config');
    sharedTools.inject(module.exports, configProd);
}
sharedTools.inject(module.exports, sharedConfig);