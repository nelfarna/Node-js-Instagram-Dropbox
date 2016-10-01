const httpsPromise = require('../lib/httpsPromise');

/**************************************************************************
    DropboxClient class
    Handles user actions such as putting a file in a Dropbox folder
**************************************************************************/

function DropboxClient (access_token, client_id, client_secret) {
	this.access_token = access_token;
	this.client_id = client_id;
	this.client_secret = client_secret;
}

DropboxClient.prototype.set = function(type, value) {
	if (this[type]) {
		this[type] = value;
	}
};

DropboxClient.prototype.get = function(type) {
	return this[type];
};

DropboxClient.prototype.uploadFile = function(fname, filedata, content_type) {
	
    if(this.access_token) {

		let options = {
				method: 'PUT', 
				hostname: 'api-content.dropbox.com',
				path:'/1/files_put/sandbox/' + fname + '?access_token=' + this.access_token + '&client_id=' + this.client_id + '&client_secret=' + this.client_secret,
	 			port: 443,
	 			headers: {
	 				'Content-Length': filedata.length,
	 				'Content-Type': content_type,
	 				'parent_rev': 'None',
	 				'overwrite': 'true'
	 			}
		};

		return new Promise((resolve, reject) => {
			httpsPromise.request(options, filedata, 'binary')
				.then(data => resolve(data))
	  			.catch(err => reject(err));
		});
	} 
};

DropboxClient.prototype.metaData = function (filename) {
	
    if(this.access_token) {

		let options = {
				method: 'GET', 
				hostname: 'api.dropbox.com',
				path:'/1/metadata/sandbox/' + filename + '?access_token=' + this.access_token,
	 			port: 443
		};

		return new Promise((resolve, reject) => {
			httpsPromise.get(options, 'utf8')
				.then(data => {
					resolve(JSON.parse(data)); 
				})
	  			.catch(err => reject(err));
		});
	} 
};

module.exports = DropboxClient;