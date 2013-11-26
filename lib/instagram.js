var http = require('http');
var https = require('../lib/https.js');
var urlParser = require('url');
var qs = require('querystring');
var fs = require('fs');
var sys = require('sys');
var events = require('events');
var async = require('async');

/**************************************************************************
    InstagramAPI class
    Handles OAuth requests
**************************************************************************/

function InstagramAPI (api_key, api_secret, redirect_uri) {
	this.api_key = api_key;
	this.api_secret = api_secret;
	this.redirect_uri = redirect_uri;
	this.authURL = 'https://api.instagram.com/oauth/authorize/?client_id=' + api_key + '&redirect_uri=' + redirect_uri + '&response_type=code';

}

sys.inherits(InstagramAPI, events.EventEmitter);

InstagramAPI.prototype.authorize = function(handler) {
	handler.doAction('redirect', this.authURL);
};

InstagramAPI.prototype.accessToken = function(code, cb) {

	if(code) {

    	var auth = qs.stringify({
			    'client_id': this.api_key,
			    'client_secret': this.api_secret,
			    'grant_type': 'authorization_code',
			    'redirect_uri': this.redirect_uri,
			    'code': code
				});

		var options = {
				hostname: 'api.instagram.com',
				path:'/oauth/access_token',
	 			port: 443,
	 			method: 'POST',
	 			headers: {
	 				'Content-Length': auth.length
	 			}
	 		};

		https.request(options, auth, function(resp, err) {
			cb(resp, err);
		});
		
	}
	
};

InstagramAPI.prototype.subscribe = function (user_id, token, cb) {

    	var auth = qs.stringify({
			    'client_id': this.api_key,
			    'client_secret': this.api_secret,
			    'object': 'user',
			    'object_id': user_id,
			    'aspect': 'media',
			    'verify_token': token,
			    'callback_url': this.redirect_uri
		});
    	
		var options = {
				method: 'POST', 
				hostname: 'api.instagram.com',
				path:'/v1/subscriptions',
	 			port: 443,
	 			headers: {
	 				'Content-Length': auth.length
	 			}
		};
		
		https.request(options, auth, function(resp, err) {
			cb(resp, err);
			// At this point, Instagram will send a get request to your registered redirect uri
			// To complete process, need to respond with the hub.challenge code in url
		});

};


/**************************************************************************
     InstagramClient class
     Handles user actions such as retrieving photos from Instagram
 **************************************************************************/

function InstagramClient (access_token, api_key, api_secret, user_id) {
	this.access_token = access_token;
	this.api_key = api_key;
	this.api_secret = api_secret;
	this.user_id = user_id;
 	this.next_url = '/v1/users/' + user_id + '/media/recent/?access_token=' + access_token;
}

sys.inherits(InstagramClient, events.EventEmitter);

InstagramClient.prototype.resetNextURL = function() {
	this.next_url = '/v1/users/' + this.user_id + '/media/recent/?access_token=' + this.access_token;
}

InstagramClient.prototype.setNextURL = function(nextURL) {
	this.next_url = nextURL;
}

InstagramClient.prototype.getNextMediaSet = function(cb){
	var options;
	if (!this.next_url && this.next_url !== '') {
		this.resetNextURL();
		cb({data: ""});
	} else {
		options = {
				hostname: 'api.instagram.com',
				path: this.next_url,
		 		port: 443
		};
		
		var self = this;
		https.get(options, function (data, err) {
			
			var nextURL = data.pagination.next_url;
			if(nextURL) {
				nextURL.replace('https://api.instagram.com', '');
			} 
			self.next_url = nextURL;
		    cb(data, err);
		});
	}
};


InstagramClient.prototype.getMediaURL = function (mediaID, cb) {
	var options = {
		hostname: 'api.instagram.com',
		path: '/v1/media/' + mediaID + '?access_token=' + this.access_token,
		port: 443
	};

	https.get(options, function (data, err) {
		cb(data['data'].images.standard_resolution.url, err);
	});

};

InstagramClient.prototype.readMediaFile = function(mediaURL, storePath, done) {
	
	fs.readFile(storePath, function(error, data) {
		done(error, data);
	});

};

InstagramClient.prototype.getMediaFile = function(url, filepath, cb) {

	http.get(url, function(res) {
		var fName = url.split('/').pop();
		var fPath = filepath + fName;
		var mediadata = '';
		res.setEncoding('binary');
	 	res.on('data', function(chunk){
	        mediadata += chunk;
	    });

	    res.on('end', function(){
		    
			fs.writeFile(fPath, mediadata, 'binary', function(err) {
			    fs.readFile(fPath, function(error, data) {
					cb(error, data);
				});
			}); 

		});
 	});
}

InstagramClient.prototype.writeMediaFiles = function (urls, filepath, done) {
	
	var self = this;
	var completed = 0;
	async.map( urls, function(url, cb) {
						self.getMediaFile(url, filepath, function(err) {
						    if(err) self.emit('error', err);
						    // let server know the current progress
						    console.log("complete: " + completed);
						    self.emit('igGetPercent', Math.floor(( ++completed / urls.length ) * 100) );
						    cb();
						});
 		}, function(err, results) {
				done(err);
 	});

};



module.exports.InstagramAPI = InstagramAPI;
module.exports.InstagramClient = InstagramClient;
