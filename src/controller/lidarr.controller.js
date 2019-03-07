const debug = require('debug')('mediabutler:lidarrController');
const process = require('process');
const lidarrService = require('../service/lidarr.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const NotImplementedError = require('../errors/notimplemented.error');
const host = require('ip').address('public');
let settings = settingsService.getSettings('lidarr') || false;

const setupNotifier = () => {
	const dbg = debug.extend('setupNotifier');
	const service = new lidarrService(settings);
	dbg('Query for Notifiers on Connect tab');
	service.getNotifiers().then((notifiers) => {
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/lidarr/` : `http://${host}:${process.env.PORT || 9876}/hooks/lidarr/`;
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
					if (!t) throw new Error('Unable to communicate with Lidarr');	
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
			const service = new lidarrService(settings);
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
			const service = new lidarrService(settings);
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
			const service = new lidarrService(settings);
			dbg('Getting Status');
			const r = await service.getSystemStatus();
			dbg(`Sending ${req.user.username} Status`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getArtistLookup: async (req, res, next) => {
		const dbg = debug.extend('getArtistLookup');
		try {
			const service = new lidarrService(settings);
			dbg(`Looking up Artist: ${req.query.query}`);
			const r = await service.lookupArtist({ name: req.query.query });
			dbg(`Sending ${req.user.username} Artist ${req.query.query}`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getSearchAlbum: async (req, res, next) => {
		next(new NotImplementedError());
	},
	postSearchAlbum: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getQueue: async (req, res, next) => {
		const dbg = debug.extend('getQueue');
		try {
			const service = new lidarrService(settings);
			dbg('Getting Status');
			const r = await service.getQueue();
			dbg(`Sending ${req.user.username} Queue`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	postQueue: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getArtistId: async (req, res, next) => {
		const dbg = debug.extend('getArtistId');
		try {
			const service = new lidarrService(settings);
			dbg(`Looking up ArtistId: ${req.params.id}`);
			const r = await service.getArtist(req.params.id);
			dbg(`Sending ${req.user.username} ArtistId ${req.params.id}`);
			if (!r) { next(new Error('No Results Found')); }
			res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getArtists: async (req, res, next) => {
		const dbg = debug.extend('getArtists');
		try {
			const service = new lidarrService(settings);
			dbg('Getting All Artists');
			const r = await service.getArtists();
			dbg(`Sending ${req.user.username} All Artists`);
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
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
		} catch (err) { next(err); }
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
			const t = new lidarrService(tempSettings);
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
			const t = new lidarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				dbg('Test passed... Saving');
				const allSettings = settingsService.getSettings();
				allSettings['lidarr'] = tempSettings;
				const t = settingsService._saveSettings(allSettings);
				settings = tempSettings;
				dbg('Tripping setupNotifier');
				setupNotifier();
				res.status(200).send({ message: 'success', settings: tempSettings });
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
			delete allSettings['lidarr'];

			dbg('Saving settings');
			const t = settingsService._saveSettings(allSettings);
			settings = tempSettings;
			res.status(200).send({ message: 'success', settings: { } });
		} catch (err) { dbg(err); throw err; }
	},
	hookLidarr: async (req, res, next) => {
		const dbg = debug.extend('hookLidarr');
		try {
			notificationService.emit('sonarr', req.body);
			dbg('Received Notification');
			res.status(200);
		} catch (err) { next(err); }
	},
	hasItem: async (mbId) => {
		try {
			const service = new lidarrService(settings);
			const r = await service.getArtistByMusicBrainzId(mbId);
			if (r) return true;
			else return false;
		} catch (err) { return false; }
	}
};
