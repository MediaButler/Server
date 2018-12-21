const express = require('express');
const tautulliController = require('../controller/tautulli.controller');

module.exports = {
	'name': 'tautulli',
	'main': () => {
		const app = express();
		app.get('/activity', tautulliController.getActivity);
		app.get('/library', tautulliController.getLibrary);
		app.get('/history', tautulliController.getHistory);
		return app;
	},
	'configure': () => {
		const app = express();
		app.get('/', tautulliController.getConfigure);
		app.put('/', tautulliController.testConfigure);
		app.post('/', tautulliController.saveConfigure);
		return app;
	},
	'hooks': () => {
		const app = express();
		app.post('/', tautulliController.hookTautulli);
		return app;
	}
};