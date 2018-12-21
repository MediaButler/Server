const express = require('express');
const traktController = require('../controller/trakt.controller');

module.exports = {
	'name': 'trakt',
	'main': () => {
		const app = express();
        app.get('/', traktController.getUrl);
        app.post('/', traktController.authenticate);
		return app;
	}
};