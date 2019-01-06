const express = require('express');
const AccessControl = require('express-ip-access-control');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const ECT = require('ect');
const minify = require('html-minifier').minify;
const globals = require('./globals');

var Website = function (params) {

    var self = {
        authSocial: null,
        workNodeManager: null,
        uploader: null,
        textGenerator: null,
        dbManager: null,
        sitemap: null,
        app: null,
        renderer: null
    };

    self.dbInited = function (params) {
        console.log('Website dbInited');
        self.initExpress();
    };

    self.initExpress = function (params) {
        self.app = express();

        var ipFilterOptions = {
            mode: 'allow',
            denys: [],
            allows: config.ipsWhitelist,
            forceConnectionAddress: false,
            log: function (clientIp, access) {
                console.log(clientIp + (access ? ' accessed.' : ' denied.'));
            },
            statusCode: 401,
            redirectTo: '',
            message: 'Unauthorized'
        };
        //self.app.use(AccessControl(ipFilterOptions));

        self.app.use(express.static(__dirname + '/static'));

        self.authSocial = authSocialClass(self);
        self.workNodeManager = workNodeManagerClass(self);
        self.uploader = uploaderClass(self);
        self.user = new userModel(self);

        self.renderer = ECT({ root: __dirname + '/views' });
        self.renderData = JSON.parse(JSON.stringify(config.db));
        self.renderData.active = '';
        self.renderData.year = new Date().getFullYear();
        self.renderData.logotext = self.renderData.config.logotext;
        self.renderData.useMinifiedCSS = config.app.useMinifiedCSS;
        self.renderData.useMinifiedJS = config.app.useMinifiedJS;
        self.renderData.cssVersion = config.app.cssVersion;
        self.renderData.jsVersion = config.app.jsVersion;
        self.renderData.tools = config.tools;
        if (globals.env == 'prod') self.renderData.prod = true;
        self.renderData.adEnabled = globals.adEnabled;

        self.prepareMenuList();

        self.initPages();
        if (globals.env == 'dev') self.initSitemap();
        self.init404page();

        //if(config.ipsBlacklist) self.app.use(ipfilter(config.ipsBlacklist));
        //if(config.ipsWhitelist) self.app.use(ipfilter(config.ipsWhitelist, {mode: 'allow'}));

        setInterval(self.dbManager.readFilesData, config.app.updateFilesDataTimeMSec);

        self.app.listen(config.app.port, 'localhost', () => {
            console.log('Website live on ' + config.app.port);
        });

        self.app.disable('x-powered-by');
        self.app.maxConnections = 2000; //TODO Test this

        process.on('uncaughtException', function (err) {
            console.log(err);
        });
    };

    self.nocache = function (req, res, next) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        next();
    };

    self.prepareMenuList = function (params) {
        for (var index = 0; index < self.renderData.menus.length; index++) {
            var menuArrayName = self.renderData.menus[index];
            self.menuPartUpdate(self.renderData[menuArrayName]);
        }
    };

    self.menuPartUpdate = function (menu) {
        for (var index = 0; index < menu.length; index++) {
            var element = menu[index];
            var linkData = element.link.split('/');
            element.linkOrigin = element.link;
        }
    };

    self.setTitle = function (renderData, params) {
        if (params) {
            renderData.title = params + ' - ' + self.renderData.config.title;
        } else {
            renderData.title = self.renderData.config.title;
        }
    };

    self.appendToTitle = function (text, renderData) {
        if (text) {
            renderData.title = text + ' - ' + renderData.title;
        }
    };

    self.replaceInTitle = function (textsArray, renderData, varName) {
        renderData[varName] = tools.stringReplace(textsArray, renderData[varName]);
    };

    self.setBreadcrumbs = function (renderData, req, dbData) {
        renderData.breadcrumbs = [];
        var homeElement = {
            position: 1,
            id: config.db.config.site_url,
            name: config.db.config.logotext
        };
        renderData.breadcrumbs.push(homeElement);

        var url = req.url.split('/');

        if(url.length >= 2) {
            var urlPart = url[1];
            if (urlPart && dbData) {
                var name = dbData[0].title;
                var newElement = {
                    position: 2,
                    id: config.db.config.site_url + '/' + url[1],
                    link: '/' + url[1],
                    name: name
                };
                renderData.breadcrumbs.push(newElement);
            }
        }
    };

    self.updateBreadcrumbs = function (title, renderData) {
        var link = renderData.breadcrumbs[1].link;
        var name = '';
        for (var index = 0; index < config.db.pages.length; index++) {
            var pageElement = config.db.pages[index];
            if(pageElement.link == link) {
                name = pageElement.title;
                break;
            }
        }
        renderData.breadcrumbs[1].name = name;

        var newElement = {
            position: 3,
            id: renderData.canonical,
            name: title
        };
        renderData.breadcrumbs.push(newElement);
    };

    self.initPages = function (params) {
        for (var index = 0; index < config.db.pages.length; index++) {
            var pageElement = config.db.pages[index];
            var pagePath = pageElement.link;

            var handler = function (req, res, next) {
                var link = req.route.path;
                var startTime = process.hrtime();
                self.prepareWidgetsData(function (renderData) {
                    self.dbManager.readPageFromDB(link, function (dbData) {
                        self.updateDataForResponse(renderData, req, dbData);
                        self.prepareTemplatesData(req, renderData, function (success) {
                            if (success) {
                                renderData.stats.serverTime = new Date().toLocaleTimeString();
                                var html = self.renderer.render(renderData.view, renderData);
                                html = minify(html, config.minifyConfig);
                                var pageTime = toolsShared.parsePageTime(process.hrtime(startTime));
                                html = html.split('[pageTime]').join(pageTime);
                                res.send(html);
                                var secondsText = toolsShared.parseHrtimeToSeconds(process.hrtime(startTime));
                                console.log('Page generation time: '+ secondsText);
                            } else next();
                        });
                    });
                });
            };

            self.app.get(pagePath, self.nocache, self.authSocial.parseUser, self.authSocial.ensureAuthenticatedPage.bind({ page: pageElement }), handler);
            self.app.post(pagePath, self.nocache, self.authSocial.parseUser, self.authSocial.ensureAuthenticatedPage.bind({ page: pageElement }), handler);
        }
    };

    self.initSitemap = function () {
        const sitemapClass = require('./sitemap');
        self.sitemap = new sitemapClass(self);
    };

    self.init404page = function () {
        self.app.get('*', self.authSocial.parseUser, function (req, res) {
            self.prepareWidgetsData(function (renderData) {
                self.updateDataForResponse(renderData, req);
                self.setTitle(renderData, 'Error 404');
                var html = self.renderer.render('404.html', renderData);
                res.status(404).send(minify(html, config.minifyConfig));
            });

        });
    };

    self.prepareWidgetsData = function (doneCallback) {
        var renderData = Object.assign({}, self.renderData);
        self.renderData.stats = config.db.stats;
        renderData.searchQueries = self.textGenerator.generateSearchQueries();
        if (typeof doneCallback === "function") doneCallback(renderData);
    };

    self.updateDataForResponse = function (renderData, req, dbData) {
        renderData.description = self.renderData.config.description;
        renderData.keywords = self.renderData.config.keywords;
        renderData.canonical = self.renderData.config.site_url + req.url;
        renderData.user = req.user;
        self.setBreadcrumbs(renderData, req, dbData);

        if (!dbData || dbData.length < 1) return;
        dbData = dbData[0];
        renderData.dbData = dbData;

        var active = dbData.link;
        if (dbData.link) {
            var pathArray = dbData.link.split('/');
            if (pathArray.length > 1) active = '/' + pathArray[1];
        }
        renderData.active = active;
        renderData.view = dbData.view;
        renderData.text = dbData.text;
        renderData.pageTitle = dbData.title;
        self.setTitle(renderData, dbData.title);
        if (dbData.description) renderData.description = dbData.description;
        if (dbData.keywords) renderData.keywords = dbData.keywords;
    };

    self.prepareTemplatesData = function (req, renderData, doneCallback) {
        var success = false;
        switch (renderData.view) {
            case 'ebook.html': case 'image.html': case 'audio.html': case 'document.html': case 'video.html':
                var formats = [];
                var format = req.params.format;
                var from = req.params.from;
                var to = req.params.to;
                var targetFormat = format;
                if (format) formats.push(format);
                else if (from && to) {
                    formats.push(from);
                    formats.push(to);
                    targetFormat = to;
                }
                if (formats.length > 0) {
                    self.dbManager.getFormatsByExt(formats, function (rows) {
                        if (rows && rows.length > 0) {
                            renderData.formatsInfo = rows;
                            renderData.targetFormat = targetFormat;
                            self.replaceInTitle(formats, renderData, 'title');
                            self.replaceInTitle(formats, renderData, 'pageTitle');
                            var newTitle = tools.stringReplace(formats, renderData.dbData.title);
                            self.updateBreadcrumbs(newTitle, renderData);
                            success = true;
                        }
                        if (typeof doneCallback === "function") doneCallback(success);
                    });
                } else {
                    if (typeof doneCallback === "function") doneCallback(true);
                }
                break;
            case 'top.html':
                var topCount = 50;
                self.dbManager.getTopUsers(topCount, function (rows) {
                    if (rows && rows.length > 0) {
                        rows = self.user.calcLevels(rows);
                        renderData.topUsers = rows;
                        success = true;
                    }
                    if (typeof doneCallback === "function") doneCallback(success);
                });
                break;

            case 'formats.html':
                self.dbManager.getFormats(function (rows) {
                    if (rows && rows.length > 0) {
                        renderData.formats = rows;
                        success = true;
                    }
                    if (typeof doneCallback === "function") doneCallback(success);
                });
                break;

            case 'format_info.html':
                var format = req.params.format;
                self.dbManager.getFormat(format, function (rows) {
                    if (rows && rows.length > 0) {
                        renderData.format = rows[0];
                        self.appendToTitle(rows[0].name, renderData);
                        self.updateBreadcrumbs(rows[0].name, renderData);
                        success = true;
                    }
                    if (typeof doneCallback === "function") doneCallback(success);
                });
                break;

            case 'news.html':
                self.dbManager.readNewsFromDB(function (rows) {
                    if (rows && rows.length > 0) {
                        renderData.news = rows;
                        success = true;
                    }
                    if (typeof doneCallback === "function") doneCallback(success);
                });
                break;

            case 'news_page.html':
                var newsID = req.params.news;
                self.dbManager.readNewsPageFromDB(newsID, function (rows) {
                    if (rows && rows.length > 0) {
                        renderData.news = rows[0];
                        self.appendToTitle(rows[0].title, renderData);
                        self.updateBreadcrumbs(rows[0].title, renderData);
                        success = true;
                    }
                    if (typeof doneCallback === "function") doneCallback(success);
                });
                break;

            default:
                if (typeof doneCallback === "function") doneCallback(true);
        }
    };

    self.initDB = function (params) {
        console.log('Website initDB');
        self.dbManager = dbManagerClass(self.dbInited);
        self.textGenerator = textGeneratorClass();
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
                        globals.port = argValue;
                        console.log('port set to: ' + argValue);
                        break;
                }
            }
        }
    };

    console.log('new Website');
    self.initArgs();

    const config = require('./config');
    const dbManagerClass = require('./db');
    const textGeneratorClass = require('./text_generator');
    const tools = require('./tools');
    const toolsShared = require('./../libs/tools');
    const authSocialClass = require('./auth_social');
    const workNodeManagerClass = require('./work_node_manager');
    const uploaderClass = require('./uploader');
    const userModel = require('./user');

    self.initDB();
    return self;
}

module.exports = Website;

const website = Website();