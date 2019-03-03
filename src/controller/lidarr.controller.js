const debug = require('debug')('mediabutler:lidarrController');
const process = require('process');
const lidarrService = require('../service/lidarr.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const NotImplementedError = require('../errors/notimplemented.error');
const host = require('ip').address('public');
let settings = settingsService.getSettings('lidarr') || false;

try {
	const service = new lidarrService(settings);
	service.getNotifiers().then((notifiers) => {
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/lidarr/` : `http://${host}:${process.env.PORT || 9876}/hooks/lidarr/`;
		const notifMap = Array();
		notifiers.map((x) => { notifMap[x.name] = x; });
		if (!notifMap['MediaButler API']) {
			console.log('Connection from Lidarr to MB Doesnt exist.... Adding');
			const t = service.addWebhookNotifier(notificationUrl);
			if (!t) throw new Error('Unable to communicate with Radarr');
		} else {
			const n = notifMap['MediaButler API'];
			if (n.fields[0].value != notificationUrl) {
				console.log('Connection from Lidarr to MB is wrong.... Correcting');
				service.deleteWebhook(n.id).then(() => {
					const t = service.addWebhookNotifier(notificationUrl);
					if (!t) throw new Error('Unable to communicate with Lidarr');	
				}).catch((err) => { throw err; });
			}
		}
	});
} catch (err) { 
	console.log('Unable to load Lidarr module. Possibly due to misconfiguration of settings. Enable debug logging for true output'); 
	debug(err);
}

module.exports = {
	getCalendar: async (req, res, next) => {
		try {
			const service = new lidarrService(settings);
			const r = await service.getCalendar();
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
	},
	getHistory: async (req, res, next) => {
		try {
			const service = new lidarrService(settings);
			const r = await service.getHistory();
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getStatus: async (req, res, next) => {
		try {
			const service = new lidarrService(settings);
			const r = await service.getSystemStatus();
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getArtistLookup: async (req, res, next) => {
		try {
			const service = new lidarrService(settings);
			const r = await service.lookupArtist({ name: req.query.query });
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
		try {
			const service = new lidarrService(settings);
			const r = await service.getQueue();
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	postQueue: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getArtistId: async (req, res, next) => {
		try {
			const service = new lidarrService(settings);
			const r = await service.getArtist(req.params.id);
			if (!r) { next(new Error('No Results Found')); }
			res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getArtists: async (req, res, next) => {
		try {
			const service = new lidarrService(settings);
			const r = await service.getArtists();
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getConfigure: async (req, res, next) => {
		try {
			if (!req.user.owner) throw new Error('Unauthorized');
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
			const t = new lidarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) res.status(200).send({ message: 'success', settings: tempSettings });
			else next(new Error('Unable to connect'));
		} catch (err) { next(err); }
	},
	saveConfigure: async (req, res, next) => {
		try {
			if (!req.user.owner) throw new Error('Unauthorized');
			if (!req.body.url) throw new Error('url Not Provided');
			if (!req.body.apikey) throw new Error('apikey Not Provided');
			if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
			if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
			const t = new lidarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				settingsService.settings.lidarr = tempSettings;
				settingsService._saveSettings(settingsService.settings);
				res.status(200).send({ message: 'success', settings: tempSettings });
			} else {
				res.status(400).send({ name: 'error', message: 'Unable to connect' });
			}
		} catch (err) { next(err); }
	},
	hookLidarr: async (req, res, next) => {
		try {
			notificationService.emit('sonarr', req.body);
			res.status(204);
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
