/*
 * jQuery File Upload User Interface Plugin
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 */

/* jshint nomen:false */
/* global define, require, window */

;(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define([
            'jquery',
            'blueimp-tmpl',
            //'./jquery.fileupload-image',
            //'./jquery.fileupload-audio',
            //'./jquery.fileupload-video',
            './jquery.fileupload-validate'
        ], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS:
        factory(
            require('jquery'),
            require('blueimp-tmpl'),
            //require('./jquery.fileupload-image'),
            //require('./jquery.fileupload-audio'),
            //require('./jquery.fileupload-video'),
            require('./jquery.fileupload-validate')
        );
    } else {
        // Browser globals:
        factory(
            window.jQuery,
            window.tmpl
        );
    }
}(function ($, tmpl) {
    'use strict';

    $.blueimp.fileupload.prototype._specialOptions.push(
        'filesContainer',
        'uploadTemplateId',
        'downloadTemplateId'
    );

    // The UI version extends the file upload widget
    // and adds complete user interface interaction:
    $.widget('blueimp.fileupload', $.blueimp.fileupload, {

        options: {
			//In ms
			canUploadCheckTimeout: 1000,
			//In ms
			statusCheckTimeout: 2000,
            // By default, files added to the widget are uploaded as soon
            // as the user clicks on the start buttons. To enable automatic
            // uploads, set the following option to true:
            autoUpload: false,
            // The ID of the upload template:
            uploadTemplateId: 'template-upload',
            // The ID of the download template:
            downloadTemplateId: 'template-download',
            // The container for the list of files. If undefined, it is set to
            // an element with class "files" inside of the widget element:
            filesContainer: undefined,
            // By default, files are appended to the files container.
            // Set the following option to true, to prepend files instead:
            prependFiles: true,
            // The expected data type of the upload response, sets the dataType
            // option of the $.ajax upload requests:
            dataType: 'json',

            // Error and info messages:
            messages: {
                unknownError: 'Unknown error'
            },

			steps: {
				ready: 'ready',
				downloading: 'downloading',
				received: 'received',
				working: 'working',
				converted: 'converted',
				uploading: 'uploading',
				uploaded: 'uploaded',
				error: 'error'
			},
			
			checkStatusUUIDS: {},
			UUIDSdata: {},
			
            // Function returning the current number of files,
            // used by the maxNumberOfFiles validation:
            getNumberOfFiles: function () {
                return this.filesContainer.children()
                    .not('.processing').length;
            },

            // Callback to retrieve the list of files from the server response:
            getFilesFromResponse: function (data) {
                if (data.result && $.isArray(data.result.files)) {
                    return data.result.files;
                }
                return [];
            },
			
            // The add callback is invoked as soon as files are added to the fileupload
            // widget (via file input selection, drag & drop or add API call).
            // See the basic file upload widget for more information:
            add: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var $this = $(this),
                    that = $this.data('blueimp-fileupload') ||
                        $this.data('fileupload'),
                    options = that.options;
                data.context = that._renderUpload(data.files)
                    .data('data', data)
                    .addClass('processing');
                options.filesContainer[
                    options.prependFiles ? 'prepend' : 'append'
                ](data.context);
                that._forceReflow(data.context);
                that._transition(data.context);
                data.process(function () {
                    return $this.fileupload('process', data);
                }).always(function () {
                    data.context.each(function (index) {
                        $(this).find('.size').text(
                            that._formatFileSize(data.files[index].size)
                        );
						$(this).find('.status p').html(lang.ready);
						$(this).find("li:contains('" + data.files[index].ext + "')").remove();
						var selectedFormat = $(this).find('.dropdown.format button span').text();
						selectedFormat = $.trim(selectedFormat);
						if(selectedFormat == data.files[index].ext) {
							var newFormat = $(this).find('.dropdown.format li:first-child a').text();
							$(this).find('.dropdown.format button span:first-child').text(newFormat);
						}
                    }).removeClass('processing');
                    that._renderPreviews(data);
                }).done(function () {
                    data.context.find('.start').prop('disabled', false);
                    if ((that._trigger('added', e, data) !== false) &&
                            (options.autoUpload || data.autoUpload) &&
                            data.autoUpload !== false) {
                        data.submit();
                    }
                }).fail(function () {
                    if (data.files.error) {
                        data.context.each(function (index) {
                            var error = data.files[index].error;
                            if (error) {
                                $(this).find('.error').text(error);
                            }
                        });
                    }
                });
				//Enable start all
				$this.find('.fileupload-buttonbar .start').prop('disabled', false);
            },
            // Callback for the start of each file upload request:
            send: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var that = $(this).data('blueimp-fileupload') ||
                        $(this).data('fileupload');
                if (data.context && data.dataType &&
                        data.dataType.substr(0, 6) === 'iframe') {
                    // Iframe Transport does not support progress events.
                    // In lack of an indeterminate progress bar, we set
                    // the progress to 100%, showing the full animated bar:
                    data.context
                        .find('.progress').addClass(
                            !$.support.transition && 'progress-animated'
                        )
                        .attr('aria-valuenow', 100)
                        .children().first().css(
                            'width',
                            '100%'
                        );
                }
				//Add convertion format
				data.headers.type = $('#toolType').val();
				data.headers.format = data.context.find('.dropdown button span:first-child').html();
				data.headers.filename = data.files[0].name;
                return that._trigger('sent', e, data);
            },
            // Callback for successful uploads:
            done: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var that = $(this).data('blueimp-fileupload') ||
                        $(this).data('fileupload'),
                    getFilesFromResponse = data.getFilesFromResponse ||
                        that.options.getFilesFromResponse,
                    files = getFilesFromResponse(data),
                    template,
                    deferred;
                if (data.context) {
                    data.context.each(function (index) {
                        var file = data.result ||
                                {error: 'Empty file upload result'};
						if(that._addToCheckStatusIfNeed(file)) {
							$(this).find("input[name='uuid']").val(file.uuid);
							that.options.UUIDSdata[file.uuid] = file;
							that._updateUploadItem($(this), file);
						} else {
							deferred = that._addFinishedDeferreds();
							that._transition($(this)).done(
								function () {
									var node = $(this);
									template = that._renderDownload([file])
										.replaceAll(node);
									template.find('.filename .size').text(
										that._formatFileSize(file.size)
									);
									template.find('.new_filename .size').text(
										that._formatFileSize(file.new_size)
									);
									that._updateDownloadItem(template, file);
									that._forceReflow(template);
									that._transition(template).done(
										function () {
											data.context = $(this);
											that._trigger('completed', e, data);
											that._trigger('finished', e, data);
											deferred.resolve();
										}
									);
								}
							);
						}
                    });
                } else {
					//Starting objects
					files.forEach(function(file){
						if(that._isStatusForUpload(file.status)) {
							template = that._renderUpload([file])[
							that.options.prependFiles ? 'prependTo' : 'appendTo'
							](that.options.filesContainer);
							that._updateUploadItem(template, file);
						} else {
							template = that._renderDownload([file])[
							that.options.prependFiles ? 'prependTo' : 'appendTo'
							](that.options.filesContainer);
							that._updateDownloadItem(template, file);
						}
						that.options.UUIDSdata[file.uuid] = file;
						that._forceReflow(template);
						deferred = that._addFinishedDeferreds();
						template.find('.filename .size').text(
							that._formatFileSize(file.size)
						);
						template.find('.new_filename .size').text(
							that._formatFileSize(file.new_size)
						);
						that._transition(template).done(
							function () {
								data.context = $(this);
								that._trigger('completed', e, data);
								that._trigger('finished', e, data);
								deferred.resolve();
							}
						);
					}.bind(this));
                }
            },
            // Callback for failed (abort or error) uploads:
            fail: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var that = $(this).data('blueimp-fileupload') ||
                        $(this).data('fileupload'),
                    template,
                    deferred;
                if (data.context) {
                    data.context.each(function (index) {
                        if (data.errorThrown !== 'abort') {
                            var file = data.files[index];
                            file.error = file.error || data.errorThrown ||
                                data.i18n('unknownError');
                            deferred = that._addFinishedDeferreds();
                            that._transition($(this)).done(
                                function () {
                                    var node = $(this);
                                    template = that._renderDownload([file])
                                        .replaceAll(node);
                                    that._forceReflow(template);
                                    that._transition(template).done(
                                        function () {
                                            data.context = $(this);
                                            that._trigger('failed', e, data);
                                            that._trigger('finished', e, data);
                                            deferred.resolve();
                                        }
                                    );
                                }
                            );
                        } else {
                            deferred = that._addFinishedDeferreds();
                            that._transition($(this)).done(
                                function () {
                                    $(this).remove();
                                    that._trigger('failed', e, data);
                                    that._trigger('finished', e, data);
                                    deferred.resolve();
                                }
                            );
                        }
                    });
                } else if (data.errorThrown !== 'abort') {
                    data.context = that._renderUpload(data.files)[
                        that.options.prependFiles ? 'prependTo' : 'appendTo'
                    ](that.options.filesContainer)
                        .data('data', data);
                    that._forceReflow(data.context);
                    deferred = that._addFinishedDeferreds();
                    that._transition(data.context).done(
                        function () {
                            data.context = $(this);
                            that._trigger('failed', e, data);
                            that._trigger('finished', e, data);
                            deferred.resolve();
                        }
                    );
                } else {
                    that._trigger('failed', e, data);
                    that._trigger('finished', e, data);
                    that._addFinishedDeferreds().resolve();
                }
            },
            // Callback for upload progress events:
            progress: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var progress = Math.floor(data.loaded / data.total * 100);
                if (data.context) {
                    data.context.each(function () {
                        $(this).find('.progress')
                            .attr('aria-valuenow', progress)
                            .children().first().css(
                                'width',
                                progress + '%'
                            );
                    });
                }
            },
            // Callback for global upload progress events:
            progressall: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var $this = $(this),
                    progress = Math.floor(data.loaded / data.total * 100),
                    globalProgressNode = $this.find('.fileupload-progress'),
                    extendedProgressNode = globalProgressNode
                        .find('.progress-extended');
                if (extendedProgressNode.length) {
                    extendedProgressNode.html(
                        ($this.data('blueimp-fileupload') || $this.data('fileupload'))
                            ._renderExtendedProgress(data)
                    );
                }
                globalProgressNode
                    .find('.progress')
                    .attr('aria-valuenow', progress)
                    .children().first().css(
                        'width',
                        progress + '%'
                    );
            },
            // Callback for uploads start, equivalent to the global ajaxStart event:
            start: function (e) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var that = $(this).data('blueimp-fileupload') ||
                        $(this).data('fileupload');
                that._resetFinishedDeferreds();
                that._transition($(this).find('.fileupload-progress')).done(
                    function () {
                        that._trigger('started', e);
                    }
                );
            },
            // Callback for uploads stop, equivalent to the global ajaxStop event:
            stop: function (e) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var that = $(this).data('blueimp-fileupload') ||
                        $(this).data('fileupload'),
                    deferred = that._addFinishedDeferreds();
                $.when.apply($, that._getFinishedDeferreds())
                    .done(function () {
                        that._trigger('stopped', e);
                    });
                that._transition($(this).find('.fileupload-progress')).done(
                    function () {
                        $(this).find('.progress')
                            .attr('aria-valuenow', '0')
                            .children().first().css('width', '0%');
                        $(this).find('.progress-extended').html('&nbsp;');
                        deferred.resolve();
                    }
                );
            },
            processstart: function (e) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                $(this).addClass('fileupload-processing');
            },
            processstop: function (e) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                $(this).removeClass('fileupload-processing');
            },
            // Callback for file deletion:
            destroy: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                var that = $(this).data('blueimp-fileupload') ||
                        $(this).data('fileupload'),
                    removeNode = function () {
                        that._transition(data.context).done(
                            function () {
                                $(this).remove();
                                that._trigger('destroyed', e, data);
                            }
                        );
                    };
                if (data.url) {
                    data.dataType = data.dataType || that.options.dataType;
                    $.ajax(data).done(removeNode).fail(function () {
                        that._trigger('destroyfailed', e, data);
                    });
                } else {
                    removeNode();
                }
            }
        },

        _resetFinishedDeferreds: function () {
            this._finishedUploads = [];
        },

        _addFinishedDeferreds: function (deferred) {
            if (!deferred) {
                deferred = $.Deferred();
            }
            this._finishedUploads.push(deferred);
            return deferred;
        },

        _getFinishedDeferreds: function () {
            return this._finishedUploads;
        },

        // Link handler, that allows to download files
        // by drag & drop of the links to the desktop:
        _enableDragToDesktop: function () {
            var link = $(this),
                url = link.prop('href'),
                name = link.prop('download'),
                type = 'application/octet-stream';
            link.bind('dragstart', function (e) {
                try {
                    e.originalEvent.dataTransfer.setData(
                        'DownloadURL',
                        [type, name, url].join(':')
                    );
                } catch (ignore) {}
            });
        },

        _formatFileSize: function (bytes) {
            if (typeof bytes !== 'number') {
                return '';
            }
            if (bytes >= 1000000000) {
                return (bytes / 1000000000).toFixed(2) + ' GB';
            }
            if (bytes >= 1000000) {
                return (bytes / 1000000).toFixed(2) + ' MB';
            }
			if (bytes >= 1000) {
                return (bytes / 1000).toFixed(2) + ' KB';
            }
            return bytes.toFixed(2) + ' B';
        },

        _formatBitrate: function (bits) {
            if (typeof bits !== 'number') {
                return '';
            }
            if (bits >= 1000000000) {
                return (bits / 1000000000).toFixed(2) + ' Gbit/s';
            }
            if (bits >= 1000000) {
                return (bits / 1000000).toFixed(2) + ' Mbit/s';
            }
            if (bits >= 1000) {
                return (bits / 1000).toFixed(2) + ' kbit/s';
            }
            return bits.toFixed(2) + ' bit/s';
        },

        _formatTime: function (seconds) {
            var date = new Date(seconds * 1000),
                days = Math.floor(seconds / 86400);
            days = days ? days + 'd ' : '';
            return days +
                ('0' + date.getUTCHours()).slice(-2) + ':' +
                ('0' + date.getUTCMinutes()).slice(-2) + ':' +
                ('0' + date.getUTCSeconds()).slice(-2);
        },

        _formatPercentage: function (floatValue) {
            return (floatValue * 100).toFixed(2) + ' %';
        },

        _renderExtendedProgress: function (data) {
            return this._formatBitrate(data.bitrate) + ' | ' +
                this._formatTime(
                    (data.total - data.loaded) * 8 / data.bitrate
                ) + ' | ' +
                this._formatPercentage(
                    data.loaded / data.total
                ) + ' | ' +
                this._formatFileSize(data.loaded) + ' / ' +
                this._formatFileSize(data.total);
        },

        _renderTemplate: function (func, files) {
            if (!func) {
                return $();
            }
            var result = func({
                files: files,
                formatFileSize: this._formatFileSize,
                options: this.options
            });
            if (result instanceof $) {
                return result;
            }
            return $(this.options.templatesContainer).html(result).children();
        },

        _renderPreviews: function (data) {
            data.context.find('.preview').each(function (index, elm) {
                $(elm).append(data.files[index].preview);
            });
        },

        _renderUpload: function (files) {
			files = this._filesVarsUpdate(files);
            return this._renderTemplate(
                this.options.uploadTemplate,
                files
            );
        },

		_filesVarsUpdate: function(files){
			for(var i = 0; i < files.length;i++) {
				var file = files[i];
				var fileParts = file.name.split('.');
				var ext = fileParts.pop();
				if(fileParts.length == 0) ext = '';
				file.ext = ext;
				file.new_name = fileParts.join('') + '.' + file.format;
				if(!file.status) file.status = this.options.steps.ready;
				this._addToCheckStatusIfNeed(file);
			}
			return files;
		},
		
		_addToCheckStatusIfNeed: function(file){
			if(file && file.uuid && file.status) {
				if(this._isStatusForUpload(file.status)) {
					this.options.checkStatusUUIDS[file.uuid] = file.status;
					return true;
				}
			}
			return false;
		},
		
        _renderDownload: function (files) {
			files = this._filesVarsUpdate(files);
            return this._renderTemplate(
                this.options.downloadTemplate,
                files
            ).find('a[download]').each(this._enableDragToDesktop).end();
        },

		_startAllCheckEnabled: function() {
			var filesList = this.options.filesContainer;
			var startAllButton = this.element.find('.fileupload-buttonbar .start');
			var enableStartAll = false;
			filesList.find('.template-upload .start').each(function () {
				if($(this).prop('disabled') == false) enableStartAll = true;
			}).promise().done(function() {
				if(enableStartAll) startAllButton.prop('disabled', false);
				else startAllButton.prop('disabled', true);
			});
		},
		
        _startHandler: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget),
                template = button.closest('.template-upload'),
                data = template.data('data');
            button.prop('disabled', true);
			template.find('.dropdown button').prop('disabled', true);
			template.find('.status p').html(lang.queue);
			
			var canUploadCheckTimeout = this.options.canUploadCheckTimeout,
				canUpload = this._canUpload;
   
			var startUploadOnReady = function() {
				template.find('.status p').html(lang.downloading);
				if (data && data.submit) data.submit();
			};
			
			var checkCanUploadAgain = function() {
				setTimeout(function(){
					canUpload(startUploadOnReady, checkCanUploadAgain);
				},canUploadCheckTimeout);
			};
			canUpload(startUploadOnReady, checkCanUploadAgain);
			
			this._startAllCheckEnabled();
        },
		
		_startDownloadHandler: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget),
                template = button.closest('.template-download'),
				link = template.find('a');
			window.location.href = link.attr('href');
        },
		
        _startHandlerNoMouseForOneItem: function (itemContext) {
			var button = itemContext,
                template = button.closest('.template-upload'),
                data = template.data('data');
			if(button.hasClass('started')) return;
            button.prop('disabled', true);
			template.find('.dropdown button').prop('disabled', true);
			template.find('.status p').html(lang.downloading);
            if (data && data.submit) {
				data.submit();
				button.addClass('started');
            }			
        },
		
        _cancelHandler: function (e) {
            e.preventDefault();
            var template = $(e.currentTarget)
                    .closest('.template-upload,.template-download'),
                data = template.data('data') || {};
            data.context = data.context || template;
            if (data.abort) {
                data.abort();
            } else {
                data.errorThrown = 'abort';
                this._trigger('fail', e, data);
            }
			this._startAllCheckEnabled();
        },

        _deleteHandler: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
			button.closest('.template-download').find('button').prop('disabled', true);
            this._trigger('destroy', e, $.extend({
                context: button.closest('.template-download'),
                type: 'DELETE'
            }, button.data()));
			this._startAllCheckEnabled();
        },

        _forceReflow: function (node) {
            return $.support.transition && node.length &&
                node[0].offsetWidth;
        },

        _transition: function (node) {
            var dfd = $.Deferred();
			node.removeClass('in');
			node.removeClass('fade');
            dfd.resolveWith(node);
            return dfd;
        },

        _initButtonBarEventHandlers: function () {
            var fileUploadButtonBar = this.element.find('.fileupload-buttonbar'),
                filesList = this.options.filesContainer,
				oneItemStartHandler = this._startHandlerNoMouseForOneItem,
				startAllButton = fileUploadButtonBar.find('.start'),
				canUploadCheckTimeout = this.options.canUploadCheckTimeout,
				canUpload = this._canUpload;
            this._on(startAllButton, {
                click: function (e) {
                    e.preventDefault();
					
					if(filesList.find('.template-upload .start').length > 0) {
						filesList.find('.template-upload .start').prop('disabled', true).addClass('fromAll');
						
						filesList.find('.template-upload .dropdown button').each(function () {
							var itemContext = $(this);
							if(!itemContext.prop('disabled')) {
								itemContext.prop('disabled', true);
								itemContext.closest('.template-upload').find('.status p').html(lang.queue);
							}
						});
						
						startAllButton.prop('disabled', true);
					} else {
						//No items to proccess
						return;
					}
                    
					var startUploadOnReady = function(filesCount) {
						var startedCount = 0;
						var againCalled = false;
						filesList.find('.template-upload .start.fromAll').each(function () {
							var itemContext = $(this);
							
							if(!itemContext.hasClass('started')) startedCount++;
							if(startedCount <= filesCount) {
								oneItemStartHandler(itemContext);
							} else {
								if(!againCalled) {
									againCalled = true;
									checkCanUploadAgain();
								}
								return;
							}
						});
					};
					var checkCanUploadAgain = function() {
						setTimeout(function(){
							canUpload(startUploadOnReady, checkCanUploadAgain);
						},canUploadCheckTimeout);
					};
					canUpload(startUploadOnReady, checkCanUploadAgain);
                }
            });
            this._on(fileUploadButtonBar.find('.cancel'), {
                click: function (e) {
                    e.preventDefault();
                    filesList.find('.cancel').click();
                }
            });
            this._on(fileUploadButtonBar.find('.delete'), {
                click: function (e) {
                    e.preventDefault();
                    filesList.find('.toggle:checked')
                        .closest('.template-download')
                        .find('.delete').click();
                    fileUploadButtonBar.find('.toggle')
                        .prop('checked', false);
                }
            });
            this._on(fileUploadButtonBar.find('.toggle'), {
                change: function (e) {
                    filesList.find('.toggle').prop(
                        'checked',
                        $(e.currentTarget).is(':checked')
                    );
                }
            });
        },
		
        _destroyButtonBarEventHandlers: function () {
            this._off(
                this.element.find('.fileupload-buttonbar')
                    .find('.start, .cancel, .delete'),
                'click'
            );
            this._off(
                this.element.find('.fileupload-buttonbar .toggle'),
                'change.'
            );
        },

        _initEventHandlers: function () {
            this._super();
            this._on(this.options.filesContainer, {
                'click .start': this._startHandler,
				'click .startDownload': this._startDownloadHandler,
				'click .template-download a': this._startDownloadHandler,
                'click .cancel': this._cancelHandler,
                'click .delete': this._deleteHandler
            });
            this._initButtonBarEventHandlers();
        },

        _destroyEventHandlers: function () {
            this._destroyButtonBarEventHandlers();
            this._off(this.options.filesContainer, 'click');
            this._super();
        },

        _enableFileInputButton: function () {
            this.element.find('.fileinput-button input')
                .prop('disabled', false)
                .parent().removeClass('disabled');
        },

        _disableFileInputButton: function () {
            this.element.find('.fileinput-button input')
                .prop('disabled', true)
                .parent().addClass('disabled');
        },

        _initTemplates: function () {
            var options = this.options;
            options.templatesContainer = this.document[0].createElement(
                options.filesContainer.prop('nodeName')
            );
            if (tmpl) {
                if (options.uploadTemplateId) {
                    options.uploadTemplate = tmpl(options.uploadTemplateId);
                }
                if (options.downloadTemplateId) {
                    options.downloadTemplate = tmpl(options.downloadTemplateId);
                }
            }
        },

        _initFilesContainer: function () {
            var options = this.options;
            if (options.filesContainer === undefined) {
                options.filesContainer = this.element.find('.files');
            } else if (!(options.filesContainer instanceof $)) {
                options.filesContainer = $(options.filesContainer);
            }
        },

        _initSpecialOptions: function () {
            this._super();
            this._initFilesContainer();
            this._initTemplates();
        },

        _create: function () {
            this._super();
            this._resetFinishedDeferreds();
            if (!$.support.fileInput) {
                this._disableFileInputButton();
            }
			setInterval(this._statusCheck.bind(this), this.options.statusCheckTimeout);
        },

		_isStatusForUpload: function(status) {
			switch(status) {
				case this.options.steps.ready:
				case this.options.steps.received:
				case this.options.steps.working:
				case this.options.steps.converted:
				case this.options.steps.uploading:
					return true;
				break;
			}
			return false;
		},
		
		_statusCheck: function(){
			var ids = [];
			for(var key in this.options.checkStatusUUIDS) {
				var status = this.options.checkStatusUUIDS[key];
				ids.push(key);
			}
			if(ids.length == 0) return;
			$.ajax({
			  url: "/status",
			  type: 'POST',
			  data:{ids:ids},
			  cache: false
			}).done(this._statusCheckDone.bind(this));
		},
		
		_statusCheckDone: function(data){
			if(data) {
				data.forEach( (function(item) { 
					if(this._isStatusForUpload(item.status)) {
						this._updateUploadItem($("input[value='"+item.uuid+"']").closest("tr"), item);
					} else {
						for (var key in item) {
						  this.options.UUIDSdata[item.uuid][key] = item[key];
						}
						var options = {
							context:$("input[value='"+item.uuid+"']").closest("tr.template-upload"),
							result: this.options.UUIDSdata[item.uuid]
						};
						this._trigger('done', null, options);
						delete this.options.UUIDSdata[item.uuid];
						delete this.options.checkStatusUUIDS[item.uuid];
					}
				}).bind(this));
			}
		},
		
		_updateUploadItem: function(template, item){
			var statusText = lang[item.status];
			template.find(".status p").text(statusText);
			template.find("button").prop('disabled',true);
			template.find('.progress').addClass(
				!$.support.transition && 'progress-animated'
			)
			.attr('aria-valuenow', 100)
			.children().first().css(
				'width',
				'100%'
			);
		},
		
		_updateDownloadItem: function(template, item){
			var statusText = lang[item.status];
			template.find(".status p").text(statusText);
			if(item.status == this.options.steps.error) {
				template.find("button.startDownload").prop('disabled',true);
			}
		},
		
		_canUpload: function(onTrue, onFalse) {
			$.ajax({
			  url: "/canupload",
			  cache: false
			}).done(function( data ) {
				if(data.ready) {
					if(onTrue != null) onTrue(data.files);
				} else {
					if(onFalse != null) onFalse();
				}
			});
		},
		
        enable: function () {
            var wasDisabled = false;
            if (this.options.disabled) {
                wasDisabled = true;
            }
            this._super();
            if (wasDisabled) {
                this.element.find('input, button').prop('disabled', false);
                this._enableFileInputButton();
            }
        },

        disable: function () {
            if (!this.options.disabled) {
                this.element.find('input, button').prop('disabled', true);
                this._disableFileInputButton();
            }
            this._super();
        },

    });

}));