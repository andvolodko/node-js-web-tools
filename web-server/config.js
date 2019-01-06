var globals = require('./globals');
var configProd = require('./config-prod');
var sharedTools = require('./../libs/tools');
var sharedConfig = require('./../libs/config');

var app = {
    port: 8000,
    nodeStatusUpdateTime: 1000,
    streamReserveTime: 10000,
    deleteFileTimeSec: 86400,
    updateFilesDataTimeMSec: 5000,
    awsUploadBucket: 'test.testenvserver.org',
    useMinifiedCSS:false,
    useMinifiedJS:false,
    jsVersion: 3,
    cssVersion: 3
}
var minifyConfig = {
    /* collapseWhitespace:true,
    removeComments:true,
    minifyCSS:true,
    minifyJS:true,
    processScripts: ['application/ld+json'],
    processConditionalComments: true */
};
var workNodes = [
    {
        server: 'http://tools.testenvserver.org:10000/',
        expCoef: 1,
        performance: 'medium'
    }
    /*{
        server: 'http://tools.testenvserver.org:11000/',
        expCoef: 1,
        performance: 'medium'
    }*/
    
]

var mysqlParams = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'web_tools'
}

var ipsBlacklist = ['127.0.0.1'];
var ipsWhitelist = ['127.0.0.1', '192.168.0.102'];

var authGoogle = {
    clientID: "***",
    clientSecret: "*",
    callbackURL: "http://localhost:8000/auth/google/callback",
    passReqToCallback: true
}

var authFacebook = {
    clientID: '*',
    clientSecret: '*',
    callbackURL: 'http://localhost:8000/login/facebook/return',
    profileFields: ['id', 'email', 'name', 'picture'],
    passReqToCallback: true
}

var db = {
    config: null,
    menu: null,
    pages: null,
    news: null,
    keywords: null,
    searchQueries: null
}

//File processing steps
var fileSteps = {
    downloading: 'downloading',
    received: 'received',
    working: 'working',
    converted: 'converted',
    uploading: 'uploading',
    uploaded: 'uploaded',
    deleted: 'deleted',
    error: 'error'
}

module.exports.mysqlParams = mysqlParams;
module.exports.ipsBlacklist = ipsBlacklist;
module.exports.ipsWhitelist = ipsWhitelist;
module.exports.authGoogle = authGoogle;
module.exports.authFacebook = authFacebook;
module.exports.db = db;
module.exports.app = app;
module.exports.minifyConfig = minifyConfig;
module.exports.workNodes = workNodes;
module.exports.fileSteps = fileSteps;

if(globals.env == 'prod') {
    console.log('Load production config');
    sharedTools.inject(module.exports, configProd);
}
sharedTools.inject(module.exports, sharedConfig);

module.exports.app.port = globals.port;