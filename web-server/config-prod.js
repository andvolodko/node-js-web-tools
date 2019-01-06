var app = {
    port: 8000,
    nodeStatusUpdateTime: 1000,
    streamReserveTime: 10000,
    deleteFileTimeSec: 86400,
    updateFilesDataTimeMSec: 5000,
    awsUploadBucket: 'files.benstoolset.com',
    useMinifiedCSS:true,
    useMinifiedJS:true,
    jsVersion: 7,
    cssVersion: 7
}
var minifyConfig = {
    collapseWhitespace:true,
    removeComments:true,
    minifyCSS:true,
    minifyJS:true,
    processScripts: ['application/ld+json'],
    processConditionalComments: true
};
var authGoogle = {
    clientID: "**.apps.googleusercontent.com",
    clientSecret: "***",
    callbackURL: "https://benstoolset.com/auth/google/callback",
    passReqToCallback: true
}

var authFacebook = {
    clientID: '***',
    clientSecret: '****',
    callbackURL: 'https://benstoolset.com/login/facebook/return',
    profileFields: ['id', 'email', 'name', 'picture'],
    passReqToCallback: true
}
var workNodes = [
    {
        server:'https://testserver.org:11000/',
        expCoef: 1,
        performance:'high'
    }
]
var mysqlParams = {
    host: 'localhost',
    user: 'root',
    password: '*',
    database: 'dbase'
}
module.exports.app = app;
module.exports.minifyConfig = minifyConfig;
module.exports.authGoogle = authGoogle;
module.exports.authFacebook = authFacebook;
module.exports.workNodes = workNodes;
module.exports.mysqlParams = mysqlParams;