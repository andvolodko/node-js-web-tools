const sqlite3 = require('sqlite3').verbose();
const SqlString = require('sqlstring');
const config = require('./config');
const tools = require('./../libs/tools');

var DB = function (paramsParent) {

    var self = {
        inited: false,
        db: null
    };

    self.db = new sqlite3.Database('./db/work-node.db');

    // //Perform SELECT Operation
    // db.all("SELECT * from blah blah blah where this="+that,function(err,rows){
    // //rows contain values while errors, well you can figure out.
    // });

    // //Perform INSERT operation.
    // db.run("INSERT into table_name(col1,col2,col3) VALUES (val1,val2,val3)");

    // //Perform DELETE operation
    // db.run("DELETE * from table_name where condition");

    // //Perform UPDATE operation
    // db.run("UPDATE table_name where condition");

    self.init = function (params) {
        console.log('DB init');
    };

    self.addToQueue = function (uuid, fromType, toFormat, filePath, addedCallback) {
        console.log('addToQueue');
        var sql = self.sqlFormat("INSERT INTO queue (step, uuid, type, file, format) VALUES ('received', ?, ?, ?, ?);", [uuid, fromType, filePath, toFormat]);
        self.db.run(sql, function (err) {
                // err is null if insertion was successful
                if (err) {
                    console.log("addToQueue error: " + err);
                } else {
                    console.log("addToQueue id:", this.lastID);
                    if (addedCallback != null) addedCallback();
                }

            });
    };

    self.getReceivedFiles = function (stepsArray, getCallback) {
        var whereStatement = '';
        for (var index = 0; index < stepsArray.length; index++) {
            var element = stepsArray[index];
            if(index == 0) {
                whereStatement += "step='" + element + "'";
            } else {
                whereStatement += " or step='" + element + "'";
            }
        }
        self.db.all("SELECT * from queue where " + whereStatement + " order by timestamp asc;", function (err, rows) {
            //rows contain values while errors, well you can figure out.
            getCallback(rows);
        });
    };

    self.updateFileStep = function (uuid, step, log = '', worktime = 0, addedCallback = null) {
        var sql;
        if(worktime !=0) {
            sql = self.sqlFormat("UPDATE queue set step=?, log=?, worktime=? where uuid=?;", [step, log, worktime, uuid]);
        } else {
            sql = self.sqlFormat("UPDATE queue set step=?, log=? where uuid=?;", [step, log, uuid]);
        }
        self.db.run(sql, function (err) {
            // err is null if insertion was successful
            if (err) {
                console.log("updateFileStep error: " + err);
            } else {
                if (addedCallback != null) addedCallback();
            }

        });
    };

    self.updateStatus = function (uuid, status, addedCallback = null) {
        var sql = self.sqlFormat("UPDATE queue set status=? where uuid=?;", [status, uuid]);
        self.db.run(sql, function (err) {
            // err is null if insertion was successful
            if (err) {
                console.log("updateStatus error: " + err);
            } else {
                if (addedCallback != null) addedCallback();
            }

        });
    };

    self.getNotSyncFiles = function (getCallback) {
        self.db.all("SELECT * from queue where step is not status;", function (err, rows) {
            //rows contain values while errors, well you can figure out.
            getCallback(rows);
        });
    };

    self.sqlFormat = function(sqlString, dataArray) {
        sqlString = SqlString.format(sqlString, dataArray);
        sqlString = sqlString.split("\\'").join("''");
        return sqlString;
    };

    self.init();

    return self;
}

module.exports = DB;