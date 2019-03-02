const express = require('express');
const issueController = require('../controller/issue.controller');

module.exports = {
	'name': 'issue',
	'permissions': ['ISS_ADM'],
	'main': () => {
		const app = express();
		app.delete('/:id', issueController.deleteIssue);
		app.get('/:id', issueController.getIssue);
		app.put('/:id', issueController.putIssue);
		app.get('/', issueController.getIssues);
		app.post('/', issueController.postIssue);
		return app;
	}
};