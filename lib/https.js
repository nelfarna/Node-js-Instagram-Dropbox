/*
 *  Exports for get and post requests 
 */

var https = require('https');

exports.get = function (options, callback) {
	    var dataReceived = "";
		var r = https.get(options, function (response) {
		   response.setEncoding('utf8');
		   console.log('STATUS: ' + response.statusCode);
		  	var status = response.statusCode;
		  	var err;
		  	//var err = (status !== 200) ? new Error('An error occurred with get request.') : undefined;
		  response.on('data', function (chunk) {
		    dataReceived += chunk;
		  });

		  response.on('end', function() {
		  	try {
		  	   dataReceived = JSON.parse(dataReceived);
		  	} catch(e) {
		       err = new Error('An error occurred with get request.');
		    } finally {
		   	   callback(dataReceived, err);
		   	}
		  });

		}).on('error', function(e) {
		  console.log('problem with request: ' + e.message);
		});

		r.end();
};

exports.request = function (options, data, callback) {
	    var dataReceived = "";
		var r = https.request(options, function (response) {
		   response.setEncoding('utf8');
		   console.log('STATUS: ' + response.statusCode);
		  	var status = response.statusCode;
 			var err;
		

		  response.on('data', function (chunk) {
		    dataReceived += chunk;
		  });

		  response.on('end', function() {
		  	    try {
		  	       dataReceived = JSON.parse(dataReceived);
			  	} catch(e) {
			       err = new Error('An error occurred with get request.');
			    } finally {
			   	   callback(dataReceived, err);
			   	}
		   });
		}).on('error', function(e) {
		  console.log('problem with request: ' + e.message);
		});

		if(data) {
			r.write(data);
		}
		r.end();
};
