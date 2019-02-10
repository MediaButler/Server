const express = require('express');
const requestController = require('../controller/request.controller');

module.exports = {
	'name': 'requests',
	'permissions': ['REQ_DELETE', 'REQ_EDIT', 'REQ_APPROVE_TV', 'REQ_APPROVE_MOVIE', 'REQ_APPROVE_ARTIST', 'REQ_AUTO_TV', 'REQ_AUTO_MOVIE', 'REQ_AUTO_ARTIST'],
	'main': () => {
		const app = express();
		app.delete('/:id', requestController.deleteRequest);
		app.get('/:id', requestController.getRequest);
		app.post('/:id', requestController.approveRequest);
		app.get('/', requestController.getRequests);
		app.post('/', requestController.postRequest);
		return app;
	}
};