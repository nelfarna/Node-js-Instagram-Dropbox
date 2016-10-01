
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

const 	express = require('express'),
		cookieParser = require('cookie-parser'),
		bodyParser = require('body-parser'),
		session = require('express-session'),
		logger = require('morgan'),
		methodOverride = require('method-override'),
		_ = require('underscore'),
		MongoStore = require('connect-mongo')(session);

const 	routes = require('./routes'),
		getstarted = require('./routes/getstarted'),
		api = require('./routes/api'),
		photos = require('./routes/photos');
 
const 	http  = require('http'),
		path  = require('path'),
		cons  = require('consolidate');

const 	PORT = process.env.PORT || 5000,
		HOSTNAME = process.env.HOST || ('localhost:' + PORT);

// Instagram information (stored in Heroku config or .env for localhost)
const ig_REDIRECT_route = process.env.INSTAGRAM_REDIRECT_END;

// Dropbox information (stored in Heroku config or .env for localhost)
const db_REDIRECT_route = process.env.DROPBOX_REDIRECT_END;

const app = express();

const clients = {};

// all environments
app.set('port', PORT)
app.set('views', path.join(__dirname, 'views'));
app.engine('html', cons.swig);
app.set('view engine', 'html');

app.use(logger('dev'));
app.use(methodOverride());

app.use(cookieParser());
app.use(session({
	secret: '123456SECRET',
	store: new MongoStore({
		url: process.env.MONGODB_URI
	}),
	resave: true,
    saveUninitialized: true
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// routes that require the session test
const authRoutes = ['/photos', '/subscribe', '/zip', '/dbox', '/getstarted'];

// apply before routes to test session authentication
const beforeFilter = (req, res, next) => {
	var exists = false;
    authRoutes.map(function (x) {
    	if (req.path.indexOf(x) !== -1) {
    		exists = true;
    	}
    });

	if ((!req.session.userId || _.isEmpty(clients)) && exists) {
        res.redirect('/igAuth'); // start authorization process
    } 
    else 
    {
    	if(req.path.indexOf('drop') !== -1  && !clients[req.session.userId]['dbox']) { // if dropbox not authenticated
			var data = JSON.stringify('/dbAuth')
			res.header('Content-Length', data.length);
			res.end(data);
    	}
		next();
	}
}

app.use(beforeFilter);

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app).listen(PORT, function() {
  console.log('Express server listening on port ' + app.get('port'));
});

// development only
if ('development' == app.get('env')) {
   app.use(errorHandler);
}

app.get('/', routes.index);

app.get('/getstarted', function(req, res) {
	res.redirect('/photos');
});

app.get('/igAuth', function(req, res) {
	api.instagramAuthorize(res);
});

app.get('/dbAuth', function(req, res) {
	api.dropboxAuthorize(res, req.session.userId);
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
	console.log('INCOMING POST NOTIFICATION FROM INSTAGRAM');
	api.instagramPost(req, res, clients, next);
});

app.get('/subscribe', function(req, res, next) {
	api.instagramSubscribe(req, res, clients, next);
});

app.get('/photos', function(req, res) {
	photos.main(req, res, clients[req.session.userId]);
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