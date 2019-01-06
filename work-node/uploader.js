const AWS = require('aws-sdk');
const fs = require('fs');
const globals = require('./globals');
const config = require('./config');
const tools = require('./../libs/tools');
if(globals.env == 'prod')
AWS.config.loadFromPath('./../libs/aws-prod.json');
else
AWS.config.loadFromPath('./../libs/aws.json');
const s3 = new AWS.S3();

var Uploader = function (workNode) {

    var self = {
        inited: false,
        workNode: workNode,
        db: workNode.db,
        workingObjects: {}
    };

    self.checkQueueFirstTime = function () {
        console.log('Uploader checkQueueFirstTime');
        self.checkQueueBase(['converted', 'uploading']);
    };

    self.checkQueue = function () {
        console.log('Uploader checkQueue');
        self.checkQueueBase(['converted']);
    };

    self.checkQueueBase = function (checkSteps) {
        self.db.getReceivedFiles(checkSteps, function (rows) {
            for (var index = 0; index < rows.length; index++) {
                var element = rows[index];
                if (self.workingObjects[element.uuid] == true) continue;
                self.workingObjects[element.uuid] = true;
                self.db.updateFileStep(element.uuid, 'uploading', '', 0,
                    (function () {
                        self.uploadItem(this.element);
                        self.workNode.statusUpdate({uuid:this.element.uuid, status:'uploading'});
                    }).bind({ element: element })
                );
            }
        });
    }

    self.uploadItem = function (item) {
        console.log('Uploader uploadItem');
        var start = process.hrtime();

        //TODO remove if exist

        var myBucket = config.app.awsUploadBucket;
        var myKey = item.uuid + '/' + tools.replaceFileExt(item.file, item.format);
        var outFile = config.app.uploadDir + myKey;

        fs.readFile(outFile, function (err, data) {
            if (err) { throw err; }

            var params = { Bucket: myBucket, Key: myKey, Body: data };

            s3.putObject(params, function (err, data) {
                var seconds = tools.parseHrtimeToSeconds(process.hrtime(start));
                if (err) {
                    console.log('Uploader error:' + err + '\n Time: ' + seconds);
                    self.db.updateFileStep(item.uuid, 'error', 'Uploader error:' + err + '\n Time: ' + seconds, 0, function () {
                        delete self.workingObjects[item.uuid];
                        self.workNode.statusUpdate({uuid:item.uuid, status:'error', data:'Uploading error. Try again'});
                    });
                } else {
                    console.log("Uploader: Successfully uploaded. UID: " + item.uuid + " "+ myKey + " Time: " + seconds);
                    self.db.updateFileStep(item.uuid, 'uploaded', '', 0, function () {
                        delete self.workingObjects[item.uuid];
                        self.workNode.statusUpdate({uuid:item.uuid, status:'uploaded'});
                    });
                    //Remove local file
                    var uploadDir = config.app.uploadDir + item.uuid + '/';
                    var uploadFile = uploadDir + item.file;
                    var convertedFile = uploadDir + tools.replaceFileExt(item.file, item.format);
                    if (fs.existsSync(uploadFile)) {
                        fs.unlinkSync(uploadFile);
                    }
                    if (fs.existsSync(convertedFile)) {
                        fs.unlinkSync(convertedFile);
                    }
                    if (fs.existsSync(uploadDir)) {
                        fs.rmdirSync(uploadDir);
                    }
                }

            });

        });

    };

    self.init = function (params) {
        console.log('Uploader init');
    };

    self.init();

    return self;
}

module.exports = Uploader;