var https = require('../lib/https.js');
var urlParser = require('url');
var qs = require('querystring');


/**************************************************************************
    DropboxAPI class
    Handles OAuth requests
**************************************************************************/


function DropboxAPI (api_key, api_secret, redirect_uri) {
	this.api_key = api_key;
	this.api_secret = api_secret;
	this.redirect_uri = redirect_uri;
	this.authURL = 'https://www.dropbox.com/1/oauth2/authorize?client_id=' + api_key + '&response_type=code&redirect_uri=' + redirect_uri;
}

DropboxAPI.prototype.authorize = function(handler, state) {
	handler.doAction('redirect', this.authURL + (state ? ("&state=" + state) : ''));
};

DropboxAPI.prototype.accessToken = function(code, cb) {
	
	if(code) {

    	var auth = qs.stringify({
    			'code': code,
				'grant_type': 'authorization_code',
			    'client_id': this.api_key,
			    'client_secret': this.api_secret,
    			'redirect_uri': this.redirect_uri
		});

		var options = {
				method: 'POST', 
				hostname: 'api.dropbox.com',
				path:'/1/oauth2/token',
	 			port: 443,
	 			headers: {
	 				'Content-Length': auth.length,
	 				'content-type': "application/x-www-form-urlencoded"
	 			}
		};

		https.request(options, auth, function(resp, err) {
			cb(resp, err);
		});
	}
	
};

/**************************************************************************
    DropboxClient class
    Handles user actions such as putting a file in a Dropbox folder
**************************************************************************/

function DropboxClient (access_token, api_key, api_secret) {
	this.access_token = access_token;
	this.api_key = api_key;
	this.api_secret = api_secret;
}

DropboxClient.prototype.putFile = function(fname, filedata, content_type, cb) {
	
    if(this.access_token) {

		var options = {
				method: 'PUT', 
				hostname: 'api-content.dropbox.com',
				path:'/1/files_put/sandbox/' + fname + '?access_token=' + this.access_token + '&client_id=' + this.api_key + '&client_secret=' + this.api_secret,
	 			port: 443,
	 			headers: {
	 				'Content-Length': filedata.length,
	 				'Content-Type': content_type,
	 				'parent_rev': 'None',
	 				'overwrite': 'true'
	 			}
		};

		https.request(options, filedata, function(resp, err) {
			cb(err, resp);
		});
		
	} 

};

DropboxClient.prototype.metaData = function (filename, cb) {
	
    if(this.access_token) {

		var options = {
				method: 'GET', 
				hostname: 'api.dropbox.com',
				path:'/1/metadata/sandbox/' + filename + '?access_token=' + this.access_token,
	 			port: 443
		};


		https.get(options, function(resp, err) {
			cb(resp, err);
		});

	} 

};

module.exports.DropboxAPI = DropboxAPI;
module.exports.DropboxClient = DropboxClient;



