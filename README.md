Instagram / Dropbox App using Node.js for retrieving photos from Instagram and backing them up to Dropbox

First run "npm install"  
Execute "node app.js" to run server
Client code located in /public folder (primarily photos.js and photos.html)
Must register a new client with both Instagram and Dropbox. Enter keys/secrets in config files
Create .env file for localhost or set the config file on host that follows this format:
 		
 		INSTAGRAM_KEY=<key provided by Instagram>
 		INSTAGRAM_SECRET=<secret provide by Instagram>
 		INSTAGRAM_REDIRECT=<registered redirect uri> ex. http://<domain or ip>/igaction/
 		INSTAGRAM_REDIRECT_END=/igaction/
 		DROPBOX_KEY=<key provided by Dropbox>
 		DROPBOX_SECRET=<secret provided by Dropbox>
 		DROPBOX_REDIRECT=<registered redirect uri (must use https)> ex. https://<domain or ip>/dbaction/
 		DROPBOX_REDIRECT_END=/dbaction/
 
 
