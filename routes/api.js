/*
 *  Exports for API functions
 *  Handles requests for authorization, photo retrieval, and uploading to Dropbox
 */

const 	igAPI = require('../lib/instagramOauth'),
		dbAPI = require('../lib/dropboxOauth'),
		igClient = require('../lib/instagramClient'),  
		dbClient = require('../lib/dropboxClient'); 

const 	urlParser = require('url'),
		qs = require('querystring');

exports.instagramRequest = (req, res, clients, next) => {

    const url = urlParser.parse(req.url).query;

	if(url.indexOf("hub.challenge") !== -1) {

		let urlVals = url.split('&'),
			challenge = urlVals[1].replace("hub.challenge=", "");

		headers = {
          'Content-Length': challenge.length,
          'Content-Type': 'text/plain'
        };
        res.writeHead(200, headers);
        res.write(challenge);
	}

	if (url.indexOf("code") !== -1 ) {

		igAPI.accessToken(url.replace('code=', ''))
			.then(resp => {
				clients[resp.user.id] = resp;
				clients[resp.user.id]['ig'] = new igClient(resp.access_token, igAPI.get('client_id'), igAPI.get('client_secret'), resp.user.id);
				req.session.userId = resp.user.id;
				res.redirect('/subscribe');
			})
			.catch(err => console.log(err));
	}
};

exports.instagramPost = (req, res, clients) => {

	const userId = req.body[0].object_id;
	let fName = '',
		fPath = '',
		url = '';

	clients[userId]['ig'].getMediaURL(req.body[0].data.media_id)
		.then(mediaURL => {
			url = mediaURL;
			fName = url.split('/').pop().split('?')[0];
			fPath = "/tmp/";
			return clients[userId]['ig'].getMediaFile(url, fPath)
		})
		.then(data => {
			return clients[userId]['dbox'].uploadFile(fName, data, 'image/jpeg');
		})
		.then(data => {
			console.log('Received new post from Instagram. Sent to Dropbox.');
		})
		.catch(err => {
			console.log('Error receiving new Instagram post.');
			console.log(err);
		});
};

exports.instagramSubscribe = (req, res, clients, next) => {

	igAPI.subscribe(req.session.userId, clients[req.session.userId]['access_token'])
		.then(resp => {
			res.redirect('/photos');
		})
		.catch(err => console.log(err));
};

exports.instagramAuthorize = (handler) => {

	igAPI.authorize(handler);

};

exports.dropboxAuthorize = (handler, id) => {

	dbAPI.authorize(handler, id);

};

exports.dropboxRequest = (req, res, clients, next) => {

	const url = urlParser.parse(req.url).query;
	let userId, code;

	if (url !== null && url.indexOf('code') !== -1 && url.indexOf('state') !== -1) {

	 	let urlVals = url.split('&');
	 	userId = urlVals[0].replace("state=", "");
	 	code = urlVals[1].replace("code=", "");

	 	/// check here if state value is the right value
		dbAPI.accessToken(code)
			.then(body => {
				clients[userId]['dbox'] = new dbClient(body.access_token, dbAPI.get('client_id'), dbAPI.get('client_key'));
				res.redirect('/photos');
			})
			.catch(err => console.log(err));
			
	} else {
		res.redirect('/photos');
	}
};