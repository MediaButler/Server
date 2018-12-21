const express = require('express');
const lidarrController = require('../controller/lidarr.controller');

module.exports = {
	'name': 'lidarr',
	'main': () => {
		const app = express();
		app.route('/').get(lidarrController.getArtists);
		app.get('/calendar', lidarrController.getCalendar);
		app.get('/history', lidarrController.getHistory);
		app.get('/status', lidarrController.getStatus);
		app.get('/lookup', lidarrController.getArtistLookup);
		app.get('/search', lidarrController.getSearchAlbum);
		app.post('/search', lidarrController.postSearchAlbum);
		app.get('/queue', lidarrController.getQueue);
		app.post('/queue', lidarrController.postQueue);
		app.get('/:id', lidarrController.getArtistId);
		return app;
	},
	'configure': () => {
		const app = express();
		app.get('/', lidarrController.getConfigure);
		app.put('/', lidarrController.testConfigure);
		app.post('/', lidarrController.saveConfigure);
		return app;
	},
	'hooks': () => {
		const app = express();
		app.post('/', lidarrController.hookLidarr);
		app.put('/', lidarrController.hookLidarr);
		return app;
	}
};
