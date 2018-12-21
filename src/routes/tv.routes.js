const express = require('express');
const tvController = require('../controller/tv.controller');

module.exports = {
	'name': 'tv',
	'main': () => {
		const app = express();
		app.get('/', tvController.getShow);
		app.get('/:id/actors', tvController.getActorsById);
		app.get('/:id/episodes', tvController.getEpisodesById);
		app.get('/:id/images', tvController.getImagesById);
		app.get('/:id', tvController.getShowById);
		return app;
	}
};