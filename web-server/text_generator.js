var TextGenerator = function (initCallback) {
    const config = require('./config');
    const tools = require('./tools');

    var self = {        
    };

    self.generateKeywords = function () {
        console.log('generateKeywords');
        var returnArray = [];
        var generateCount = tools.randomIntInc(0,50);
        for (var index = 0; index < generateCount; index++) {
            var randomQueryPosition = tools.randomInt(0,config.db.keywords.length);
            if(config.db.keywords.length > 0) {
                var randomQuery = config.db.keywords[randomQueryPosition];
                returnArray.push(randomQuery);
            }
        }
        return returnArray;
    }

    self.generateSearchQueries = function () {
        console.log('generateSearchQueries');
        var returnArray = [];
        var generateCount = tools.randomIntInc(5,30);
        for (var index = 0; index < generateCount; index++) {
            var randomQueryPosition = tools.randomInt(0,config.db.searchQueries.length);
            if(config.db.searchQueries.length > 0) {
                var randomQuery = config.db.searchQueries[randomQueryPosition];
                randomQuery.class = "size"+tools.randomIntInc(1,5);
                returnArray.push(randomQuery);
            }
        }
        return returnArray;
    }

    console.log('new TextGenerator');
    return self;
}

module.exports = TextGenerator;