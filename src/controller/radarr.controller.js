const debug = require('debug')('mediabutler:radarrController');
const radarrService = require('../service/radarr.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const NotImplementedError = require('../errors/notimplemented.error');
const process = require('process');
const host = require('ip').address('public');

let settings = settingsService.getSettings('radarr') || false;

const setupNotifier = () => {
	const dbg = debug.extend('setupNotifier');
	const service = new radarrService(settings);
	dbg('Query for Notifiers on Connect tab');
	service.getNotifiers().then((notifiers) => {
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/radarr/` : `http://${host}:${process.env.PORT || 9876}/hooks/radarr/`;
		dbg(`Notifictation URL: ${notificationUrl}`);
		const notifMap = Array();
		notifiers.map((x) => { notifMap[x.name] = x; });
		if (!notifMap['MediaButler API']) {
			dbg('Adding WebHook');
			const t = service.addWebhookNotifier(notificationUrl);
			if (!t) throw new Error('Unable to communicate with Radarr');
		} else {
			const n = notifMap['MediaButler API'];
			if (n.fields[0].value != notificationUrl) {
				dbg('Updating WebHook...');
				service.deleteWebhook(n.id).then(() => {
					const t = service.addWebhookNotifier(notificationUrl);
					if (!t) throw new Error('Unable to communicate with Radarr');
				}).catch((err) => { throw err; });
			}
		}
	});
}

try {
	debug('Starting up');
	setupNotifier();
} catch (err) {
	debug(err);
}

module.exports = {
	getCalendar: async (req, res, next) => {
		const dbg = debug.extend('getCalendar');
		try {
			const service = new radarrService(settings);
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
			const service = new radarrService(settings);
			dbg('Getting History');
			const r = await service.getHistory();
			dbg(`Sending ${req.user.username} History`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getStatus: async (req, res, next) => {
		const dbg = debug.extend('getHistory');
		try {
			const service = new radarrService(settings);
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
			const service = new radarrService(settings);
			dbg('Getting Profiles');
			const r = await service.getProfiles();
			dbg(`Sending ${req.user.username} Profiles`);
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getRoots: async (req, res, next) => {
		const dbg = debug.extend('getRoots');
		try {
			const service = new radarrService(settings);
			dbg('Getting Roots');
			const r = await service.getRootPaths();
			dbg(`Sending ${req.user.username} Roots`);
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getMovieLookup: async (req, res, next) => {
		const dbg = debug.extend('getMovieLookup');
		try {
			const service = new radarrService(settings);
			dbg(`Looking up movie: ${req.query.query}`)
			const r = await service.lookupMovie({ name: req.query.query });
			dbg(`Sending ${req.user.username} movie ${req.query.query}`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getSearchEpisode: async (req, res, next) => {
		next(new NotImplementedError());
	},
	postSearchEpisode: async (Req, res, next) => {
		next(new NotImplementedError());
	},
	getQueue: async (req, res, next) => {
		const dbg = debug.extend('getQueue');
		try {
			const service = new radarrService(settings);
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
	getMovieId: async (req, res, next) => {
		const dbg = debug.extend('getMovieId');
		try {
			const service = new radarrService(settings);
			dbg(`Looking up movieId: ${req.params.id}`);
			const r = await service.getMovie(req.params.id);
			dbg(`Sending ${req.user.username} movieId ${req.params.id}`);
			if (!r) next(new Error('No Results Found'));
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getMovies: async (req, res, next) => {
		const dbg = debug.extend('getMovies');
		try {
			const service = new radarrService(settings);
			dbg('Getting all movies');
			const r = await service.getMovies();
			dbg(`Sending ${req.user.username} all movies`);
			res.status(200).send(r);
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
			const t = new radarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				dbg('Settings passed');
				res.status(200).send({ message: 'success', settings: tempSettings });
			} else { 
				dbg('Settings failed');
				next(new Error('Unable to connect'));
			}
		} catch (err) { dbg(err); next(err); }
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
			const t = new radarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				dbg('Test passed... Saving');
				const allSettings = settingsService.getSettings();
				allSettings['radarr'] = tempSettings;
				const t = settingsService._saveSettings(allSettings);
				settings = tempSettings;
				dbg('Tripping setupNotifier');
				setupNotifier();
				res.status(200).send({ message: 'success', settings: tempSettings });
			} else next(new Error('Unable to connect'));
		} catch (err) { next(err); }
	},
	deleteConfigure: async (req, res, next) => {
		const dbg = debug.extend('deleteConfigure');
		try {
			dbg('Validating permissions');
			if (!req.user.permissions.includes('ADMIN')) return next(new Error('Unauthorized'));

			dbg('Getting settings');
			const allSettings = settingsService.getSettings();

			dbg('Deleting settings');
			delete allSettings['radarr'];

			dbg('Saving settings');
			const t = settingsService._saveSettings(allSettings);
			settings = tempSettings;
			res.status(200).send({ message: 'success', settings: { } });
		} catch (err) { dbg(err); throw err; }
	},
	hookRadarr: async (req, res, next) => {
		const dbg = debug.extend('hookRadarr');
		try {
			notificationService.emit('radarr', req.body);
			dbg('Received Notification');
			res.status(200).send('OK');
		} catch (err) { next(err); }
	},
	hasItem: async (imdbId) => {
		try {
			const service = new radarrService(settings);
			const r = await service.getMovieByimdbId(imdbId);
			if (r) return true;
			else return false;
		} catch (err) { return false; }
	}
};
