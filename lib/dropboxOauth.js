const 	httpsPromise = require('../lib/httpsPromise'),
		qs = require('querystring');

/**************************************************************************
    DropboxAPI class
    Handles OAuth requests
**************************************************************************/


function DropboxAPI (client_id, client_secret, redirect_uri) {
	this.client_id = client_id;
	this.client_secret = client_secret;
	this.redirect_uri = redirect_uri;
}

DropboxAPI.prototype.get = function(type) {
	return this[type];
};

DropboxAPI.prototype.authorize = function(handler, state) {

	authURL = 'https://www.dropbox.com/oauth2/authorize?client_id=' + 
				this.client_id + '&response_type=code&redirect_uri=' + this.redirect_uri +
				(state ? ("&state=" + state) : '');

	console.log('redirecting to ', authURL);
	handler.redirect(authURL);
};

DropboxAPI.prototype.accessToken = function(code) {
	
	if(code) {

    	let auth = qs.stringify({
    			'code': code,
				'grant_type': 'authorization_code',
			    'client_id': this.client_id,
			    'client_secret': this.client_secret,
    			'redirect_uri': this.redirect_uri
		});

		let options = {
				method: 'POST', 
				hostname: 'api.dropbox.com',
				path:'/oauth2/token',
	 			port: 443,
	 			headers: {
	 				'Content-Length': auth.length,
	 				'content-type': "application/x-www-form-urlencoded"
	 			}
		};

		return new Promise((resolve, reject) => {
			httpsPromise.request(options, auth, 'utf8')
				.then( data => {
					resolve(JSON.parse(data));
				}) 
	  			.catch( err => reject(err) );
  		});
	}
	
};

// Dropbox information (stored in config or .env for localhost)
const 	KEY =  process.env.DROPBOX_KEY,
	 	SECRET = process.env.DROPBOX_SECRET,
	 	REDIRECT = process.env.DROPBOX_REDIRECT; // the redirect uri registered in your Dropbox client

module.exports = new DropboxAPI(KEY, SECRET, REDIRECT);



