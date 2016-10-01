/*
 *  Exports for photos page 
 *  Handles requests for photo retrieval, zip creation, and uploading to Dropbox
 */

const	fsPromise = require('fs-promise'),
		fs = require('fs'),
		path = require('path');

exports.main  = (req, res, clientInfo) => {
	res.render('photos', { user: clientInfo['user']});
};

exports.processPostRequest = ( type, clientInfo, req, res ) => {
	
	 switch ( type ) {
    	case 'dropOne':

    		if (clientInfo['dbox']) {
	    		let fName = req.body.d.split('/').pop().split('?')[0],
	    			dir = '/tmp/';

				clientInfo['ig'].getMediaFile(req.body.d, dir)
					.then((data) => {
						return clientInfo['dbox'].uploadFile(fName, data, 'image/jpeg');
					})
					.then(data => {
						res.send(JSON.stringify({send: 'done'}))
					})
					.catch(err => {
						console.log(err);
					});
					
			}
    		break;

    	case 'dropZip':

    		if (clientInfo['dbox']) {

	    		// if client is requesting to send files to Dropbox, send most recently available
		  	    if (clientInfo['lastAvailable']) {

		  	  		fsPromise.readFile(clientInfo['lastAvailable'])
		  	  			.then( data => {
		  	  				return clientInfo['dbox'].uploadFile(clientInfo['lastAvailable'].split('/').pop(), data, 'image/jpeg'); 
		  	  			})
		  	  			.then (() => {
		  	  				res.send(JSON.stringify({zip: 'done'}));
						})
						.catch(err => {
							console.log("Error sending zip to Dropbox");
						});
				    
		  	    }
	  		}
    		break;

    	case 'getPhotos':

    		if (clientInfo['ig']) {

	    		clientInfo['ig'].getNextMediaSet() //(err, data) => {
	    			.then(data => {
						// if (err) {}
						if(data && data['data'] !== '') {
			    			data['data'].map(item => {
			    				if (item.user) delete item.user;
			    			});
			    			res.send(data['data']);
			    		}
			    		
			    	})
			    	.catch(err => console.log(err));
			
    	    }
    		break;

    	default:
    		break;

    }
};


exports.processGetRequest = ( type, clientInfo, req, res ) => {

	 switch ( type ) {
    	case 'progress':
    		res.send(JSON.stringify({ percent: clientInfo['zipPercent'] }));
    		break;

    	case 'download':
    		if(clientInfo['lastAvailable'])
    			res.download(clientInfo['lastAvailable']);
    		break;

    	default:
    		break;
    }
};

// function to remove directory after done with it
const removeDirectory = (fpath, done) => {
	  if( fs.existsSync(fpath) ) {

	    fs.readdirSync(fpath).forEach( (file, index) => {
		      let curPath = fpath + "/" + file;
		      if(fs.statSync(curPath).isDirectory()) { // recurse
		        deleteFolderRecursive(curPath);
		      } else { // delete file
		        fs.unlinkSync(curPath);
		      }
	    });

	    fs.rmdirSync(fpath);

	  } 
};

const makeDirectory = (directory) => {

	return new Promise((resolve, reject) => {
		require('mkdirp-promise/lib/node6')(directory)
			.then(() => resolve())
			.catch(err => reject(err));
	});
};

const compressDirectory = (fpath, zipName) => {

	const zipdir = require('zip-dir');
	 
	return new Promise((resolve, reject) => {
		zipdir(fpath, { saveTo: zipName }, (err, buffer) => {
			// `buffer` is the buffer of the zipped file 
			// And the buffer was saved to `zipName 
			console.log('Compression for ' + zipName + " has ended.");

			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
};

// function to retrieve and zip files given a list of urls
const zipMediaFiles = (urls, clientInfo) => {
	
	let parentDir = path.join(__dirname, '../users/'),
		fpath = parentDir + clientInfo.user.username + '/',
		zipName = parentDir + clientInfo.user.username + '.zip'

	return new Promise((resolve, reject) => {
		makeDirectory(fpath)
			.then(() => {
				return clientInfo['ig'].writeMediaFiles(urls, fpath); //, (err) => {
			})
			.then(() => {
				return compressDirectory(fpath, zipName);
			})
			.then(() => {
				removeDirectory(fpath);
				resolve(zipName);
			})
			.catch(err => reject(err));
			
	});
};

exports.startZip = (clientInfo, req, res) => {

	res.send({msg: 'received zip request'});

	// initialize session for keeping track of zipping progress
	clientInfo['zipPercent'] = 0;

	// for progress bar
	clientInfo['ig'].on('igGetPercent', (value) => {
		if (clientInfo['zipPercent'] < value) {
			clientInfo['zipPercent'] = value;
		}
	});

	zipMediaFiles(req.body.d, clientInfo)
		.then(fileLoc => {
			clientInfo['zipPercent'] = 100;
			clientInfo['lastAvailable'] = fileLoc;
		})
		.catch(err => { 
			console.log(err);
		});
	
};