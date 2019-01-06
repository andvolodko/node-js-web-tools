const express = require('express');
const https = require("https");
const fs = require("fs");
const request = require("request");
const globals = require('./globals');
const tools = require('./../libs/tools');
var config = null;

var WorkNode = function (params) {

    var self = {
        app: null,
        db: null,
        receiver: null,
        converter: null,
        uploader: null,
        statusesQueue:{}
    };

    self.init = function (params) {
        console.log('WorkNode init');
        self.app = express();
        self.app.disable('x-powered-by');
        self.db = dbClass();

        self.receiver = receiverClass(self);
        self.converter = converterClass(self);
        self.uploader = uploaderClass(self);

        //Node work logic
        self.receiver.onReceive(self.converter.checkQueue);
        self.converter.onConverted(self.uploader.checkQueue);
        //
        self.uploader.checkQueueFirstTime();
        self.converter.checkQueueFirstTime();

        self.checkStatusesSync();

        self.app.get('/status', function (req, res) {
            //TODO free streams counting
            var freeStreams = config.app.streams;
            freeStreams -= self.converter.proccessCount();
            freeStreams -= self.receiver.proccessCount();
            if (freeStreams > 0) res.send({ ready: true, streams: freeStreams });
            else res.send({ ready: false });
        });

        self.app.get('/system', function (req, res) {
            //TODO
            res.send('System info');
        });

        self.app.get('/shutdown', function (req, res) {
            res.send({ status: 'shutdown' });
        });

        self.app.listen(config.app.port, 'localhost', function () {
            console.log('App listening on port: ' + config.app.port);
        });

        // https.createServer(config.httpsOptions, self.app).listen(config.app.portHttps, function () {
        //     console.log('App listening on port https: ' + config.app.portHttps);
        // });

        process.on('uncaughtException', function (err) {
            console.log('!!! uncaughtException !!!');
            console.log(err);
        });

    };

    self.initArgs = function () {
        const args = process.argv;
        console.log(args);

        if (args.length % 2 == 0) {
            for (var i = 0; i < args.length; i += 2) {
                var arg = args[i];
                var argValue = args[i + 1];
                switch (arg) {
                    case 'env':
                        globals.env = argValue;
                        console.log('env set to: ' + argValue);
                        break;
                    case 'port':
                        config = require('./config');
                        config.app.port = argValue;
                        console.log('Port set to: ' + argValue);
                        break;
                    case 'streams':
                        config = require('./config');
                        config.app.streams = argValue;
                        console.log('Streams set to: ' + argValue);
                        break;
                }
            }

        }
    };

    self.checkStatusesSync = function() {
        self.db.getNotSyncFiles(function(rows){
            for (var index = 0; index < rows.length; index++) {
                var element = rows[index];
                var error = '';
                if(element.step == config.workSteps.error) error = 'Convertion error';
                var data = {
                    uuid:element.uuid,
                    status:element.step,
                    data:error,
                    name:element.file,
                    worktime: element.worktime
                };
                self.statusUpdate(data);
            }
        });
    };

    self.statusUpdate = function (data, repeat = false) {
        var canUpdate = false;
        if(!repeat) {
            if(!self.statusesQueue[data.uuid]) {
                self.statusesQueue[data.uuid] = [];
            }
            self.statusesQueue[data.uuid].push(data);
            if(self.statusesQueue[data.uuid].length == 1) canUpdate = true;
        } else {
            canUpdate = true;
        }
        if(!canUpdate) return;
        request.post({
            url: config.app.statusUrl + '?nocache=' + tools.randomIntInc(0,1000000),
            body: data,
            strictSSL: false,
            json: true
        }, (function (error, response, body) {
            var success = false;
            if(body && body.status && body.status == 'ok') {
                success = true;
                self.statusesQueue[data.uuid].shift();
                if(self.statusesQueue[data.uuid].length > 0) {
                    self.statusUpdate(self.statusesQueue[data.uuid][0], true);
                }
            }
            if(!success) {
                //Repeat
                setTimeout(
                    (function() {
                        self.statusUpdate(this, true);
                    }).bind(this),
                config.app.statusRepeatTime);
            } else {
                self.db.updateStatus(this.uuid, this.status);
            }
        }).bind(data));
    };

    console.log('new WorkNode');
    self.initArgs();
    
    config = require('./config');
    const receiverClass = require('./receiver');
    const converterClass = require('./converter');
    const uploaderClass = require('./uploader');
    const dbClass = require('./db');

    self.init();
    return self;
}

module.exports = WorkNode;

const workNode = WorkNode();