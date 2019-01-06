var Uploader = function (websiteLocal) {
    var website = websiteLocal
        , app = websiteLocal.app
        , db = websiteLocal.dbManager
        , workNodeManager = websiteLocal.workNodeManager
        , globals = require('./globals')
        , config = require('./config')
        , userModel = require('./user')
        , tools = require('./tools')
        , libTools = require('./../libs/tools')
        , FormData = require("form-data")
        , request = require("request")
        , multiparty = require("multiparty")
        , AWS = require('aws-sdk')
        , uuidv1 = require('uuid/v1');

    if(globals.env == 'prod')
    AWS.config.loadFromPath('./libs/aws-prod.json');
    else 
    AWS.config.loadFromPath('./libs/aws.json');
    
    var s3 = new AWS.S3();

    var self = {
        inited: false,
        user: new userModel(websiteLocal),
        authSocial: website.authSocial,
        checkIntervalMs:60 * 1000 // 60 - sec
    };

    self.init = function (params) {
        console.log('Uploader init');

        setInterval(self.checkDeleteLimit, self.checkIntervalMs);

        app.get('/canupload', self.authSocial.parseUser, function (req, res) {
            var user = req.user;
            workNodeManager.canUpload(function (data) {
                res.send(data);
            }, user);
        });

        app.post('/status', self.authSocial.parseUser, function (req, res) {
            var user = req.user;
            if (req.body && req.body.ids) {
                db.getFilesStatus(user, req.body.ids, function (rows, err) {
                    //TODO Errors handling    
                    for (var index = 0; index < rows.length; index++) {
                        var element = rows[index];
                        if (element.status != config.fileSteps.uploaded) {
                            delete element.name;
                            delete element.new_size;
                        }
                        if (element.status == config.fileSteps.error) {
                            element.error = element.data;
                        }
                        delete element.id;
                        delete element.date;
                        delete element.server;
                        delete element.user;
                        delete element.type;
                        delete element.data;
                        delete element.worktime;
                        delete element.format;
                        delete element.size;
                        delete element.url;
                    }
                    res.send(rows);
                });
            }
        });

        //Query from work-node to update file status
        app.post('/status-update', function (req, res) {
            if(req.body.data) {
                req.body.data = self.textProccess(req.body.data);
            }
            db.updateFilesStatus(req.body, function (rows, err) {
                if (err) res.send({ status: 'error' });
                else {
                    res.send({ status: 'ok' });
                    if(req.body.status == config.fileSteps.uploaded) {
                        self.user.addExpForFile(req.body.uuid);
                    }
                }
            });
        });

        app.delete('/delete/*', self.authSocial.parseUser, function (req, res) {
            var uuid = req.url.split('/');
            uuid = uuid[2];
            var user = req.user;
            console.log('DELETE ' + uuid);
            db.getFile(user, uuid, function (rows, errors) {
                if (rows.length > 0) {
                    var file = rows[0];
                    self.deleteFile(file,
                        function(){
                            var body = {};
                            body[file.name] = true;
                            res.send(body);
                        },
                        function(){
                            var body = {};
                            body[file.name] = false;
                            res.send(body);
                        }
                    );
                    if(file.status != config.fileSteps.uploaded) {
                        var body = {};
                        body[file.name] = true;
                        res.send(body);
                        db.updateFilesStatus({
                            uuid:uuid,
                            status:config.fileSteps.deleted
                        });
                    }
                }
            });
        });

        app.post("/upload", self.authSocial.parseUser, function (httpRequest, httpResponse, next) {

            console.log('Uploader start upload');

            var user = httpRequest.user;
            var reservedStream = workNodeManager.getReservedStream(user);

            if (!reservedStream) {
                console.log('Uploader error: No reservedStream for user');
                self.sendError(httpResponse, 'No stream available');
                return;
            }

            var form = new multiparty.Form();
            var uuid = uuidv1();

            if (!httpRequest.headers['filename']) httpRequest.headers['filename'] = '';

            var fileDbData = {
                uuid: uuid,
                name: httpRequest.headers['filename'],
                type: httpRequest.headers['type'],
                format: httpRequest.headers['format'],
                size: 0,
                user: user.id,
                server: reservedStream,
                status: config.fileSteps.downloading,
                url: '',
                data: '',
                worktime: '0'
            };

            db.addFile(fileDbData, function () {

                form.on("part", function (part) {
                    if (part.filename) {

                        console.log('Uploader part sent');

                        var contentType = part.headers['content-type'];

                        var formData = {
                            file: {
                                value: part,
                                options: {
                                    filename: part.filename,
                                    contentType: contentType,
                                    knownLength: part.byteCount
                                }
                            }
                        };

                        var requestPost = request.post(
                            {
                                //url: "http://127.0.0.1:10000/upload",
                                url: reservedStream + "upload",
                                formData: formData,
                                strictSSL: false,
                                headers: {
                                    'type': httpRequest.headers['type'],
                                    'format': httpRequest.headers['format'],
                                    'uuid': uuid
                                }
                                // These may or may not be necessary for your server:
                                //preambleCRLF: true,
                                //postambleCRLF: true
                            },
                            function (err, res, body) {
                                console.log('Uploader done');
                                if (body) {
                                    var data = JSON.parse(body);
                                    data.deleteUrl = "/delete/" + uuid;
                                    if(data.error) {
                                        data.error = self.textProccess(data.error);
                                    }
                                    db.updateFile(data, function () { 
                                        httpResponse.send(data);
                                    });
                                } else {
                                    console.error('Uploader done null result');
                                    requestPost.abort();
                                    //httpResponse.status(403).end();
                                }
                            });
                    }
                });

                form.on("error", function (error) {
                    console.log('Uploader error: ' + error);
                    db.deleteFile(uuid);
                });

                form.parse(httpRequest);
            });

        });

        app.get('/upload/*', self.authSocial.parseUser, function (req, res) {
            var user = req.user;
            var type = req.url.split('/');
            type = type[2];
            type = type.split('?');
            type = type[0];
            db.getFiles(user, type, function (rows, errors) {
                for (var index = 0; index < rows.length; index++) {
                    var element = rows[index];
                    element.deleteUrl = "/delete/" + element.uuid;
                    if(element.status == config.fileSteps.error) {
                        element.error = element.data;
                    }
                    delete element.id;
                    delete element.date;
                    delete element.server;
                    delete element.user;
                    delete element.type;
                    delete element.data;
                    delete element.worktime;
                }
                res.send({ files: rows });
            });
        });
    };

    self.sendError = function (res, errorText) {
        console.error('Uploader error: ' + errorText);
        res.send({
            files: [
                {
                    error: errorText
                }
            ]
        });
    };

    self.deleteFile = function(file, successCallback = null, errorCallback = null) {
        if(file.status == config.fileSteps.uploaded) {
            var params = {
                Bucket: config.app.awsUploadBucket, 
                Delete: {
                 Objects: [
                    {Key: file.uuid + '/' + libTools.replaceFileExt(file.name, file.format)}, {Key: file.uuid}
                 ], 
                 Quiet: false
                }
               };
            s3.deleteObjects(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                    if(errorCallback != null) errorCallback();
                } else {
                    console.log('File deleted ' + file.uuid + '/' + libTools.replaceFileExt(file.name, file.format) );
                    db.updateFilesStatus({
                        uuid:file.uuid,
                        status:config.fileSteps.deleted
                    });
                    if(successCallback != null) successCallback();
                }
              });
        }
    };

    self.checkDeleteLimit = function (params) {
        db.getFilesByTime(config.app.deleteFileTimeSec, function (rows, err) {
            for (var index = 0; index < rows.length; index++) {
                var element = rows[index];
                self.deleteFile(element);
            }
        });
    };

    self.textProccess = function (text) {
        text = text.split('[buy]').join('<a href="/pricing" target="_blank">');
        text = text.split('[/buy]').join('</a>');
        return text;
    };

    self.init();

    return self;
}

module.exports = Uploader;