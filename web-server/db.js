var DBManager = function (initCallback) {
    const mysql = require('mysql');
    const sqlString = require('sqlstring');
    const config = require('./config');
    const toolsShared = require('./../libs/tools');

    var self = {
        inited: false,
        initCallback: initCallback,
        pool: null
    };

    self.readConfigFromDB = function (readCallback) {
        console.log('DBManager readConfigFromDB');
        self.query('SELECT * from config', function (err, rows) {
            if (!err) {
                config.db.config = {};
                for (var index = 0; index < rows.length; index++) {
                    var element = rows[index];
                    config.db.config[element.name] = element.value;
                }
                console.log('DBManager dbconfig updated');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readMenuFromDB = function (readCallback) {
        console.log('DBManager readMenuFromDB');
        self.query('SELECT * from menus WHERE active = 1 ORDER by sort', function (err, rows) {
            if (!err) {
                config.db.menus = [];
                for (var index = 0; index < rows.length; index++) {
                    var element = rows[index];
                    var menuName = 'menu' + element.type;
                    if (!config.db[menuName]) {
                        config.db[menuName] = [];
                        config.db.menus.push(menuName);
                    }
                    config.db[menuName].push(element);
                }
                console.log('DBManager readMenuFromDB ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readPageLinksFromDB = function (readCallback) {
        console.log('DBManager readPageLinksFromDB');
        self.query('SELECT * from pages', function (err, rows) {
            if (!err) {
                config.db.pages = rows;
                console.log('DBManager readPageLinksFromDB ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readNewsFromDB = function (readCallback) {
        console.log('DBManager readNewsFromDB');
        self.query('SELECT *, DATE_FORMAT(published,\'%d\') AS day, DATE_FORMAT(published,\'%b %Y\') AS month_year FROM news ORDER by published DESC',
            function (err, rows, fields) {
                if (!err) {
                    console.log('DBManager readNewsFromDB ok');
                    if (typeof readCallback === "function") readCallback(rows);
                }
                else console.log('DBManager error while performing Query.');
            });
    };

    self.readPageFromDB = function (pageLink, readCallback) {
        console.log('DBManager readPageLinksFromDB');
        self.query('SELECT * from pages WHERE link=\'' + pageLink + '\'', function (err, rows) {
            if (!err) {
                console.log('DBManager readPageFromDB ok');
                if (typeof readCallback === "function") readCallback(rows);
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readNewsPageFromDB = function (pageLink, readCallback) {
        console.log('DBManager readNewsPageFromDB');
        self.query('SELECT *, DATE_FORMAT(published,\'%d %b %Y\') AS date FROM news WHERE link=\'' + pageLink + '\'', function (err, rows) {
            if (!err) {
                console.log('DBManager readNewsPageFromDB ok');
                if (typeof readCallback === "function") readCallback(rows);
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readKeywordsFromDB = function (readCallback) {
        console.log('DBManager readKeywordsFromDB');
        self.query('SELECT * FROM keywords', function (err, rows) {
            if (!err) {
                config.db.keywords = rows;
                console.log('DBManager readKeywordsFromDB ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readNewsCount = function (readCallback) {
        console.log('DBManager readNewsCount');
        self.query('SELECT count(*) as newsCount FROM news', function (err, rows) {
            if (!err) {
                config.db.newsCount = rows[0].newsCount;
                console.log('DBManager readNewsCount ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readUsersCount = function (readCallback) {
        console.log('DBManager readUsersCount');
        self.query('SELECT MAX(id) as usersCount FROM users;', function (err, rows) {
            if (!err) {
                config.db.usersCount = rows[0].usersCount;
                console.log('DBManager readUsersCount ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readFilesData = function (readCallback) {
        console.log('DBManager readFilesData');
        self.query('SELECT COUNT(*) as filesCount, SUM(`size`) as filesSize FROM files;', function (err, rows) {
            if (!err) {
                rows[0].filesCount = toolsShared.formatFilesCount(rows[0].filesCount);
                rows[0].filesSize = toolsShared.formatFilesSize(rows[0].filesSize);
                config.db.stats = rows[0];
                console.log('DBManager readFilesData ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.readSearchQueriesFromDB = function (pageLink, readCallback) {
        console.log('DBManager readSearchQueriesFromDB');
        self.query('SELECT * FROM search_queries', function (err, rows) {
            if (!err) {
                config.db.searchQueries = rows;
                console.log('DBManager readSearchQueriesFromDB ok');
                if (typeof readCallback === "function") readCallback();
                self.checkForInitFinish();
            }
            else console.log('DBManager error while performing Query.');
        });
    };

    self.checkForInitFinish = function () {
        if (!self.inited) {
            self.inited = true;
            self.initCallback();
        }
    }

    self.getTopUsers = function(usersCount, readCallback) {
        console.log('DBManager getTopUsers');
        var sql = sqlString.format(
            "SELECT * from users WHERE exp > 0 ORDER BY exp DESC LIMIT 0, ?;",
            [usersCount]
        );
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getTopUsers ok');
                if (typeof readCallback === "function") readCallback(rows);
            }
            else console.log('DBManager error while performing Query.');
        });
    }

    self.addUser = function (data, addCallback) {
        console.log('DBManager addUser');
        var sql = sqlString.format(
            "INSERT INTO users (`social_id`, `provider`, `first_name`, `last_name`, `email`, `photo`, `json`, `last_ip`, `login_time`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW());",
            [data.social_id, data.provider, data.first_name, data.last_name, data.email, data.photo, data.json, data.last_ip]
        );
        self.query(sql, function (err, result) {
            if (!err) {
                console.log('DBManager addUser ok');
                if (typeof addCallback === "function") addCallback(result.insertedId);
            }
            else console.log('DBManager addUser error while performing Query.');
        });
    };

    self.updateUser = function (data, updateCallback) {
        console.log('DBManager updateUser');

        var sql = sqlString.format(
            "UPDATE users SET `first_name`=?, `last_name`=?, `email`=?, `photo`=?, `json`=?, `last_ip`=?, `login_time`= NOW() WHERE `social_id`=? AND `provider`=?;",
            [data.first_name, data.last_name, data.email, data.photo, data.json, data.last_ip, data.social_id, data.provider]
        );
        self.query(sql, function (err, result) {
            if (!err) {
                console.log('DBManager updateUser ok');
                if (typeof updateCallback === "function") updateCallback();
            }
            else console.log('DBManager updateUser error while performing Query.');
        });
    };

    self.updateUserTime = function (data, updateCallback) {
        console.log('DBManager updateUserTime');
        var sql = sqlString.format(
            "UPDATE users SET `last_ip`=?, `login_time`= NOW() WHERE `social_id`=? AND `provider`=?;",
            [data.ip, data.id, data.provider]
        );
        self.query(sql, function (err, result) {
            if (!err) {
                console.log('DBManager updateUserTime ok');
                if (typeof updateCallback === "function") updateCallback();
            }
            else console.log('DBManager updateUserTime error while performing Query.');
        });
    };

    self.getUser = function (socialID, provider, readCallback) {
        console.log('DBManager getUser');
        var sql = sqlString.format("SELECT * from users WHERE social_id=? AND provider=?;", [socialID, provider]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getUser ok');
            }
            else console.log('DBManager getUser error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.getUserExp = function (user, readCallback) {
        console.log('DBManager getUserExp');
        var sql = sqlString.format("SELECT * from users WHERE social_id=? AND provider=?;", [user.id, user.provider]);
        self.query(sql, function (err, rows) {
            if (!err && rows && rows.length > 0) {
                console.log('DBManager getUserExp ok');
                if (typeof readCallback === "function") readCallback(rows[0].id, rows[0].exp);
            }
            else console.log('DBManager getUserExp error while performing Query.');
        });
    };

    self.addUserExp = function (user, exp, readCallback) {
        console.log('DBManager addUserExp');
        var sql = sqlString.format("UPDATE users SET exp = exp + ?  WHERE social_id=? AND provider=?;", [exp, user.id, user.provider]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager addUserExp ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager addUserExp error while performing Query.');
        });
    };

    self.addFile = function (data, addCallback) {
        console.log('DBManager addFile');
        var sql = sqlString.format(
            "INSERT INTO files (`uuid`, `name`, `type`, `format`, `size`, `user`, `server`, `status`, `url`, `data`, `worktime`, `date`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SEC_TO_TIME(?), NOW());",
            [data.uuid, data.name, data.type, data.format, data.size, data.user, data.server, data.status, data.url, data.data, data.worktime]
        );
        self.query(sql, function (err, result) {
            if (!err) {
                console.log('DBManager addFile ok');
                if (typeof addCallback === "function") addCallback();
            }
            else console.log('DBManager addFile error while performing Query.');
        });
    };
    
    self.moveFilesToUser = function(newUserID, oldUserID) {
        console.log('DBManager moveFilesToUser');
        var sql = sqlString.format("UPDATE files SET user = ?  WHERE user = ?;", [newUserID, oldUserID]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager moveFilesToUser ok');
                if (typeof readCallback === "function") readCallback();
            }
            else console.log('DBManager moveFilesToUser error while performing Query.');
        });
    };

    self.deleteFile = function (uuid, addCallback) {
        console.log('DBManager deleteFile');
        var sql = sqlString.format(
            "delete from files where uuid=?",
            [uuid]
        );
        self.query(sql, function (err, result) {
            if (!err) {
                console.log('DBManager deleteFile ok');
                if (typeof addCallback === "function") addCallback();
            }
            else console.log('DBManager deleteFile error while performing Query.');
        });
    };

    self.updateFile = function (data, updateCallback) {
        console.log('DBManager updateFile');

        var valuesArray = [];
        var sqlRaw = "UPDATE files SET";
        if (data.url) {
            sqlRaw += " `url`=?,";
            valuesArray.push(data.url);
        }
        if (data.size) {
            sqlRaw += " `size`=?,";
            valuesArray.push(data.size);
        }
        if (data.status) {
            sqlRaw += " `status`=?,";
            valuesArray.push(data.status);
        }
        if (data.error) {
            sqlRaw += " `data`=?,";
            valuesArray.push(data.error);
        }
        sqlRaw = sqlRaw.slice(0, - 1);
        sqlRaw += " WHERE `uuid`=?;";
        valuesArray.push(data.uuid);
        var sql = sqlString.format(
            sqlRaw,
            valuesArray
        );
        self.query(sql, function (err, result) {
            if (!err) {
                console.log('DBManager updateFile ok');
                if (typeof updateCallback === "function") updateCallback();
            }
            else console.log('DBManager updateFile error while performing Query.');
        });
    };

    self.getFile = function (user, uuid, readCallback) {
        console.log('DBManager getFile');
        var statuses = [config.fileSteps.uploaded, config.fileSteps.error];
        var sql = sqlString.format("SELECT * from files WHERE user=? AND uuid =? AND status IN(?);", [user.id, uuid, statuses]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFile ok');
            }
            else console.log('DBManager getFile error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.getFiles = function (user, type, readCallback) {
        console.log('DBManager getFiles');
        var statuses = [
            config.fileSteps.downloading,
            config.fileSteps.received,
            config.fileSteps.working,
            config.fileSteps.converted,
            config.fileSteps.uploading,
            config.fileSteps.uploaded,
            config.fileSteps.error
        ];
        var sql = sqlString.format("SELECT * from files WHERE user=? AND type =? AND status IN(?);", [user.id, type, statuses]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFiles ok');
            }
            else console.log('DBManager getFiles error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.getFilesStatus = function (user, uuids, readCallback) {
        console.log('DBManager getFilesStatus');
        var sql = sqlString.format("SELECT * from files WHERE user=? AND uuid IN(?);", [user.id, uuids]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFilesStatus ok');
            }
            else console.log('DBManager getFilesStatus error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.updateFilesStatus = function (data, readCallback) {
        console.log('DBManager updateFilesStatus');
        var paramsArray = [];
        var sqlStringRaw = "UPDATE files SET ";
        if (data.status) {
            sqlStringRaw += " `status`=?,";
            paramsArray.push(data.status);
        }
        if (data.data) {
            sqlStringRaw += " `data`=?,";
            paramsArray.push(data.data);
        }
        if (data.new_size) {
            sqlStringRaw += " `new_size`=?,";
            paramsArray.push(data.new_size);
        }
        if (data.name) {
            sqlStringRaw += " `name`=?,";
            paramsArray.push(data.name);
        }
        if (data.worktime) {
            sqlStringRaw += " `worktime`=SEC_TO_TIME(?),";
            paramsArray.push(data.worktime);
        }
        sqlStringRaw = sqlStringRaw.slice(0, - 1);
        sqlStringRaw += " WHERE `uuid`=?;";
        paramsArray.push(data.uuid);
        var sql = sqlString.format(sqlStringRaw, paramsArray);

        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager updateFilesStatus ok');
            }
            else console.log('DBManager updateFilesStatus error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.getFilesByTime = function (timeSec, readCallback) {
        console.log('DBManager getFilesByTime');
        var sql = sqlString.format("SELECT * from files where status = '" + config.fileSteps.uploaded + "' and date < DATE_SUB(NOW(), INTERVAL ? SECOND);", [timeSec]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFilesByTime ok: ' + rows.length);
            }
            else console.log('DBManager getFilesByTime error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.getFileWorktime = function (uuid, readCallback) {
        console.log('DBManager getFileWorktime');
        var sql = sqlString.format("SELECT user, server, TIME_TO_SEC(worktime) as worktime from files where uuid=?;", [uuid]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFileWorktime ok');
            }
            else console.log('DBManager getFileWorktime error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.addExp = function (userID, exp, readCallback) {
        console.log('DBManager addExp');
        var sql = sqlString.format("UPDATE users SET exp = exp + ? WHERE id = ?;", [exp, userID]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager addExp ok');
            }
            else console.log('DBManager addExp error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows, err);
        });
    };

    self.getFormatsByExt = function(extArray, readCallback){
        console.log('DBManager getFormatsByExt');
        var sql = sqlString.format("SELECT * from formats where ext IN(?) order by ext;", [extArray]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFormatsByExt ok');
            }
            else console.log('DBManager getFormatsByExt error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows);
        });
    };

    self.getFormats = function(readCallback){
        console.log('DBManager getFormats');
        var sql = sqlString.format("SELECT * from formats order by ext;", []);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFormats ok');
            }
            else console.log('DBManager getFormats error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows);
        });
    };

    self.getFormat = function(ext, readCallback){
        console.log('DBManager getFormat');
        var sql = sqlString.format("SELECT * from formats where ext=?;", [ext]);
        self.query(sql, function (err, rows) {
            if (!err) {
                console.log('DBManager getFormat ok');
            }
            else console.log('DBManager getFormat error while performing Query.');
            if (typeof readCallback === "function") readCallback(rows);
        });
    };

    self.query = function (sql, callback) {
        self.pool.getConnection(function (err, connection) {
            if (err) {
                console.error("DBManager pool.getConnection " + err);
                callback(err);
                return;
            }
            connection.query(sql, [], function (err, results) {
                connection.release(); // always put connection back in pool after last query
                callback(err, results);
            });
        });
    };

    self.init = function () {
        console.log('DBManager init');
        self.pool = mysql.createPool(config.mysqlParams);

        self.readConfigFromDB(function (params) {
            self.readMenuFromDB(function (params) {
                self.readPageLinksFromDB(function (params) {
                    self.readKeywordsFromDB(function (params) {
                        self.readUsersCount(function (params) {
                            self.readFilesData(function (params) {
                                self.readSearchQueriesFromDB();
                            });
                        });
                    });
                });
            });
        });
    };

    console.log('new DBManager');
    self.init();
    return self;
}

module.exports = DBManager;