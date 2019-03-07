const debug = require('debug')('mediabutler:sonarr4kController');
const sonarrService = require('../service/sonarr.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const NotImplementedError = require('../errors/notimplemented.error');
const process = require('process');
const host = require('ip').address('public');

let settings = settingsService.getSettings('sonarr4k') || false;

const setupNotifier = () => {
	const dbg = debug.extend('setupNotifier');
	const service = new sonarrService(settings);
	dbg('Query for Notifiers on Connect tab');
	service.getNotifiers().then((notifiers) => {
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/sonarr4k/` : `http://${host}:${process.env.PORT || 9876}/hooks/sonarr4k/`;
		dbg(`Notifictation URL: ${notificationUrl}`);
		const notifMap = Array();
		notifiers.map((x) => { notifMap[x.name] = x; });
		if (!notifMap['MediaButler API']) {
			dbg('Adding WebHook');
			const t = service.addWebhookNotifier(notificationUrl);
			if (!t) throw new Error('Unable to communicate with Sonarr');
		} else {
			const n = notifMap['MediaButler API'];
			if (n.fields[0].value != notificationUrl) {
				dbg('Updating WebHook...');
				service.deleteWebhook(n.id).then(() => {
					const t = service.addWebhookNotifier(notificationUrl);
					if (!t) throw new Error('Unable to communicate with Sonarr');
				}).catch((err) => { throw err; });
			}
		}
	});
}

try {
	debug('Starting up');
	setupNotifier();
} catch (err) { debug(err); }

module.exports = {
	getCalendar: async (req, res, next) => {
		const dbg = debug.extend('getCalendar');
		try {
			const service = new sonarrService(settings);
			dbg('Getting Calendar');
			const r = await service.getCalendar();
			dbg(`Sending ${req.user.username} Calendar`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getHistory: async (req, res, next) => {
		const dbg = debug.extend('getHistory');
		try {
			const service = new sonarrService(settings);
			dbg('Getting History');
			const r = await service.getHistory();
			dbg(`Sending ${req.user.username} History`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getStatus: async (req, res, next) => {
		const dbg = debug.extend('getStatus');
		try {
			const service = new sonarrService(settings);
			dbg('Getting Status');
			const r = await service.getSystemStatus();
			dbg(`Sending ${req.user.username} Status`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getProfiles: async (req, res, next) => {
		const dbg = debug.extend('getProfiles');
		try {
			const service = new sonarrService(settings);
			dbg('Getting Profiles');
			const r = await service.getProfiles();
			dbg(`Sending ${req.user.username} Profiles`);
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getRoots: async (req, res, next) => {
		const dbg = debug.extend('getRoots');
		try {
			const service = new sonarrService(settings);
			dbg('Getting Roots');
			const r = await service.getRootPaths();
			dbg(`Sending ${req.user.username} Roots`);
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getShowLookup: async (req, res, next) => {
		const dbg = debug.extend('getShowLookup');
		try {
			const service = new sonarrService(settings);
			dbg(`Looking up show: ${req.query.query}`)
			const r = await service.lookupShow({ name: req.query.query });
			dbg(`Sending ${req.user.username} show ${req.query.query}`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getSearchEpisode: async (req, res, next) => {
		next(new NotImplementedError());
	},
	postSearchEpisode: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getQueue: async (req, res, next) => {
		const dbg = debug.extend('getQueue');
		try {
			const service = new sonarrService(settings);
			dbg('Getting Queue');
			const r = await service.getQueue();
			dbg(`Sending ${req.user.username} Queue`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	postQueue: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getShowId: async (req, res, next) => {
		const dbg = debug.extend('getShowId');
		try {
			const service = new sonarrService(settings);
			dbg(`Looking up showId: ${req.params.id}`);
			const r = await service.getShow(req.params.id);
			dbg(`Sending ${req.user.username} showId ${req.params.id}`);
			if (!r) next(new Error('No Results Found'));
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getShows: async (req, res, next) => {
		const dbg = debug.extend('getShows');
		try {
			const service = new sonarrService(settings);
			dbg('Getting all shows');
			const r = await service.getShows();
			dbg(`Sending ${req.user.username} all shows`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getConfigure: async (req, res, next) => {
		const dbg = debug.extend('getConfigure');
		try {
			if (!req.user.permissions.includes('ADMIN')) return next(new Error('Unauthorized'));
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
			};
			if (!settings) data.settings = {}
			else data.settings = settings;
			dbg(`Sending ${req.user.username} Settings`);
			res.status(200).send(data);
		} catch (err) { dbg(err); next(err); }
	},
	testConfigure: async (req, res, next) => {
		const dbg = debug.extend('testConfigure');
		try {
			if (!req.user.permissions.includes('ADMIN')) return next(new Error('Unauthorized'));
			if (!req.body.url) throw new Error('`url` Not Provided');
			if (!req.body.apikey) throw new Error('`apikey` Not Provided');
			if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
			if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
			dbg('Testing provided configuration');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
			dbg(tempSettings);
			const t = new sonarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				dbg('Settings passed');
				res.status(200).send({ message: 'success', settings: tempSettings });
			} else { 
				dbg('Settings failed');
				next(new Error('Unable to connect'));
			}
		} catch (err) { dbg(err); next(new Error('Unable to connect')); }
	},
	saveConfigure: async (req, res, next) => {
		const dbg = debug.extend('saveConfigure');
		try {
			if (!req.user.permissions.includes('ADMIN')) return next(new Error('Unauthorized'));
			if (!req.body.url) throw new Error('url Not Provided');
			if (!req.body.apikey) throw new Error('apikey Not Provided');
			if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
			if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
			dbg('Saving provided configuration');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
			dbg(tempSettings);
			const t = new sonarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				dbg('Test passed... Saving');
				const allSettings = settingsService.getSettings();
				allSettings['sonarr4k'] = tempSettings;
				const t = settingsService._saveSettings(allSettings);
				settings = tempSettings;
				dbg('Tripping setupNotifier');
				setupNotifier();
				res.status(200).send({ message: 'success', settings });
			} else next(new Error('Unable to connect'));
		} catch (err) { dbg(err); next(err); }
	},
	deleteConfigure: async (req, res, next) => {
		const dbg = debug.extend('deleteConfigure');
		try {
			dbg('Validating permissions');
			if (!req.user.permissions.includes('ADMIN')) return next(new Error('Unauthorized'));

			dbg('Getting settings');
			const allSettings = settingsService.getSettings();

			dbg('Deleting settings');
			delete allSettings['sonarr4k'];

			dbg('Saving settings');
			const t = settingsService._saveSettings(allSettings);
			settings = tempSettings;
			res.status(200).send({ message: 'success', settings: { } });
		} catch (err) { dbg(err); throw err; }
	},
	hookSonarr: async (req, res, next) => {
		const dbg = debug.extend('hookSonarr');
		try {
			notificationService.emit('sonarr4k', req.body);
			dbg('Received Notification');
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
