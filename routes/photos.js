/*
 *  Exports for photos page 
 *  Handles requests for photo retrieval, zip creation, and uploading to Dropbox
 */

var fs = require('fs');
var targz = require('tar.gz');


exports.main  = function(req, res){
	res.render('photos');
};

exports.processPostRequest = function ( type, clientInfo, req, res ) {

	 switch ( type ) {
    	case 'dropOne':
    		if (clientInfo['dbox']) {
	    		var fName = req.body.d.split('/').pop();
				var fPath = "./tmp/" + fName;
				clientInfo['ig'].getMediaFile(req.body.d, fPath, function ( err, data ) {
					clientInfo['dbox'].putFile(fName, data, 'image/jpeg', function ( err, resp ) {
						res.send(JSON.stringify({send: 'done'}));
					});
				});
			}
    		break;
    	case 'dropZip':
    		if (clientInfo['dbox']) {

	    		// if client is requesting to send files to Dropbox, send most recently available
		  	    if(req.session.lastAvailable) {

		  	  		fs.readFile(req.session.lastAvailable, function(err, data) {
		  	  			clientInfo['dbox'].putFile(req.session.lastAvailable.split('/').pop(), data, 'image/jpeg', 
		  	  				function(data, err)  {
		  	  					res.send(JSON.stringify({zip: 'done'}));
							}
						);
				    });
		  	    }
	  		}
    		break;
    	case 'getPhotos':
    		if (clientInfo['ig']) {
	    		clientInfo['ig'].getNextMediaSet( function(data, err) {
					if (err) {}
					if(data['data'] !== '') {
		    			data['data'].map( function( item ) {
		    				if (item.user) delete item.user;
		    			});
		    		}
		    		res.send(data['data']);
				});
    	    }
    		break;
    	default:
    		break;

    }
};


exports.processGetRequest = function ( type, clientInfo, req, res ) {

	 switch ( type ) {
    	case 'progress':
    		//respHandler.doAction( 'send', JSON.stringify({ percent: req.session.zipPercent }) );
    		res.send(JSON.stringify({ percent: req.session.zipPercent }));
    		break;
    	case 'download':
    		if(req.session.lastAvailable)
    			res.download(req.session.lastAvailable);
    			//respHandler.doAction( 'download', req.session.lastAvailable );
    		break;

    	default:
    		break;
    }
};


// function to remove directory after done with it
var removeDirectory = function(path, done) {
// 	var now = new Date();
// var jsonDate = now.toJSON()
			console.log("removing dir "); // + now.toJSON);
	  if( fs.existsSync(path) ) {
	    fs.readdirSync(path).forEach(function(file, index){
		      var curPath = path + "/" + file;
		      if(fs.statSync(curPath).isDirectory()) { // recurse
		        deleteFolderRecursive(curPath);
		      } else { // delete file
		        fs.unlinkSync(curPath);
		      }
	    });
	    fs.rmdirSync(path);

	  } 
};

var makeDirectory = function(path, cb) {
 	fs.exists(path, function(exists) {
		if (!exists) {
			fs.mkdir(path, function(err) {
				//cb();
			});
		}
		cb();
	});
};

var compressDirectory = function(path, zipName, cb) {
	var compress = new targz().compress(path, zipName, function(err){
	    // if(err) { 
	    // 	cb(err);
	    // }
	    
	    console.log('Compression for ' + zipName + " has ended.");

	    cb(err, zipName);
	});
};



// function to retrieve and zip files given a list of urls
var zipURLs = function(urls, clientInfo, cb) {
	
	var parentDir = './users/';
	var path = parentDir + clientInfo.user.id + '/';

	makeDirectory(path, function() {
		clientInfo['ig'].writeMediaFiles(urls, path, function(err) {
			if (err) { 
				cb(err);
			} else {
				compressDirectory(path, parentDir  + clientInfo.user.username + '.tar.gz', function(err, zipPathName) {
					// delete files from disk after zipping them
					removeDirectory(path);
					cb(err, zipPathName);
				});
			}
		});
	});
};

exports.startZip = function (clientInfo, req, res, next) {
	res.send({msg: 'received zip request'});

	req.session.zipPercent = 0; // initialize session for keeping track of zipping progress

	// for progress bar
	clientInfo['ig'].on('igGetPercent', function(value) {
		if (req.session.zipPercent < value) {
			req.session.zipPercent = value;
			req.session.save();
		}
	});

	zipURLs(req.body.d, clientInfo, function(error, fileLoc) {
		if (error) {
			next(error);
		}
		req.session.zipPercent = 100;
		req.session.lastAvailable = fileLoc;
		req.session.save();
	});

}






