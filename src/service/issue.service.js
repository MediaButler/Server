const Issue = require('../model/issue');
const notificationService = require('./notification.service');
const plexService = require('./plex.service');
const settingsService = require('./settings.service');

module.exports = class issueService {
    constructor() {

    }

    async getIssues() {
        try {
			const r = await Issue.find({ status: { $lt: 4 } });
			return r;
		} catch (err) { throw err; }
    }

    async getIssue(id) {
        try {
			const r = await Issue.findById(id);
			return r;
		} catch (err) { throw err; }
    }

    async addIssue(issue) {
        try {
            const r = new Issue(issue);
            await r.save();
            notificationService.emit('issue', { issue: r, type: 'add' });
            return r;
        } catch (err) { throw err; }
    }

    async updateIssue(id, issue) {
        try {
            const t = await Issue.findByIdAndUpdate(id, issue);
            notificationService.emit('issue', { issue: t, type: 'update' });
            return t;
        } catch (err) { throw err; }
    }

    async deleteIssue(id) {
        try {
            const r = await Issue.findById(id);
            const t = await Issue.findOneAndDelete({id});
            notificationService.emit('issue', { issue: r, type: 'delete' });
            return;
        } catch (err) { throw err; }
    }
}