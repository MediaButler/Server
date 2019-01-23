const sonarrService = require('../service/sonarr.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const NotImplementedError = require('../errors/notimplemented.error');
const process = require('process');
const host = require('ip').address('public');

const settings = settingsService.getSettings('sonarr4k');
try {
	const service = new sonarrService(settings);
	service.getNotifiers().then((notifiers) => {
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/sonarr4k/` : `http://${host}:${process.env.PORT || 9876}/hooks/sonarr4k/`;
		const notifMap = Array();
		notifiers.map((x) => { notifMap[x.name] = x; });
		if (!notifMap['MediaButler API']) {
			console.log('Connection from Sonarr to MB Doesnt exist.... Adding');
			const t = service.addWebhookNotifier(notificationUrl);
			if (!t) throw new Error('Unable to communicate with Sonarr');
		} else {
			const n = notifMap['MediaButler API'];
			if (n.fields[0].value != notificationUrl) {
				console.log('Connection from Sonarr to MB is wrong.... Correcting');
				service.deleteWebhook(n.id).then(() => {
					const t = service.addWebhookNotifier(notificationUrl);
					if (!t) throw new Error('Unable to communicate with Sonarr');	
				}).catch((err) => { throw err; });
			}
		}
	});
} catch (err) { console.error(err); }

module.exports = {
	getCalendar: async (req, res, next) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.getCalendar();
			console.log(r);
			if (!r) {
				res.status(200).send([]);
				next();
			} else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	getHistory: async (req, res, next) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.getHistory();
			if (!r) {
				res.status(200).send([]);
				next();
			} else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	getStatus: async (req, res, next) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.getSystemStatus();
			if (!r) {
				res.status(200).send([]);
				next();
			} else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	getShowLookup: async (req, res, next) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.lookupShow({ name: req.query.query });
			if (!r) {
				res.status(200).send([]);
				next();
			} else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	getSearchEpisode: async (req, res, next) => {
		next(new NotImplementedError());
	},
	postSearchEpisode: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getQueue: async (req, res, next) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.getQueue();
			if (!r) {
				res.status(200).send([]);
				next();
			} else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	postQueue: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getShowId: async (req, res, next) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.getShow(req.params.id);
			if (!r) next(new Error('No Results Found'));
			res.status(200).send(r);
			next();
		} catch (err) { next(err); }
	},
	getShows: async (req, res, next) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.getShows();
			if (!r) {
				res.status(200).send([]);
				next();
			} else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	getConfigure: async (req, res, next) => {
		try {
			if (!req.user.owner) next(new Error('Unauthorized'));
			const data = {
				schema: [{
					name: 'url',
					type: 'url'
				},
				{
					name: 'apikey',
					type: 'secure-string'
				},
				{
					name: 'defaultProfile',
					type: 'string'
				},
				{
					name: 'defaultRoot',
					type: 'string'
				}],
				settings
			};
			res.status(200).send(data);
			next();
		} catch (err) { next(err); }
	},
	testConfigure: async (req, res, next) => {
		try {
			if (!req.user.owner) throw new Error('Unauthorized');
			if (!req.body.url) throw new Error('`url` Not Provided');
			if (!req.body.apikey) throw new Error('`apikey` Not Provided');
			if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
			if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
			const t = new sonarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				res.status(200).send({ message: 'success', settings: tempSettings });
				next();
			} else next(new Error('Unable to connect'));
		} catch (err) { next(new Error('Unable to connect')); }
	},
	saveConfigure: async (req, res, next) => {
		try {
			if (!req.user.owner) throw new Error('Unauthorized');
			if (!req.body.url) throw new Error('url Not Provided');
			if (!req.body.apikey) throw new Error('apikey Not Provided');
			if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
			if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
			const t = new sonarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				const t = await saveSettings(tempSettings);
				settings = tempSettings;
				res.status(200).send({ message: 'success', settings: tempSettings });
				next();
			} else next(new Error('Unable to connect'));
		} catch (err) { next(err); }
	},
	hookSonarr: async (req, res, next) => {
		try {
			notificationService.emit('sonarr4k', req.body);
			res.status(200).send('OK');
		} catch (err) { next(err); }
	},
	hasItem: async (tvdbId) => {
		try {
			const service = new sonarrService(settings);
			const r = await service.getShowByTvdbId(tvdbId);
			if (r) return true;
			else return false;
		} catch (err) { return false; }
	}
};
