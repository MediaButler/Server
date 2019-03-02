const issueService = require('../service/issue.service');
const service = new issueService();

module.exports = {
    getIssues: async (req, res, next) => {
        try {
            const r = await service.getIssues();
            res.status(200).send(r);
        } catch (err) { next(err); }
    },
    getIssue: async (req, res, next) => {
        try {
            const r = await service.getIssue(req.params.id);
            res.status(200).send(r);
        } catch (err) { next(err); }
    },
    postIssue: async (req, res, next) => {
        try {
            const r = await service.postIssue(req.body);
            res.status(200).send(r);
        } catch (err) { next(err); }
    },
    putIssue: async (req, res, next) => {
        try {
            const r = await service.putIssue(req.params.id, req.body);
            res.status(200).send(r);
        } catch (err) { next(err); }
    },
    deleteIssue: async (req, res, next) => {
        try {
            const r = await service.deleteIssue(req.params.id);
            res.status(200).send({ name: 'OK', message: 'Deleted' });
        } catch (err) { next(err); }
    }
}