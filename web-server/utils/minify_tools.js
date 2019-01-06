const compressor = require('node-minify');
const fs = require("fs");

var MinifyTools = function (params) {

    var self = {
        inited: false,
        clientVersionJS: 7, //Need to increase for each new prod version
        clientVersionCSS: 7, //Need to increase for each new prod version
    };

    self.init = function (params) {
        console.log('MinifyTools init');

        //self.clientSide();
        self.serverSide();
    };

    self.clientSide = function (params) {
        console.log('MinifyTools clientSide');

        var newDirJS = './cdn.web-tools.com/js/' + self.clientVersionJS;
        fs.existsSync(newDirJS) || fs.mkdirSync(newDirJS);
        var newDirCSS = './cdn.web-tools.com/css/' + self.clientVersionCSS;
        fs.existsSync(newDirCSS) || fs.mkdirSync(newDirCSS);

        //--------------------- JS --------------------- 

        //Layout head
        compressor.minify({
            compressor: 'gcc',
            input: [
                './cdn.web-tools.com/tpl/js/jquery-1.10.2.js',
                './cdn.web-tools.com/tpl/js/bootstrap.min.js'
            ],
            output: newDirJS + '/head.min.js',
            callback: function (err, min) {
                console.log('MinifyTools clientSide head done');
            }
        });

        //Layout footer
        compressor.minify({
            compressor: 'gcc',
            input: [
                './cdn.web-tools.com/tpl/js/bootstrap-checkbox-radio-switch.js',
                // './cdn.web-tools.com/tpl/js/chartist.min.js',
                './cdn.web-tools.com/tpl/js/bootstrap-notify.js',
                './cdn.web-tools.com/tpl/js/light-bootstrap-dashboard.js'
            ],
            output: newDirJS + '/footer.min.js',
            callback: function (err, min) {
                console.log('MinifyTools clientSide footer done');
            }
        });

        //Uploader
        compressor.minify({
            compressor: 'gcc',
            input: [
                './cdn.web-tools.com/upload/js/bootstrap-select.min.js',
                './cdn.web-tools.com/upload/js/jquery.ui.widget.js',
                './cdn.web-tools.com/upload/js/tmpl.min.js',
                './cdn.web-tools.com/upload/js/canvas-to-blob.min.js',
                './cdn.web-tools.com/upload/js/jquery.iframe-transport.js',
                './cdn.web-tools.com/upload/js/jquery.fileupload.js',
                './cdn.web-tools.com/upload/js/jquery.fileupload-process.js',
                './cdn.web-tools.com/upload/js/jquery.fileupload-validate.js',
                './cdn.web-tools.com/upload/js/jquery.fileupload-ui.js',
                './cdn.web-tools.com/upload/js/main.js'
            ],
            output: newDirJS + '/uploader.min.js',
            callback: function (err, min) {
                console.log('MinifyTools clientSide uploader done');
            }
        });


        //--------------------- CSS --------------------- 

        //Layout
        compressor.minify({
            compressor: 'clean-css',
            input: [
                './cdn.web-tools.com/tpl/css/bootstrap.min.css',
                './cdn.web-tools.com/tpl/css/animate.min.css',
                './cdn.web-tools.com/tpl/css/light-bootstrap-dashboard.css',
                './cdn.web-tools.com/tpl/css/pe-icon-7-stroke.css',
                './cdn.web-tools.com/css/style.css',
                './cdn.web-tools.com/css/faq.css',
                './cdn.web-tools.com/css/plans.css'
            ],
            output: newDirCSS + '/layout.min.css',
            options: {
                advanced: false, // set to false to disable advanced optimizations - selector & property merging, reduction, etc.
                aggressiveMerging: false // set to false to disable aggressive merging of properties.
            },
            callback: function (err, min) {
                console.log('MinifyTools clientSide Layout css done');
            }
        });

        //Uploader
        compressor.minify({
            compressor: 'clean-css',
            input: [
                './cdn.web-tools.com/upload/css/jquery.fileupload.css',
                './cdn.web-tools.com/upload/css/jquery.fileupload-ui.css',
                './cdn.web-tools.com/upload/css/bootstrap-select.min.css'
            ],
            output: newDirCSS + '/uploader.min.css',
            options: {
                advanced: false, // set to false to disable advanced optimizations - selector & property merging, reduction, etc.
                aggressiveMerging: false // set to false to disable aggressive merging of properties.
            },
            callback: function (err, min) {
                console.log('MinifyTools clientSide Uploader css done');
            }
        });

    };

    self.serverSide = function (params) {
        console.log('MinifyTools serverSide');

        var files = self.getFiles('./web-server/');
                
        for (var index = 0; index < files.length; index++) {
            var element = files[index];
            element = element.replace('//','/');
            files[index] = element;
            //
            compressor.minify({
                compressor: 'gcc',
                input: element,
                output: element.replace('web-server', 'web-server-release'),
                callback: function (err, min) { 
                    console.log('MinifyTools one file done');
                }
            });
        }
    };

    self.getFiles = function (dir, files_) {
        files_ = files_ || [];
        var files = fs.readdirSync(dir);
        for (var i in files) {
            var name = dir + '/' + files[i];
            if (fs.statSync(name).isDirectory()) {
                //self.getFiles(name, files_);
            } else {
                if(name.indexOf('.json') == -1) files_.push(name);
            }
        }
        return files_;
    };

    self.init();

    return self;
}

module.exports = MinifyTools;


const minifyTools = MinifyTools();