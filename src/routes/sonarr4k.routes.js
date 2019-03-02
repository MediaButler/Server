const express = require('express');
const sonarrController = require('../controller/sonarr4k.controller');

module.exports = {
	'name': 'sonarr4k',
	'permissions': ['S4K_ADD'],
	'main': () => {
		const app = express();
		app.get('/calendar', sonarrController.getCalendar);
		app.get('/history', sonarrController.getHistory);
		app.get('/status', sonarrController.getStatus);
		app.get('/lookup', sonarrController.getShowLookup);
		app.get('/search', sonarrController.getSearchEpisode);
		app.post('/search', sonarrController.postSearchEpisode);
		app.get('/queue', sonarrController.getQueue);
		app.post('/queue', sonarrController.postQueue);
		app.get('/profile', sonarrController.getProfiles);
		app.get('/rootpath', sonarrController.getRoots);
		app.get('/:id', sonarrController.getShowId);
		app.get('/', sonarrController.getShows);
		return app;
	},
	'configure': () => {
		const app = express();
		app.get('/', sonarrController.getConfigure);
		app.put('/', sonarrController.testConfigure);
		app.post('/', sonarrController.saveConfigure);
		return app;
	},
	'hooks': () => {
		const app = express();
		app.post('/', sonarrController.hookSonarr);
		app.put('/', sonarrController.hookSonarr);
		return app;
	}
};