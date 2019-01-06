//TODO add tests for new work-node install

var Converter = function (workNode) {

    var self = {
        checkingQueue: true
    };

    self.init = function (params) {
        console.log('Converter init');
        
        console.log('true');
        if(self.checkingQueue == true) return;
        console.log('false');
        

        return;

        self.db.getReceivedFiles(checkSteps, function (rows) {
            for (var index = 0; index < rows.length; index++) {
                var element = rows[index];
                var startConvert = function () {
                    console.log("!!!!!! el: " + element.format);
                    self.convert(element);
                };
                startConvert.bind({ element: element });
                self.db.updateFileStep(element.uuid, 'working', '', 0, startConvert);
            }
        });

    };


    self.init();

    return self;
}

module.exports = Converter;

new Converter();