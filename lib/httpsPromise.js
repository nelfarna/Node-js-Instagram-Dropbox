/*
 *  Exports for get and post requests 
 */

const https = require('https');

exports.get = (options, encoding) => {

    return new Promise( (resolve, reject) => {
    	const req = https.get(options, (response) => {
    		
    		if (response.statusCode < 200 || response.statusCode > 299) {
    			reject(new Error('Failed GET request, status code: ' + response.statusCode));
    		}
    		let dataReceived = '';

    		response.setEncoding(encoding || 'utf8');

    		response.on('data', (chunk) => {
			    dataReceived += chunk;
			});

    		response.on('end', () => resolve(dataReceived));
    	});

    	req.on('error', err => reject(err));
    	req.end();
	});
		
};

exports.request = (options, data, encoding) => {

	return new Promise( (resolve, reject) => {
	    const req = https.request(options, (response) => {
	    		
	    		if (response.statusCode < 200 || response.statusCode > 299) {
	    			reject(new Error('Failed request, status code: ' + response.statusCode));
	    		}
	    		let dataReceived = '';

	    		response.setEncoding(encoding || 'utf8');

	    		response.on('data', (chunk) => {
				    dataReceived += chunk;
				});

	    		response.on('end', () => resolve(dataReceived) );
	    });

	    req.on('error', (err) => reject(err));

		if(data) req.write(data);

		req.end();
	});
};
