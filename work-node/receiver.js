const FormData = require("form-data");
const multiparty = require("multiparty");
const fs = require("fs");
const tools = require('./../libs/tools');
const config = require('./config');

var Receiver = function (params) {

    var self = {
        app: params.app,
        db: params.db,
        onReceiveCallback: null
    };

    self.onReceive = function (callbackFunction) {
        self.onReceiveCallback = callbackFunction;
    }

    self.proccessCount = function () {
        //TODO consider free streams depends on uploading capacity
        return 0;
    }

    self.errorsCheck = function(file, errors) {
        
        var error = '';

        if (!tools.haveExt(file.name)) {
            error = 'Input file must have an extension';
            errors.push(error);
            console.error(file.uuid + ' error: ' + error);
            return;
        }

        if (tools.getExt(file.name) == file.toFormat) {
            error = 'Input file is the same as the output file';
            errors.push(error);
            console.error(file.uuid + ' error: ' + error);
            return;
        }

        var inExt = tools.getExt(file.name);
        var outExt = file.toFormat;
        var inAllowed = config.tools[file.fromType+'In'];
        var outAllowed = config.tools[file.fromType+'Out'];

        if(inAllowed != '*' && inAllowed.indexOf(inExt) == -1) {
            error = '\'' + inExt + '\' file type not supported';
            errors.push(error);
            console.error(file.uuid + ' error: ' + error);
            return;
        } 
        if(outAllowed.indexOf(outExt) == -1) {
            error = 'Output .' + outExt + ' file type not supported';
            errors.push(error);
            console.error(file.uuid + ' error: ' + error);
            return;
        } 

        if (file.size > config.app.maxFileSize) {
            error = 'File [buy]size limit[/buy] is ' + (config.app.maxFileSize / 1024 / 1024) + ' MB';
            errors.push(error);
            console.error(file.uuid + ' error: ' + error);
            return;
        }

    }

    self.logTime = function(time, label) {
        var elapsedTimeSec = tools.parseHrtimeToSeconds(process.hrtime(time));
        console.log(label + elapsedTimeSec);
    };

    self.init = function (params) {
        console.log('Receiver init');

        self.app.get('/', function (req, res) {
            //res.send('Work node' + "<br><form action='/upload' method='post' enctype='multipart/form-data'><input type='file' name='thumbnail' /><input type='submit' value='Submit' /></form>");
            res.send('test');
        });

        self.app.post("/upload", function (req, res, next) {

            //TODO Long time uploading check

            console.log('Receiver upload');
            var startTime = process.hrtime();

            var form = new multiparty.Form();
            
            var errors = [];

            var uuid = req.headers['uuid'];
            var fromType = req.headers['type'];
            var toFormat = req.headers['format'];
            var uploadDir = config.app.uploadDir + uuid + '/';

            var uploadFile = { name: '', path: '', type: '', size: 0 };
            uploadFile.fromType = fromType;
            uploadFile.toFormat = toFormat;

            var out, filePart;

            console.log('to format: ' + req.headers['format']);

            form.on('close', function () {
                console.log('Receiver close');

                self.errorsCheck(uploadFile, errors);

                if (errors.length == 0) {
                    self.db.addToQueue(uuid, fromType, toFormat, uploadFile.name, function () {
                        if (self.onReceiveCallback != null) self.onReceiveCallback();
                    });

                    var size = uploadFile.size;
                    var url = config.app.awsDownloadPath + uuid + '/' + tools.replaceFileExt(uploadFile.name, toFormat);

                    res.send({
                        name: uploadFile.name,
                        format: toFormat,
                        uuid: uuid,
                        size: size,
                        url: url,
                        status: config.workSteps.received
                    });
                } else {
                    if(filePart) filePart.resume();
                    if(out) out.close();
                    //FIXME sometimes cannot delete dir (((
                    if (fs.existsSync(uploadFile.path)) {
                        fs.unlinkSync(uploadFile.path);
                        if (fs.existsSync(uploadDir)) {
                            fs.rmdirSync(uploadDir);
                        }
                    }
                    res.send({
                        name: uploadFile.name,
                        format: toFormat,
                        uuid: uuid,
                        error: errors.join('. '),
                        size: uploadFile.size,
                        status: config.workSteps.error
                    });
                }
                self.logTime(startTime, 'Receive time ' + uuid + ': ');
            });

            form.on('part', function (part) {
                console.log('Receiver part');
                uploadFile.size = part.byteCount;
                uploadFile.type = part.headers['content-type'];
                uploadFile.name = tools.sanitaziFileName(part.filename);
                uploadFile.path = uploadDir + tools.sanitaziFileName(part.filename);

                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir);
                }

                if (errors.length == 0) {
                    filePart = part;
                    out = fs.createWriteStream(uploadFile.path);
                    part.pipe(out);
                } else {
                    console.log('Receiver form.on part errors: ' + errors);
                    part.resume();
                }
            });

            form.on('error', function (err) {
                console.log('Receiver error');
                if(filePart) filePart.resume();
                if(out) out.close();
                if (fs.existsSync(uploadFile.path)) {
                    fs.unlinkSync(uploadFile.path);
                    if (fs.existsSync(uploadDir)) {
                        fs.rmdirSync(uploadDir);
                    }
                }
                self.logTime(startTime, 'Receive time error ' + uuid + ': ');
            });

            form.on('aborted', function (err) {
                console.log('Receiver aborted');
                if(filePart) filePart.resume();
                if(out) out.close();
                if (fs.existsSync(uploadFile.path)) {
                    fs.unlinkSync(uploadFile.path);
                    if (fs.existsSync(uploadDir)) {
                        fs.rmdirSync(uploadDir);
                    }
                }
                self.logTime(startTime, 'Receive time aborted ' + uuid + ': ');
            });

            form.parse(req);
        });

    };

    self.init();

    return self;
}

module.exports = Receiver;