const express = require('express');
const userController = require('../controller/user.controller');

module.exports = {
	'name': 'user',
	'permissions': ['ADMIN'],
	'main': () => {
		const app = express();
		app.get('/', userController.getAllUser);
		app.get('/@me', userController.getMyUser);
		app.get('/:username/', userController.getUser);
		app.put('/:username/', userController.putUser);
		app.delete('/:username/', userController.deleteUser);
		return app;
	}
};