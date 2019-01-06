const dateFormat = require('dateformat');
const fs = require('fs');

var Sitemap = function (websiteLocal) {

    var website = websiteLocal
        , app = websiteLocal.app
        , config = require('./config')
        , util = require('util');

    var self = {
        formats: null,
        news: null
    };

    self.init = function () {
        console.log('Sitemap init');
        app.get('/sitemap-generate', self.generateSitemap);
        website.dbManager.readNewsFromDB(function (rows) {
            if (rows && rows.length > 0) {
                self.news = rows;

                website.dbManager.getFormats(function (rows2) {
                    if (rows2 && rows2.length > 0) {
                        self.formats = rows2;
                    }
                });

            }
        });
    };

    self.generateSitemap = function (req, res) {
        var renderData =
            {
                sitemap: []
            };
        //Pages
        for (var index = 0; index < config.db.pages.length; index++) {
            var pageElement = config.db.pages[index];
            var linkParams = pageElement.link.split('/');
            if (linkParams.length <= 2) {
                var loc = pageElement.link;
                if (!pageElement.link) loc = '/';
                var entryData = self.getEntryData();
                entryData.loc = entryData.loc + loc;
                renderData.sitemap.push(entryData);
            }
        }
        //Blog
        for (var index = 0; index < self.news.length; index++) {
            var pageElement = self.news[index];
            var entryData = self.getEntryData();
            entryData.loc = entryData.loc + '/blog/' + pageElement.link;
            renderData.sitemap.push(entryData);
        }
        //Formats
        self.addFormat(config.tools.ebookOut, renderData.sitemap);
        self.addFormat(config.tools.imagesOut, renderData.sitemap);
        self.addFormat(config.tools.audioOut, renderData.sitemap);
        self.addFormat(config.tools.videoOut, renderData.sitemap);
        self.addFormat(config.tools.documentOut, renderData.sitemap);

        //TODO Remove duplicates

        var html = website.renderer.render('sitemap.xml', renderData);
        res.send(html);
        console.log('sitemap.xml links count: ' + renderData.sitemap.length);

        fs.writeFile(__dirname + '/static/sitemap.xml', html);
        console.log('File sitemap.xml saved to static folder');
    };

    self.getEntryData = function () {
        var currentDate = new Date();
        var lastmod = dateFormat(currentDate, 'yyyy-mm-dd');
        return {
            loc: config.db.config.site_url,
            lastmod: lastmod,
            changefreq: 'weekly'
        };
    };

    self.addFormat = function (formatsArray, sitemapArray) {
        for (var i = 0; i < formatsArray.length; i++) {
            var format = formatsArray[i];
            var converterLink = self.getConverterLink(format);

            var entryData = self.getEntryData();
            entryData.loc = entryData.loc + '/formats/' + format;
            sitemapArray.push(entryData);

            var entryData = self.getEntryData();
            entryData.loc = entryData.loc + converterLink + '/' + format;
            sitemapArray.push(entryData);

            for (var j = 0; j < formatsArray.length; j++) {
                var format2 = formatsArray[j];
                if(format2 != format) {
                    var entryData = self.getEntryData();
                    entryData.loc = entryData.loc + converterLink + '/' + format + '-to-' + format2;
                    sitemapArray.push(entryData);
                }
            }
        }
    };

    self.getConverterLink = function(format) {
        for (var i = 0; i < self.formats.length; i++) {
            var formatDbData = self.formats[i];
            if(formatDbData.ext == format) return formatDbData.link;
        }
        return '';
    };

    console.log('new Sitemap');
    self.init();
    return self;
}

module.exports = Sitemap;