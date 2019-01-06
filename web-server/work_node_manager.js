var WorkNodeManager = function (websiteLocal) {
    var website = websiteLocal
        , app = websiteLocal.app
        , request = require("request")
        , config = require('./config');

    var self = {
        inited: false,
        callbacksQueue: [],
        checkingQueue: false,
        checkingServers: 0,
        workNodes: [],
        lastCheck: [0, 0],
        reservedNodes: {},
        reservedNodesTime: {}
    };

    self.canUpload = function (callback, user) {
        console.log('WorkNodeManager canUpload');
        self.callbacksQueue.push({ callback: callback, user: user });
        self.checkQueue();
    };

    self.checkQueue = function () {
        var checkTime = process.hrtime(self.lastCheck);
        var timeoutElapsed = (checkTime[0] * 1000) >= config.app.nodeStatusUpdateTime;
        if (!self.checkingQueue && self.callbacksQueue.length > 0 && timeoutElapsed) {
            console.log('self.checkQueue: ' + checkTime);
            self.lastCheck = process.hrtime();
            self.checkingQueue = true;
            self.workNodes.length = 0;

            for (var i = 0; i < config.workNodes.length; i++) {
                var workNode = config.workNodes[i].server;
                self.checkingServers++;

                request({
                    url: workNode + 'status',
                    strictSSL: false
                },
                    (function (error, response, body) {
                        if (!error) {
                            var data = JSON.parse(body);
                            if (data.ready) {
                                self.workNodes.push({ workNode: this.workNode, streams: data.streams });
                            }
                        } else {
                            console.log('WorkNodeManager checkQueue error: ' + error);
                        }

                        self.checkingServers--;
                        self.tryFinishCheking();
                    }).bind({ workNode: config.workNodes[i] })
                );

            }

        }
    };

    self.tryFinishCheking = function () {
        if (self.checkingQueue && self.checkingServers == 0) {
            var availableStreams = self.countStreams();
            console.log('WorkNodeManager availableStreams: ' + availableStreams + ' callbacksQueue: ' + self.callbacksQueue.length);
            for (var index = 0; index < self.callbacksQueue.length; index++) {
                var item = self.callbacksQueue.shift();
                if (item != null) {
                    //TODO Prepare queue sorting per user role and server performance
                    //Now 1 stream per user
                    if (availableStreams > 0) {
                        var reserveID = item.user.id;
                        if (!self.reservedNodes[reserveID]) self.reservedNodes[reserveID] = [];
                        var streamsPerUser = 1;
                        if (self.reservedNodes[reserveID].length >= streamsPerUser) {
                            console.log('WorkNodeManager streams reserve limit');
                            item.callback({ ready: false });
                        } else {
                            availableStreams--;
                            self.reservedNodes[reserveID].push(self.getFreeStream());
                            self.reservedNodesTime[reserveID] = process.hrtime();
                            item.callback({ ready: true, files: 1 });
                        }
                    } else {
                        item.callback({ ready: false });
                    }
                }
            }
            self.checkingQueue = false;
            self.cleanReserve();
        }
    };

    self.cleanReserve = function () {
        Object.keys(self.reservedNodes).forEach(function (key) {
            var time = self.reservedNodesTime[key];
            var checkTime = process.hrtime(time);
            var reserveElapsed = (checkTime[0] * 1000) >= config.app.streamReserveTime;
            if(reserveElapsed) delete self.reservedNodes[key];
        });
    }

    self.countStreams = function () {
        var streams = 0;
        for (var i = 0; i < self.workNodes.length; i++) {
            var workNode = self.workNodes[i];
            streams += workNode.streams;
        }
        return streams;
    };

    self.getFreeStream = function () {
        for (var i = 0; i < self.workNodes.length; i++) {
            var workNode = self.workNodes[i];
            workNode.streams--;
            if (workNode.streams <= 0) self.workNodes.splice(i, 1);
            return workNode.workNode.server;
        }
        return null;
    };

    self.getReservedStream = function (user) {
        var userID = user.id;
        if (self.reservedNodes[userID] && self.reservedNodes[userID].length > 0) {
            var serverStream = self.reservedNodes[userID].shift();
            if (self.reservedNodes[userID].length == 0) delete self.reservedNodes[userID];
            return serverStream;
        }

        //TODO maybe disallow if not reserved
        console.warn('WorkNodeManager warning: no reserved stream, return getFreeStream');
        return self.getFreeStream();
    };

    self.init = function (params) {
        console.log('WorkNodeManager init');
        setInterval(self.checkQueue, config.app.nodeStatusUpdateTime);
    };

    self.init();

    return self;
}

module.exports = WorkNodeManager;