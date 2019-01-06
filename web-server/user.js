var User = function (websiteLocal) {
    
    const config = require('./config');
    const tools = require('./tools');

    var self = {
        db:websiteLocal.dbManager,
        inited:false
    };

    self.prepareUserData = function(profile){
        var email = profile.emails[0].value;
        var firstName = profile.name.givenName;
        var lastName = profile.name.familyName;
        var photo = profile.photos[0].value;

        var userData = {
            social_id:profile.id,
            provider:profile.provider,
            first_name:firstName,
            last_name:lastName,
            email:email,
            photo:photo,
            json:profile._raw,
            last_ip:profile.ip
        };
        return userData;
    };

    self.fillGuest = function(profile) {
        config.db.usersCount++;
        profile._raw = '';
        profile.emails = [{
            value:''
        }];
        profile.name = {
            givenName:'Guest',
            familyName:config.db.usersCount
        };
        profile.photos = [{
            value:config.db.config.site_static_url + '/img/default-avatar.jpg'
        }];
        //For first show
        profile.photo = profile.photos[0].value;
        profile.first_name = profile.name.givenName;
        profile.last_name = profile.name.familyName;
        profile.level = 1;
        profile.progress = 0;
        profile.exp = 0;
        return profile;
    };

    self.calcLevel = function(profile) {
        profile.level = self.getLevelForExp(profile.exp);
        profile.progress = self.getProgressForLevel(profile.level);
        profile.level = Math.floor(profile.level);
        return profile;
    };
    
    self.calcLevels = function(profiles) {
        for(var i = 0; i < profiles.length; i++) {
            profiles[i] = self.calcLevel(profiles[i]);
            profiles[i].index = i+1;
        }
        return profiles;
    };

    self.getLevelForExp = function(exp) {
        //https://stackoverflow.com/a/6955362
        var level = Math.floor(25 + Math.sqrt(625 + 100 * exp)) / 50;
        return level;
    };

    self.getProgressForLevel = function(level) {
        var levelInt = Math.floor(level);
        var levelNext = Math.ceil(level);
        var progress = 100 - (levelNext - level) * 100;
        progress = Math.floor(progress);
        if(progress >= 100) progress = 0;
        return progress;
    };

    self.addExpForFile = function(uuid) {
        console.log(uuid);
        self.db.getFileWorktime(uuid, function(rows,err){
            if(!err) {
                var worktime = rows[0].worktime;
                var userID = rows[0].user;
                var server = rows[0].server;
                var coef = 1;
                for (var index = 0; index < config.workNodes.length; index++) {
                    var element = config.workNodes[index];
                    if(element.server == server) {
                        coef = element.expCoef;
                        break;
                    }
                }
                var exp = worktime * coef;
                if(exp < 1) exp = 1;
                self.db.addExp(userID, exp);
            }
        });
    };

    self.add = function(profile, addCallback) {
        var userData = self.prepareUserData(profile);
        self.db.addUser(userData, addCallback);
    };

    self.update = function(profile, updateCallback) {
        var userData = self.prepareUserData(profile);
        self.db.updateUser(userData, updateCallback);
    };
    
    self.merge = function(newUserID, profile, request, mergeCallback) {
        var cookieUser = {
            id:request.session.id,
            provider:'cookies'
        };
        self.db.getUserExp(cookieUser, function(oldUserID, exp) {
            self.db.moveFilesToUser(newUserID, oldUserID);
            self.db.addUserExp(profile, exp, mergeCallback);
            self.db.addUserExp(cookieUser, -exp);
        });
    };

    self.find = function(socialID, provider, findCallback) {
        self.db.getUser(socialID, provider, findCallback);
    };
    
    self.updateTime = function(profile, updateCallback) {
        self.db.updateUserTime(profile, updateCallback);
    };

    self.init = function (params) {
        console.log('User init');
    };

    self.init();

    return self;
}

module.exports = User;