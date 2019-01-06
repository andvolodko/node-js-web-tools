/*
 * jQuery File Upload Plugin JS Example
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 */

/* global $, window */
var lang = {
	//fileupload-ui
	ready: 'Ready for upload',
	queue: 'Waiting in queue',
	downloading: 'Uploading',
	uploading: 'Moving',
	received: 'Received. Queue',
	working: 'Сonverting',
	converted: 'Converted',
	error: 'Error',
	
	//main.js this
	levelUptext:"<center>You've Reached<br><b>Level %1</b><br>Congratulations!</center>"
};
var global = {
	userUpdating: false
};

$(function () {
    'use strict';

    // Initialize the jQuery File Upload widget:
    $('#fileupload').fileupload({
        // Uncomment the following to send cross-domain cookies:
        //xhrFields: {withCredentials: true},
        url: '/upload'
    });

    // Enable iframe cross-domain access via redirect option:
    $('#fileupload').fileupload(
        'option',
        'redirect',
        window.location.href.replace(
            /\/[^\/]*$/,
            '/cors/result.html?%s'
        )
    );

	// Load existing files:
	$('#fileupload').addClass('fileupload-processing');
	$.ajax({
		// Uncomment the following to send cross-domain cookies:
		//xhrFields: {withCredentials: true},
		url: $('#fileupload').fileupload('option', 'url') + '/' + $('#toolType').val(),
		dataType: 'json',
		cache: false,
		context: $('#fileupload')[0]
	}).always(function () {
		$(this).removeClass('fileupload-processing');
		$('.drop_holder').removeClass('loading');
		setTimeout(checkDragPanel, 100);
	}).done(function (result) {
		$(this).fileupload('option', 'done')
			.call(this, $.Event('done'), {result: result});
	});
		
	$('#fileupload').bind('fileuploadadded', function (e, data) {
			$('.selectpicker').selectpicker();
			$('.selectpicker').selectpicker('render');

			checkDragPanel();
		}
	);
	
	$('#fileupload').bind('fileuploaddestroy fileuploadfail fileuploaddone fileuploadalways fileuploadstop fileuploadchange fileuploadfinished', function (e, data) {
			setTimeout(checkDragPanel, 100);
		}
	);
	
	setTimeout(function(){
		$('#fileupload').bind('fileuploadfinished', function (e, data) {
				if(!global.userUpdating) {
					global.userUpdating = true;
					$.ajax({
					  url: "/user",
					  cache: false
					}).done(function( data ) {
						updateExp(data.level,data.exp);
						global.userUpdating = false;
					});
				}
			}
		);	
	}, 3000);
	
	initDragPanel();
});

function updateExp(newLevel, newProgress) {
	var oldLevel = $('h4.level span').text();
	
	//Update progress
	$('div.levelinfo div.progress').addClass(
		!$.support.transition && 'progress-animated'
	).
	attr('aria-valuenow', newProgress).
	children().first().css(
		'width',
		newProgress + '%'
	);
	
	if(newLevel != oldLevel) {
		$('h4.level span').text(newLevel);
		var levelUptext = lang.levelUptext.replace('%1',newLevel);
		showNotification(levelUptext);
	}
}

function showNotification(text){
	var from = 'top';
	var align = 'center';
	var color = 2;
	var type = ['','info','success','warning','danger'];
	
	$.notify({
		icon: "pe-7s-gift",
		message: text
	},{
		type: type[color],
		timer: 4000000,
		placement: {
			from: from,
			align: align
		}
	});
}
function initDragPanel() {
	var dragTimer;
	$(document).on('dragover', function(e) {
	  var dt = e.originalEvent.dataTransfer;
	  if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') != -1 : dt.types.contains('Files'))) {
		$('body').addClass('hover');
		window.clearTimeout(dragTimer);
	  }
	});
	function dragend(e) {
	  dragTimer = window.setTimeout(function() {
		$('body').removeClass('hover');
		return false;
	  }, 25);
	}
	$(document).on('dragleave', dragend);
	$(document).on('dragend', dragend);
	$(document).on('drop', dragend);
	$('.drag-indicator').on('click', dragend);
	$('.drag-indicator').mouseup(dragend);	
}

function checkDragPanel() {
	if($('#fileupload tr').length > 0) $('.drop_here').hide();
	else $('.drop_here').show();
}

function setFormat(newFormat, element){
	$(element).closest('.dropdown').find('button span:first-child').text(newFormat);
	return false;
}