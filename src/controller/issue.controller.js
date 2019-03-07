const debug = require('debug')('mediabutler:issueController');
const issueService = require('../service/issue.service');
const service = new issueService();

module.exports = {
    getIssues: async (req, res, next) => {
        const dbg = debug.extend('getIssues');
        try {
            dbg('Getting Issues');
            const r = await service.getIssues();
            dbg(`Sending Issues to ${req.user.username}`);
            res.status(200).send(r);
        } catch (err) { dbg(err); next(err); }
    },
    getIssue: async (req, res, next) => {
        const dbg = debug.extend('getIssue');
        try {
            dbg(`Getting IssueId ${req.params.id}`);
            const r = await service.getIssue(req.params.id);
            dbg(`Sending IssueId ${req.params.id} to ${req.user.username}`);
            res.status(200).send(r);
        } catch (err) { dbg(err); next(err); }
    },
    postIssue: async (req, res, next) => {
        const dbg = debug.extend('postIssue');
        try {
            dbg('Adding new Issue');
            dbg(req.body);
            const r = await service.postIssue(req.body);
            dbg('Finished');
            res.status(200).send(r);
        } catch (err) { dbg(err); next(err); }
    },
    putIssue: async (req, res, next) => {
        const dbg = debug.extend('putIssue');
        try {
            dbg(`Updating issue ${req.params.id}`);
            const r = await service.putIssue(req.params.id, req.body);
            dbg('Finished');
            res.status(200).send(r);
        } catch (err) { dbg(err); next(err); }
    },
    deleteIssue: async (req, res, next) => {
        const dbg = debug.extend('deleteIssue');
        try {
            dbg(`Deleting Issue ${req.params.id}`);
            const r = await service.deleteIssue(req.params.id);
            dbg('Finished');
            res.status(200).send({ name: 'OK', message: 'Deleted' });
        } catch (err) { dbg(err); next(err); }
    }
}