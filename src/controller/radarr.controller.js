const radarrService = require('../service/radarr.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const NotImplementedError = require('../errors/notimplemented.error');
const process = require('process');
const host = require('ip').address('public');

const settings = settingsService.getSettings('radarr');
try {
	const service = new radarrService(settings);
	service.getNotifiers().then((notifiers) => {
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/radarr/` : `http://${host}:${process.env.PORT || 9876}/hooks/radarr/`;
		const notifMap = Array();
		notifiers.map((x) => { notifMap[x.name] = x; });
		if (!notifMap['MediaButler API']) {
			const t = this.service.addWebhookNotifier(notificationUrl);
			if (!t) throw new Error('Unable to communicate with Radarr');
		} else {
			const n = notifMap['MediaButler API'];
			if (n.fields[0].value != notificationUrl) {
				const d = this.service._api.delete(`notification/${n.id}`);
				const t = this.service.addWebhookNotifier(notificationUrl);
				if (!t) throw new Error('Unable to communicate with Radarr');
			}
		}
	});
} catch (err) { console.error(err); }


module.exports = {
	getCalendar: async (req, res, next) => {
		try {
			const service = new radarrService(settings);
			const r = await service.getCalendar();
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
			const service = new radarrService(settings);
			const r = await service.getHistory();
			if (!r) {
				res.status(200).send([]);
				next();
			}
			else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	getStatus: async (req, res, next) => {
		try {
			const service = new radarrService(settings);
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
	getMovieLookup: async (req, res, next) => {
		try {
			const service = new radarrService(settings);
			const r = await service.lookupMovie({ name: req.query.query });
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
	postSearchEpisode: async (Req, res, next) => {
		next(new NotImplementedError());
	},
	getQueue: async (req, res, next) => {
		try {
			const service = new radarrService(settings);
			const r = await service.getQueue();
			if (!r) {
				res.status(200).send([]);
				next();
			}
			else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(err); }
	},
	postQueue: async (req, res, next) => {
		next(new NotImplementedError());
	},
	getMovieId: async (req, res, next) => {
		try {
			const service = new radarrService(settings);
			const r = await service.getMovie(req.params.id);
			if (!r) next(new Error('No Results Found'));
			res.status(200).send(r);
			next();
		} catch (err) { next(err); }
	},
	getMovies: async (req, res, next) => {
		try {
			const service = new radarrService(settings);
			const r = await service.getMovies();
			if (!r) {
				res.status(200).send([]);
				next();
			} else {
				res.status(200).send(r);
				next();
			}
		} catch (err) { next(res); }
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
			const t = new radarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				res.status(200).send({ message: 'success', settings: tempSettings });
				next();
			} else next(new Error('Unable to connect'));
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
			const t = new radarrService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				const t = _saveSettings(tempSettings);
				settings = tempSettings;
				res.status(200).send({ message: 'success', settings: tempSettings });
				next();
			} else next(new Error('Unable to connect'));
		} catch (err) { next(err); }
	},
	hookRadarr: async (req, res, next) => {
		try {
			notificationService.emit('radarr', req.body);
			res.status(200).send('OK');
			next();
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
