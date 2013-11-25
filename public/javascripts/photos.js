var photos = [];

function getRequest(value, callback) {
    $.ajax('/photos/' + value + '/', {
        type: 'GET',
        dataType: 'json',
        success: function(data) { 

        	if(value === 'progress') {    
	        	if(data.percent <= 100) {
	        		//if (zip percent > previous percent)
	        		setProgressBar(data.percent);
					zipProgress(data.percent, function(b) {
						setProgressBar(data.percent);
						setTimeout(function() {
							$("#zipModalLabel").text('Done!');
							$("#zipLink.btn.btn-lg.btn-success").removeClass('disabled');
							$("#dropboxLink.btn.btn-lg.btn-info").removeClass('disabled');
						}, 400); // added delay to allow progress bar to update before enabling download buttons
					});
				}
			} 
			
		},

        error  : function(jqXHR, textStatus, errorThrown)     { 
        	console.log("error with request: " +  errorThrown) 
        }
    });
}

function redirectIfLink(d, cb) {
	var redirecting = false;
	if (typeof d === "string") {
		if ( d.charAt(0) === '/') {
			redirecting = true;
			window.location = d;		
		}
	}
	cb(redirecting);

}

function postRequest(type, data) {
       $.ajax({
       		url: "/photos/" + type, 
			type: "POST",
			dataType: "json",
			data: JSON.stringify({d: data}),
			contentType: "application/json",
			cache: false,
			timeout: 10000,

			success: function(d) {
				// call if successful
				redirectIfLink(d, function(redirecting) {
					if(!redirecting) {
						if( type === 'dropZip' ) {
		        			$("#zipModalLabel").text('Sent to Dropbox!');
			        	}

			        	if( type === 'dropOne' ) {
			        		$("#dbModalLink").addClass('disabled');
			        		$("#dbModalLink").text("Sent!");
			        	}

			        	if( type === 'getPhotos' ) {
							if (d !== 'none' && d !== '') {
								for(var i = 0; i < d.length; i++) {

									if(i%4 === 0)  $('#photos').append('<div class="row"></div>');

									var dlLink = d[i].images.standard_resolution.url;
									
									var dlName = dlLink.split('/').pop(); // download = "' + dlName + '"
									var lbl = (d[i].caption !== null) ? d[i].caption.text : '';
									var imgstr = "<a href='#'><img title='" + dlLink + "' class='img_thumbnail' src='" + d[i].images.thumbnail.url + "' alt='" + lbl + "' /></a>";
 
									var likes = 'Likes: ' + d[i].likes.count;
									var info = '<h5>' + lbl + '</h5><p>'+ likes + '</p>';
									
									var chkbox =  '<div class="checkbox"><input type="checkbox" value="' + dlLink + '" id="' + dlName + '" name="check" /><label for="' + dlName + '"></label></div>';

									var colStr = '<div class="col-sm-3 col-md-3"><div class="thumbnail">' + imgstr + chkbox + '</div>' + '</div>';  //'<div class="caption">' + info + '</div>' + chkbox + '</div>'
									$('.row').last().append(colStr);

									photos.push({'src': dlLink, 'title': lbl});
								}
								postRequest('getPhotos'); // get more photos
							}
						}
					}
				});
			},

			error: function() {
				console.log('Cannot fulfill next request');
			}

		});
}


function requestZip(files, callback) {
       $.ajax({
       		url: "/zip", 
			type: "POST",
			dataType: "json",
			data: JSON.stringify({d: files}),
			contentType: "application/json",
			cache: false,
			timeout: 10000,

			success: function(d) {
				zipProgress(0);
			},

			error: function() {
			  console.log('Process error with zipping');
			}

		});
}


function zipProgress(zipPercent, cb) {
	if(zipPercent < 100) {  
			console.log('Request: ', zipPercent);
			setTimeout(function() {
			    getRequest('progress', function(d) {});
	        }, 50); // added delay to reduce requests to server

	} else {
		cb(true);
	}
}

function setProgressBar(amt) {
	$(".progress-bar").css({"width" : (amt + "%")});
}

function displayError (show) {
	if(show) {
		$('#validate.validate').removeClass('hide');
		$('#validate.validate').addClass('show');
	} else {
		$('#validate.validate').removeClass('show');
		$('#validate.validate').addClass('hide');

	}

}

$(function() {
	
    postRequest( 'getPhotos' );

	$('#dl').click(function () {
		var photos = [];

		$('input:checkbox').each(function () {
		       if(this.checked) {
		       	 photos.push($(this).val());
		       } 
		  });
		if(photos.length !=0) {
				displayError(false);
				$("#zipModalLabel").text('Zipping Photos...');
				$("#zipLink.btn.btn-lg.btn-success").addClass('disabled');
				$("#dropboxLink.btn.btn-lg.btn-info").addClass('disabled');
				$('#zipModal').modal('show');

				requestZip(photos, function(d) {});
			} else {
				// show error
				displayError(true);
			}
	});

	$('#dropboxLink').click(function () {
		postRequest('dropZip');
	});

	$('#dbModalLink').click(function () {
		$('#dbModalLink').ajaxStart(function(){
		  $(this).addClass('disabled');
		});
		postRequest('dropOne', $(this).attr('title'));
	});

	$( '#photos' ).on( 'click', 'a', function(e) {
		e.preventDefault(); return true; // prevent scroll ups
	});
	
	$( '#photos' ).on( 'click', 'img', function () { 
		displayError(false);

	  	$( '#instaPhoto' ).attr( "src", $(this).attr('title'));
	  	$( '#dbModalLink').attr( "title", $(this).attr('title'));
	  	$( '#dbModalLink').text( "Send to Dropbox");
	  	$( '#dbModalLink').removeClass('disabled');
	 	$( '#photoModalLabel' ).text( $( this ).attr('alt') );
		$( '#photoModal' ).modal('show');
	
	});

	var showAdjImg = function(type) {
		
		var currImg = $( '#instaPhoto' ).attr( "src" );
		var index = -1;
		photos.map(function(imgObj) {
			if (imgObj.src === currImg) index = photos.indexOf(imgObj);
		});

		if(type === 'next') {
			if (index === photos.length - 1 ) {
				index = 0;
			} else {
				index++;
			}
		}

		if(type === 'prev') {
			if (index === 0 ) {
				index = photos.length - 1;
			} else {
				index--;
			}
		}

		$( '#instaPhoto' ).attr( "src", photos[index].src );
	 	$( '#photoModalLabel' ).text( photos[index].title );
	 	$( '#dbModalLink').attr( "title", photos[index].src );
	 	$( '#dbModalLink').text( "Send to Dropbox");
	  	$( '#dbModalLink').removeClass('disabled');
	};

	$( '#nextLink' ).click ( function(e) {
		e.preventDefault(); // prevent scroll ups
		showAdjImg('next');
		$(this).blur();
	});

	$( '#prevLink' ).click ( function(e) {
		e.preventDefault(); // prevent scroll ups

		showAdjImg('prev');
		$(this).blur();

	});

	$( '#photos' ).click( function() {
		displayError(false);
	});

	$('#select').click(function () {
		var label;
		$(this).text(function (i, text) {
			$('input:checkbox').each(function () {
			    if (text === 'Clear All') {
					if(this.checked)  this.checked = false;
			    } else {
			   	   if(!this.checked)  this.checked = true;
			    }
			});

			if (text === 'Clear All') {
			    $(this).text("Select All");
			} else {
			   	$(this).text("Clear All");
		    }

		});
		
	});

});




