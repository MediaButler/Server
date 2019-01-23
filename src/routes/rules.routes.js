const express = require('express');
const rulesController = require('../controller/rules.controller');

module.exports = {
	'name': 'rules',
	'permissions': ['RULE_EDIT'],
	'main': () => {
		const app = express();
		app.get('/', rulesController.getRules);
		app.post('/', rulesController.postRules);
		return app;
	}
};