const express = require('express');
const movieController = require('../controller/movie.controller');

module.exports = {
	'name': 'movie',
	'main': () => {
		const app = express();
		app.get('/', movieController.getMovie);
		app.get('/:id', movieController.getMovieById);
		return app;
	}
};