const express = require('express');
const userController = require('../controller/user.controller');

module.exports = {
	'name': 'user',
	'main': () => {
        const app = express();
        app.get('/', userController.getAllUser);
		app.get('/:username/', userController.getUser);
        app.post('/:username/', userController.postUser);
        app.put('/:username/', userController.putUser);
        app.delete('/:username/', userController.deleteUser);
		return app;
	}
};