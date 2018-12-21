const express = require('express');
const plexController = require('../controller/plex.controller');

module.exports = {
	'name': 'plex',
	'main': () => {
		const app = express();
		app.get('/audio/:ratingKey', plexController.getAudioByKey);
		app.get('/image/:ratingKey', plexController.getImageByKey);
		app.get('/search/audio', plexController.searchAudio);
		app.get('/history', plexController.getHistory);
		app.post('/history', plexController.postHistory);
		app.get('/', (req, res, next) => { res.send('Hooooo'); next(); });
		return app;
	}
};