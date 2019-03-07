const express = require('express');
const radarrController = require('../controller/radarr4k.controller');

module.exports = {
	'name': 'radarr4k',
	'permissions': ['R4K_ADD'],
	'main': () => {
		const app = express();
		app.get('/calendar', radarrController.getCalendar);
		app.get('/history', radarrController.getHistory);
		app.get('/status', radarrController.getStatus);
		app.get('/lookup', radarrController.getMovieLookup);
		app.get('/search', radarrController.getSearchEpisode);
		app.post('/search', radarrController.postSearchEpisode);
		app.get('/queue', radarrController.getQueue);
		app.post('/queue', radarrController.postQueue);
		app.get('/profile', radarrController.getProfiles);
		app.get('/rootpath', radarrController.getRoots);
		app.get('/:id', radarrController.getMovieId);
		app.get('/', radarrController.getMovies);
		return app;
	},
	'configure': () => {
		const app = express();
		app.get('/', radarrController.getConfigure);
		app.put('/', radarrController.testConfigure);
		app.post('/', radarrController.saveConfigure);
		app.delete('/', radarrController.deleteConfigure);
		return app;
	},
	'hooks': () => {
		const app = express();
		app.post('/', radarrController.hookRadarr);
		app.put('/', radarrController.hookRadarr);
		return app;
	}
};