/*
 *  Exports for API functions
 *  Handles requests for authorization, photo retrieval, and uploading to Dropbox
 */

var db = require('../lib/dropbox.js');
var ig = require('../lib/instagram.js');  

var urlParser = require('url');
var qs = require('querystring');

var fs = require('fs');

// Instagram information (stored in Heroku config or .env for localhost)
var ig_KEY = process.env.INSTAGRAM_KEY;  
var ig_SECRET = process.env.INSTAGRAM_SECRET;    
var ig_REDIRECT = process.env.INSTAGRAM_REDIRECT;  // the redirect uri registered in your Instagram client

// Dropbox information (stored in Heroku config or .env for localhost)
var db_KEY =  process.env.DROPBOX_KEY; 
var db_SECRET = process.env.DROPBOX_SECRET; 
var db_REDIRECT = process.env.DROPBOX_REDIRECT; // the redirect uri registered in your Dropbox client

var dbAPI = new db.DropboxAPI(db_KEY, db_SECRET, db_REDIRECT);
var igAPI = new ig.InstagramAPI(ig_KEY, ig_SECRET, ig_REDIRECT);

var instAPI = function () {
	dbAPI = new db.DropboxAPI(db_KEY, db_SECRET, db_REDIRECT);
	igAPI = new ig.InstagramAPI(ig_KEY, ig_SECRET, ig_REDIRECT);
};

exports.instagramRequest = function(req, res, clients, next){
    var url = urlParser.parse(req.url).query;

	if(url.indexOf("hub.challenge") !== -1) {
		var urlVals = url.split('&');
		var challenge = urlVals[1].replace("hub.challenge=", "");

		headers = {
          'Content-Length': challenge.length,
          'Content-Type': 'text/plain'
        };
        res.writeHead(200, headers);
        res.write(challenge);
	}

	if (url.indexOf("code") !== -1 ) {
		if (!igAPI) instAPI();
		igAPI.accessToken(url.replace('code=', ''), function (resp, error) {
			if(error) {
				next(error);
			}
			clients[resp.user.id] = resp;
			clients[resp.user.id]['ig'] = new ig.InstagramClient(resp.access_token, ig_KEY, ig_SECRET, resp.user.id);
			req.session.userId = resp.user.id;
			res.redirect('/subscribe');
		});
	}
};

exports.instagramPost = function (req, res, clients, next) {
	var userID = req.body[0].object_id;
	clients[userID]['ig'].getMediaURL(req.body[0].data.media_id, function ( url, error ) {
		if (error) {
			next(error);
		}
		var fName = url.split('/').pop();
		var fPath = "./tmp/" + fName;

		clients[userID]['ig'].readMediaFile(url, fPath, function ( fName, data) {
			clients[userID]['dbox'].putFile(fName, data, 'image/jpeg', function ( resp, err) {
				if (error) {
					next(error);
				}
			});
		});
	});
};

exports.instagramSubscribe = function(req, res, clients, next) {
	if(!igAPI) instAPI();
	igAPI.subscribe(req.session.userId, clients[req.session.userId]['ig'].access_token, function(resp, error) {
		if (error) {
			next(error);
		} else {
			res.redirect('/dbAuth');
		}
	});
};

exports.instagramAuthorize = function(handler) {
	if(!igAPI) instAPI();
	igAPI.authorize(handler);
};

exports.dropboxAuthorize = function(handler, id) {
	if(!dbAPI) instAPI();
	dbAPI.authorize(handler, id);
};

exports.dropboxRequest = function(req, res, clients, next) {
	 var url = urlParser.parse(req.url).query;
	 var userID;
	 var code;
	 if (url !== null && url.indexOf('code') !== -1 && url.indexOf('state') !== -1) {
	 	
	 	var urlVals = url.split('&');
	 	code = urlVals[0].replace("code=", "");
	 	userID = urlVals[1].replace("state=", "");

	 	/// check here if state value is the right value
	 	if(!dbAPI) instAPI();
		dbAPI.accessToken(code, function(body, error) {

			if (error) { 
				next(error);
			} else {
				clients[userID]['dbox'] = new db.DropboxClient(body.access_token, db_KEY, db_SECRET);
				res.redirect('http://' + req.get('Host') +  '/photos'); // force back to non-ssl to avoid issues 
			}
		});
			
	}
};