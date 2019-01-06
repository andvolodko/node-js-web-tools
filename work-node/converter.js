const exec = require('child_process').exec;
const fs = require('fs');
const config = require('./config');
const tools = require('./../libs/tools');
const diskspace = require('diskspace');

var Converter = function (workNode) {

    var self = {
        inited: false,
        checkIntervalMs:60 * 1000, // 60 - sec
        workNode: workNode,
        db: workNode.db,
        onConvertedCallback: null,
        workingObjects: {}
    };

    self.init = function (params) {
        console.log('Converter init');
        setInterval(self.checkTimeLimit, self.checkIntervalMs);
    };

    self.checkTimeLimit = function (params) {
        for(var uuid in self.workingObjects) {
            var value = self.workingObjects[uuid];
            var elapsedTimeSec = tools.hrTimeToSeconds(process.hrtime(value.time));
            var timeKey = value.type + 'TimeMin';
            var maxTimeSec = config.tools[timeKey] * 60;
            if(elapsedTimeSec > maxTimeSec) {
                console.warn('Converter checkTimeLimit: Time limit. Proccess killed: ' + uuid);
                value.error = '[buy]Time limit[/buy]';

                //Only for Windows
                //TODO Improve
                var cmd = '';
                if(value.type == 'document') {
                    cmd = 'taskkill /f /t /im soffice.bin';
                } else {
                    cmd = 'taskkill /f /t /pid ' + value.exec.pid;
                }
                var child = exec(cmd);
                child.stdout.on('data', (data) => {
                    console.warn('Converter checkTimeLimit: ' + data);
                });
                child.stderr.on('data', (data) => {
                    console.warn('Converter checkTimeLimit: ' + data);
                });
                child.on('close', (code) => {
                    console.warn('Converter checkTimeLimit: ' + code);
                });
            }
        }
    };

    //Checking for files after reboot or crash
    self.checkQueueFirstTime = function () {
        console.log('Converter checkQueueFirstTime');
        self.checkQueueBase(['received', 'working']);
    };

    //Checking for files after receiving
    self.checkQueue = function () {
        console.log('Converter checkQueue');
        self.checkQueueBase(['received']);
    };

    self.checkQueueBase = function (checkSteps) {
        self.db.getReceivedFiles(checkSteps, function (rows) {
            for (var index = 0; index < rows.length; index++) {
                var element = rows[index];
                var last = index >= rows.length - 1;
                if (!self.canConvert(element)) continue;
                self.workingObjects[element.uuid] = {
                    type: element.type,
                    time:0,
                    exec:null
                };
                self.db.updateFileStep(element.uuid, 'working', '', 0,
                    (function () {
                        self.convert(this.element);
                        self.workNode.statusUpdate({ uuid: element.uuid, name: element.file, status: 'working' });
                    }).bind({ element: element, last: last })
                );
                if (self.haveNotFreeStreams()) return;
            }
        });
    };

    self.canConvert = function (element) {
        //Checking for duplicates
        if (self.workingObjects[element.uuid]) return false;
        //Allow only one document convertion at a time
        var documentsCount = 0;
        for(var propt in self.workingObjects) {
            var value = self.workingObjects[propt];
            if(value.type == 'document') documentsCount++;
        }
        if(documentsCount > 0 && element.type == 'document') return false;
        return true;
    };

    self.haveNotFreeStreams = function () {
        return (Object.keys(self.workingObjects).length >= config.app.streams);
    };

    self.proccessCount = function () {
        return Object.keys(self.workingObjects).length;
    };

    //TODO check free space
    self.clearFilesFolder = function () {
        diskspace.check('C', function (err, result) {
            // result.total is how much the drive has totally.
            // result.used is how much of the drive is reported as used. On *nix this is straight from the df -k command, on Windows it's calculated from result.total - result.free
            // result.free is how much free space you have.
            // result.status isn't really that useful unless you want to debug.
        });
    };

    self.convert = function (item) {
        console.log('Converter convert');
        var start = process.hrtime();
        var result = '';
        var error = '';
        var cmdCommand = '';
        var inFile = '';
        var outFile = '';

        inFile = config.app.uploadDir + item.uuid + '/' + item.file;
        outFile = config.app.uploadDir + item.uuid + '/' + tools.replaceFileExt(item.file, item.format);
        var outDir = config.app.uploadDir + item.uuid;

        switch (item.type) {
            case 'ebook': case 'images':
                cmdCommand = config.tools[item.type] + ' "' + inFile + '" "' + outFile + '"';
                break;
            case 'video': case 'audio':
                cmdCommand = config.tools[item.type] + '  -i "' + inFile + '" -qscale 0 -crf 20 "' + outFile + '" -loglevel warning';
                break;
            case 'document':
                var appPath = config.tools[item.type];
                cmdCommand = '"' + appPath + '" --headless --nofirststartwizard --invisible --convert-to ' + item.format + ' --outdir "' + outDir + '" "' + inFile + '"';
                break;
        }

        var child = exec(cmdCommand);

        self.workingObjects[item.uuid].time = start;
        self.workingObjects[item.uuid].exec = child;

        console.log('UUID ' + item.uuid);
        console.log('Exec: ' + cmdCommand);

        result += 'UUID ' + item.uuid + "\r\n";
        result += "Exec: " + cmdCommand + "\r\n";

        child.stdout.on('data', function (data) {
            //console.log(data);
            result += data;
        });

        child.stderr.on('data', (data) => {
            //console.log(data);
            error += data;
        });

        child.on('close', function (exitCode) {

            self.replace(item, outFile, function (replaceError) {

                var fileSizeInBytes = 0;
                if (fs.existsSync(outFile)) {
                    var stats = fs.statSync(outFile);
                    fileSizeInBytes = stats.size;
                }

                var secondsText = tools.parseHrtimeToSeconds(process.hrtime(start));
                var worktimeSec = tools.hrTimeToSeconds(process.hrtime(start));
                if (exitCode > 0 || fileSizeInBytes <= 0 || fileSizeInBytes > config.app.maxOutFileSize) {
                    console.log('UUID ' + item.uuid + ' Error. ' + item.file + ' Time: ' + secondsText + '; exitCode: ' + exitCode);
                    console.error(result);
                    console.error(error);
                    self.db.updateFileStep(item.uuid, 'error', result + '\n' + error, worktimeSec, function () {
                        var errorText = 'Convertion error';
                        if(self.workingObjects[item.uuid].error) {
                            errorText += '. ' + self.workingObjects[item.uuid].error;
                        }
                        delete self.workingObjects[item.uuid];
                        self.checkQueue();
                        self.workNode.statusUpdate({ uuid: item.uuid, status: 'error', worktime:worktimeSec, data: errorText });
                    });
                    fs.rename(config.app.uploadDir + item.uuid, config.app.uploadDir + item.uuid + '-error', function (err) {
                        if (err) {
                            return console.log(err);
                        }
                        fs.writeFile(config.app.uploadDir + item.uuid + '-error/log.txt', result + '\n' + error);
                        console.log("Error log file was saved!");
                    });
                } else {
                    console.log('UUID ' + item.uuid + ' Done. ' + item.file + ' Time: ' + secondsText + '; exitCode: ' + exitCode);
                    self.db.updateFileStep(item.uuid, 'converted', '', worktimeSec, function () {
                        delete self.workingObjects[item.uuid];
                        if (self.onConvertedCallback != null) self.onConvertedCallback();
                        self.checkQueue();
                        self.workNode.statusUpdate({ uuid: item.uuid, status: 'converted', new_size: fileSizeInBytes, worktime:worktimeSec });
                    });
                }

            });
        });
    };

    self.onConverted = function (callbackFunction) {
        self.onConvertedCallback = callbackFunction;
    };

    self.replace = function searchReplaceFile(item, cssFileName, doneCallback) {
        console.log('replace: ' + config.copyrights.remove);

        //Disabled
        doneCallback();
        return;

        //Worked only for FB2
        if (item.format != 'fb2') {
            doneCallback();
            return;
        }

        var file = fs.createReadStream(cssFileName, 'utf8');
        var newCss = '';

        file.on('data', function (chunk) {
            for (var item in config.copyrights.remove) {
                newCss += chunk.toString().replace(config.copyrights.remove[item], config.copyrights.add);
            }
        });

        file.on('end', function () {
            fs.writeFile(cssFileName, newCss, function (err) {
                doneCallback(err);
            });
        });
    };

    self.init();

    return self;
}

module.exports = Converter;