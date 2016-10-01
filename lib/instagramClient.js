const	httpsPromise = require('../lib/httpsPromise'),
		fsPromise = require('fs-promise'),
		util = require('util'),
		events = require('events');
		// async = require('async');

/**************************************************************************
     InstagramClient class
     Handles user actions such as retrieving photos from Instagram
 **************************************************************************/

function InstagramClient (access_token, client_id, client_secret, user_id) {
	this.access_token = access_token;
	this.client_id = client_id;
	this.client_secret = client_secret;
	this.user_id = user_id;
 	this.next_url = '/v1/users/' + user_id + '/media/recent/?access_token=' + access_token;
}

util.inherits(InstagramClient, events.EventEmitter);

InstagramClient.prototype.resetNextURL = function() {
	this.next_url = '/v1/users/' + this.user_id + '/media/recent/?access_token=' + this.access_token;
};

InstagramClient.prototype.setNextURL = function(nextURL) {
	this.next_url = nextURL;
};

InstagramClient.prototype.getNextMediaSet = function() {
	let options = {
					hostname: 'api.instagram.com',
					path: this.next_url,
			 		port: 443
				};

	return new Promise((resolve, reject) => {

		if (!this.next_url && this.next_url !== '') {
			this.resetNextURL();
			resolve();
		} else {

			httpsPromise.get(options, 'utf8')
				.then( data => {
					data = JSON.parse(data);
					let nextURL = data.pagination.next_url;
					if(nextURL) {
						nextURL.replace('https://api.instagram.com', '');
					} 
					this.setNextURL(nextURL);
					resolve(data);
				})
	  			.catch( err => reject(err) );
		}
	});
};


InstagramClient.prototype.getMediaURL = function (mediaID) {
	let options = {
		hostname: 'api.instagram.com',
		path: '/v1/media/' + mediaID + '?access_token=' + this.access_token,
		port: 443
	};

	return new Promise((resolve, reject) => {
		httpsPromise.get(options, 'utf8')
			.then( data => {
				data = JSON.parse(data);
				resolve(data['data'].images.standard_resolution.url);
			}) 
  			.catch( err => reject(err) );
	});

};

InstagramClient.prototype.getMediaFile = function(url, dir) {

	let fpath = dir + url.split('/').pop().split('?')[0];
	
	return new Promise((resolve, reject) => {
		httpsPromise.get(url, 'binary')
			.then(data => {
				return fsPromise.writeFile(fpath, data, 'binary');
			})
			.then(() => {
				return fsPromise.readFile(fpath);
			})
			.then(data => resolve(data))
			.catch(err => reject(err));
	});

};

InstagramClient.prototype.writeMediaFiles = function(urls, filepath) {
	
	let completed = 0;
	let promises = [];

	urls.forEach(url => {
		let u = new Promise((resolve, reject) => {
			this.getMediaFile(url, filepath) 
				.then(data => {
					this.emit('igGetPercent', Math.floor(( ++completed / urls.length ) * 100));
				    resolve();
				})
				.catch(err => {
					this.emit('error', err);
					reject(err);
				});
			});
		promises.push(u);
	});
	return Promise.all(promises);
};


module.exports = InstagramClient;
