const debug = require('debug')('mediabutler:issueService');
const Issue = require('../model/issue');
const notificationService = require('./notification.service');
const plexService = require('./plex.service');
const settingsService = require('./settings.service');

module.exports = class issueService {
    constructor() {
        debug('Starting up');
    }

    async getIssues() {
        const dbg = debug.extend('getIssues');
        try {
			const r = await Issue.find({ status: { $lt: 4 } });
			return r;
		} catch (err) { dbg(err); throw err; }
    }

    async getIssue(id) {
        const dbg = debug.extend('getIssue');
        try {
            dbg(`Getting issue id ${id}`);
			const r = await Issue.findById(id);
			return r;
		} catch (err) { dbg(err); throw err; }
    }

    async addIssue(issue) {
        const dbg = debug.extend('addIssue');
        try {
            dbg('Parsing issue');
            const r = new Issue(issue);
            dbg('Saveing Issue');
            await r.save();
            notificationService.emit('issue', { issue: r, type: 'add' });
            dbg('Notification Sent');
            return r;
        } catch (err) { dbg(err); throw err; }
    }

    async updateIssue(id, issue) {
        const dbg = debug.extend('updateIssue');
        try {
            dbg(`Updating issue ${id}`);
            const t = await Issue.findByIdAndUpdate(id, issue);
            notificationService.emit('issue', { issue: t, type: 'update' });
            dbg('Notification Sent');
            return t;
        } catch (err) { dbg(err); throw err; }
    }

    async deleteIssue(id) {
        const dbg = debug.extend('deleteIssue');
        try {
            dbg(`Finding issue id ${id}`);
            const r = await Issue.findById(id);
            dbg('Deleting issue');
            const t = await Issue.findOneAndDelete({id});
            notificationService.emit('issue', { issue: r, type: 'delete' });
            dbg('Notification sent');
            return;
        } catch (err) { dbg(err); throw err; }
    }
}