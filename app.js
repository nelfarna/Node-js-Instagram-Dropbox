
/*
 * Instagram / Dropbox App for retrieving photos from Instagram and backing them up to Dropbox
 * Execute "node app.js" to run server
 * Client code located in /public folder (primarily photos.js and photos.html)
 * Must register a new client with both Instagram and Dropbox. Enter keys/secrets in config files
 * Create .env file for local execution or set the config file on host that follows this format:
 *		
 *		INSTAGRAM_KEY=<key provided by Instagram>
 *		INSTAGRAM_SECRET=<secret provide by Instagram>
 *		INSTAGRAM_REDIRECT=http://<domain or ip>/igaction/
 *		INSTAGRAM_REDIRECT_END=/igaction/
 *		DROPBOX_KEY=<key provided by Dropbox
 *		DROPBOX_SECRET=<secret provided by Dropbox>
 *		DROPBOX_REDIRECT=https://<domain or ip>/dbaction/
 *		DROPBOX_REDIRECT_END=/dbaction/
 *
 */

var express    = require('express');
var routes     = require('./routes'),
	getstarted = require('./routes/getstarted'),
	api 	   = require('./routes/api'),
	photos     = require('./routes/photos');
 

var http  = require('http');
var path  = require('path');
var cons  = require('consolidate');

var PORT = process.env.PORT || 5000;
var HOSTNAME = process.env.HOST || ('localhost:' + PORT);

// Instagram information (stored in Heroku config or .env for localhost)
var ig_REDIRECT_route = process.env.INSTAGRAM_REDIRECT_END;

// Dropbox information (stored in Heroku config or .env for localhost)
var db_REDIRECT_route = process.env.DROPBOX_REDIRECT_END;

var app = express();

var clients = {};

// all environments
app.set('port', PORT)
app.set('views', path.join(__dirname, 'views'));
app.engine('html', cons.swig);
app.set('view engine', 'html');


app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.methodOverride());

app.use(express.cookieParser());
app.use(express.session({secret: '123456SECRET'}));
app.use(express.bodyParser());

// routes that require the session test

var authRoutes = ['/photos', '/subscribe', '/zip', '/dbox', '/getstarted'];


// apply before routes to test session authentication
function beforeFilter (req, res, next) {
	var exists = false;
    authRoutes.map(function (x) {
    	if (req.path.indexOf(x) !== -1) {
    		exists = true;
    	}
    });

	if (!req.session.userId && exists) {
        res.redirect('/igAuth'); // start authorization process
    } else {
    	if(req.path.indexOf('drop') !== -1  && !clients[req.session.userId]['dbox']) { // if dropbox not authenticated
			var data = JSON.stringify('/dbAuth')
			res.header('Content-Length', data.length);
			res.end(data);
    	}
		next();
	}
}

app.use(beforeFilter);

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var server = http.createServer(app).listen(PORT, function() {
  console.log('Express server listening on port ' + app.get('port'));
});

// development only
if ('development' == app.get('env')) {
   app.use(express.errorHandler());
}

function responseHandler (response) {
	this.response = response;
	var self = this;
	this.doAction = function (func, param) {
		switch (func) {
			case 'redirect': this.response.redirect(param); break;
			case 'send': this.response.send(param); break;
			case 'download': this.response.download(param); break;
			case 'contentType': this.response.contentType(param); break;
			default: break;
		}
	};
}

app.get('/', routes.index);

app.get('/getstarted', function(req, res) {
	res.redirect('/igAuth');
});

app.get('/igAuth', function(req, res) {
	api.instagramAuthorize(new responseHandler(res));
});

app.get('/dbAuth', function(req, res) {
	api.dropboxAuthorize(new responseHandler(res), req.session.userId);
});

// Handles any get requests from Dropbox
app.get(db_REDIRECT_route, function(req, res, next) {
	 api.dropboxRequest(req, res, clients, next);
});

// Handles any get requests from Instagram
app.get(ig_REDIRECT_route, function(req, res, next) {
	api.instagramRequest(req, res, clients, next);
});

// for Instagram subscription post notifications for new user posts
app.post(ig_REDIRECT_route, function(req, res, next) {
	api.instagramPost(req, res, clients, next);
});

app.get('/subscribe', function(req, res, next) {
	api.instagramSubscribe(req, res, clients, next);
});

app.get('/photos', function(req, res) {
	photos.main(req, res);
});

// GET requests from client that don't require change in data on server-side
app.get('/photos/:type', function(req, res) {
	photos.processGetRequest(req.params.type, clients[req.session.userId], req, res);
});

// POST requests from client - require changes in data on server-side
app.post('/photos/:type', function(req, res) {
     photos.processPostRequest(req.params.type, clients[req.session.userId], req, res);
});

app.post('/zip', function(req, res, next) {
	photos.startZip(clients[req.session.userId], req, res);
});



