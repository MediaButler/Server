const express = require('express');
const sonarrController = require('../controller/sonarr.controller');

module.exports = {
	'name': 'sonarr',
	'permissions': ['SON_ADD'],
	'main': () => {
		const app = express();
		app.route('/').get(sonarrController.getShows);
		app.route('/calendar').get(sonarrController.getCalendar);
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