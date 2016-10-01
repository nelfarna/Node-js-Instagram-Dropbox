
const 	httpsPromise = require('../lib/httpsPromise'),
		util = require('util'),
		qs = require('querystring'),
		events = require('events');

/**************************************************************************
    InstagramAPI class
    Handles OAuth requests
**************************************************************************/

function InstagramAPI (client_id, client_secret, redirect_uri) {
	this.client_id = client_id;
	this.client_secret = client_secret;
	this.redirect_uri = redirect_uri;
}

util.inherits(InstagramAPI, events.EventEmitter);

InstagramAPI.prototype.set = function(type, value) {
	if (this[type]) {
		this[type] = value;
	}
};

InstagramAPI.prototype.get = function(type) {
	return this[type];
};

InstagramAPI.prototype.authorize = function(handler) {

	authURL = 'https://api.instagram.com/oauth/authorize/?client_id=' +
					this.client_id + '&redirect_uri=' + this.redirect_uri + '&response_type=code';

	handler.redirect(authURL);
};

InstagramAPI.prototype.accessToken = function(code) {

	if(code) {

    	let auth = qs.stringify({
			    'client_id': this.client_id,
			    'client_secret': this.client_secret,
			    'grant_type': 'authorization_code',
			    'redirect_uri': this.redirect_uri,
			    'code': code
				});

		let options = {
				hostname: 'api.instagram.com',
				path:'/oauth/access_token',
	 			port: 443,
	 			method: 'POST',
	 			headers: {
	 				'Content-Length': auth.length,
	 				'Content-Type': 'application/x-www-form-urlencoded'
	 			}
	 		};

	 	return new Promise((resolve, reject) => {
			httpsPromise.request(options, auth, 'utf8')
				.then(data => {
					resolve(JSON.parse(data));
				})
	  			.catch(err => reject(err));
  		});

	}
	
};

InstagramAPI.prototype.subscribe = function (userId, token) {

	if (userId) {
    	let auth = qs.stringify({
    			'client_secret': this.client_secret,
			    'client_id': this.client_id,
			    'object': 'user',
			    'object_id': userId,
			    'aspect': 'media',
			    'verify_token': token,
			    'callback_url': this.redirect_uri
		});
    	
		let options = {
				method: 'POST', 
				hostname: 'api.instagram.com',
				path:'/v1/subscriptions',
	 			port: 443,
	 			headers: {
	 				'Content-Length': auth.length,
	 				'Content-Type': 'application/x-www-form-urlencoded'
	 			}
		};

		return new Promise((resolve, reject) => {
			httpsPromise.request(options, auth, 'utf8')
				.then( data => {
					resolve(JSON.parse(data));
				})
	  			.catch( err => reject(err));
  		});
	} 

};

// Instagram information (stored in config or .env for localhost)
const 	KEY = process.env.INSTAGRAM_KEY, 
	 	SECRET = process.env.INSTAGRAM_SECRET,
	 	REDIRECT = process.env.INSTAGRAM_REDIRECT;

module.exports = new InstagramAPI(KEY, SECRET, REDIRECT);
