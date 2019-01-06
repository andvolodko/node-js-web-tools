const app = {
    streams:2,
    port: 10000,
    portHttps: 10001,
    statusRepeatTime:3000, //msec
    maxFileSize: 100 * 1024 * 1024, //Bytes, 100 - MB
    maxOutFileSize: 1000 * 1024 * 1024, //Bytes, 1000 - MB
    uploadDir: './files/',
    awsUploadBucket: 'files.benstoolset.com',
    awsDownloadPath: 'https://s3.us-east-2.amazonaws.com/files.benstoolset.com/',
    statusUrl: 'https://benstoolset.com/status-update'
}

const copyrights = {
    remove: ['calibre 3.10.0'],
    add: 'BensToolset.com 1.0'
}

module.exports.app = app;
module.exports.copyrights = copyrights;