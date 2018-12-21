const express = require('express');
const requestController = require('../controller/request.controller');

module.exports = {
	'name': 'requests',
	'main': () => {
		const app = express();
		app.get('/autoapprove', requestController.getAutoApprove);
		app.post('/autoapprove', requestController.postAutoApprove);
		app.put('/autoapprove', requestController.putAutoApprove);
		app.delete('/autoapprove', requestController.deleteAutoApprove);
		app.get('/allowapprove', requestController.getAllowApprove);
		app.put('/allowapprove', requestController.putAllowApprove);
		app.post('/allowapprove', requestController.postAllowApprove);
		app.delete('/allowapprove', requestController.deleteAllowApprove);
		app.delete('/:id', requestController.deleteRequest);
		app.get('/:id', requestController.getRequest);
		app.post('/:id', requestController.approveRequest);
		app.get('/', requestController.getRequests);
		app.post('/', requestController.postRequest);
		return app;
	}
};