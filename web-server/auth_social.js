var AuthSocial = function (websiteLocal) {

    var website = websiteLocal
        , app = websiteLocal.app
        , config = require('./config')
        , userModel = require('./user')
        , passport = require('passport')
        , util = require('util')
        , bodyParser = require('body-parser')
        , cookieParser = require('cookie-parser')
        , session = require('express-session')
        , RedisStore = require('connect-redis')(session)
        , GoogleStrategy = require('passport-google-oauth2').Strategy
        , FacebookStrategy = require('passport-facebook').Strategy;

    var self = {
        user: new userModel(websiteLocal)
    };

    self.init = function () {
        console.log('AuthSocial init');

        //Called once per provider login
        passport.serializeUser(function (user, done) {
            done(null, user);
        });

        passport.deserializeUser(function (obj, done) {
            self.user.find(obj.id, obj.provider, function (dbUser, err) {
                if (dbUser && dbUser.length >= 1) {
                    done(null, self.user.calcLevel(dbUser[0]));
                } else done(null, obj);
            });
        });

        // configure Express
        app.use(cookieParser());
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        var hour = 3600000;
        var year = 8760;
        var addExpires = hour * year * 10;
        app.use(session({
            secret: 'cookie_secret_12313416234',
            name: 'avt',
            store: new RedisStore({
                host: '127.0.0.1',
                port: 6379
            }),
            cookie  : { maxAge  : new Date(Date.now() + addExpires) },
            proxy: true,
            resave: true,
            saveUninitialized: true
        }));
        app.use(passport.initialize());
        app.use(passport.session());

        app.get('/login', function (req, res, next) {
            if (req.isAuthenticated()) res.redirect('/account');
            else return next();
        });

        app.get('/logout', function (req, res) {
            req.logout();
            res.redirect('/');
        });

        //----------------------- GOOGLE ----------------------- 
        // API Access link for creating client ID and secret:
        // https://code.google.com/apis/console/
        passport.use(new GoogleStrategy(config.authGoogle, self.strategyHandler));

        app.get('/login/google', passport.authenticate('google', {
            scope: [
                'https://www.googleapis.com/auth/plus.login',
                'https://www.googleapis.com/auth/plus.profile.emails.read']
        }));

        app.get('/auth/google/callback',
            passport.authenticate('google', {
                successRedirect: '/',
                failureRedirect: '/login'
            }));

        //----------------------- Facebook ----------------------- 
        passport.use(new FacebookStrategy(config.authFacebook, self.strategyHandler));

        // Define routes.
        app.get('/login/facebook',
            passport.authenticate('facebook', { scope: ['email'] }));

        app.get('/login/facebook/return',
            passport.authenticate('facebook', {
                successRedirect: '/',
                failureRedirect: '/login'
            }));

        app.post('/account', function (httpRequest, httpResponse, next) {
            //TODO Ajax update user data
            httpResponse.send({ success: true });
        });

        app.get('/user', self.parseUser, function (req, res) {
            var data = {
                level:req.user.level,
                exp:req.user.progress
            };
            res.send(data);
        });
    }

    self.strategyHandler = function (request, accessToken, refreshToken, profile, cb) {
        profile.ip = self.getIP(request);
        self.user.find(profile.id, profile.provider, function (rows, err) {
            if (err == null && rows.length == 0) {
                //Add new social user
                console.log("AuthSocial new " + profile.provider + " user");
                self.user.add(profile, function (newUserID) {
                    self.user.merge(newUserID, profile, request, function () {
                        return cb(null, profile);
                    });
                });
            } else if (err == null) {
                console.log("AuthSocial update existing " + profile.provider + " user");
                self.checkForEmailChange(rows[0], profile);
                self.user.update(profile, function () {
                    self.user.merge(rows[0].id, profile, request, function () {
                        return cb(null, profile);
                    });
                });
            } else {
                console.error('AuthSocial new ' + profile.provider + ' user error: ' + err + "; " + profile);
                return cb(null, profile);
            }
        });
    }

    self.checkForEmailChange = function (oldUser, newUser) {
        if (oldUser.email != newUser.emails[0].value) {
            console.warn("AuthSocial warning: user " + oldUser.social_id + " changed email " + oldUser.email + " to " + newUser.emails[0].value);
        }
    }

    self.ensureAuthenticatedPage = function (req, res, next) {
        if (this.page.role > 1) {
            if (!req.user.provider || req.user.provider == 'cookies') res.redirect('/login');
            else return next();
        } else {
            return next();
        }
    }

    self.parseUser = function (req, res, next) {
        if(!req.user) {
            var profile = {
                ip: self.getIP(req),
                id: req.session.id,
                provider: 'cookies'
            };
            self.user.find(profile.id, profile.provider, function (rows, err) {
                if (err == null && rows.length == 0) {
                    //Add new cookies user
                    console.log("AuthSocial new " + profile.provider + " user");
                    profile = self.user.fillGuest(profile);
                    req.user = profile;
                    self.user.add(profile, function () {
                        return next();
                    });
                } else if (err == null) {
                    console.log("AuthSocial update existing " + profile.provider + " user");
                    self.user.updateTime(profile);
                    req.user = self.user.calcLevel(rows[0]);
                    return next();
                } else {
                    console.error('AuthSocial new ' + profile.provider + ' user error: ' + err + "; " + profile);
                    profile = self.user.fillGuest(profile);
                    req.user = profile;
                    return next();
                }
            });
        } else {
            req.user.ip = self.getIP(req);
            self.user.updateTime(req.user);
            return next();
        }
    }

    self.getIP = function(req) {
        if(req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'];
        return req.ip;
    }

    console.log('new AuthSocial');
    self.init();
    return self;
}

module.exports = AuthSocial;