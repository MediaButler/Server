const debug = require('debug')('mediabutler:tautulliController');
const tautulliService = require('../service/tautulli.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const process = require('process');
const host = require('ip').address('public');


let settings = settingsService.getSettings('tautulli') || false;
let service;

const setupNotifier = () => {
	service = new tautulliService(settings);
	service.getNotifiers().then((notifiers) => {
		const notifMap = new Array();
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/tautulli/` : `http://${host}:${process.env.PORT || 9876}/hooks/tautulli/`;
		notifiers.data.map((x) => { notifMap[x.friendly_name] = x; });
		if (!notifMap['MediaButler API']) {
			service.addScriptNotifier(notificationUrl);
		} else {
			const id = notifMap['MediaButler API'].id;
			service.getNotifierConfig(id).then((data) => {
				if (data.config_options[0].value != notificationUrl) {
					service.setNotifierConfig(id, notificationUrl);
				}
			});
		}
	});
}

try {
	setupNotifier();
} catch (err) { 
	console.log('Unable to load Tautulli module. Possibly due to misconfiguration of settings. Enable debug logging for true output'); 
	debug(err);
}


module.exports = {
	getActivity: async (req, res, next) => {
		try {
			const r = await service.getNowPlaying();
			if (!req.user.owner) {
				r.data.sessions.forEach((session) => {
					if (session.username != req.user.username) {
						session.user_id = 0;
						session.username = 'Plex User';
						session.ip_address = '0.0.0.0';
						session.user = 'Plex User';
						session.email = 'Plex User';
						session.friendly_name = 'Plex User';
						session.user_thumb = '';
						session.ip_address_public = '0.0.0.0';
					}
				});
			}
			res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getHistory: async (req, res, next) => {
		try {
			let user = req.user.username;
			let limit = 20;
			if (req.query.user) user = req.query.user;
			if (req.query.limit) limit = parseInt(req.query.limit);
			const r = await service.getHistory(user, limit);
			res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getLibrary: async (req, res, next) => {
		try {
			const r = await service.getLibraryStats();
			res.status(200).send(r);
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
				}],
				settings
			};
			res.status(200).send(data);
		} catch (err) { next(err); }
	},
	testConfigure: async (req, res, next) => {
		try {
			if (!req.user.owner) throw new Error('Unauthorized');
			if (!req.body.url) throw new Error('No url Provided');
			if (!req.body.apikey) throw new Error('No apikey Provided');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey };
			const t = new tautulliService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				res.status(200).send({ message: 'success', settings: tempSettings });
			} else { next(new Error('Unable to connect')); }
		} catch (err) { next(new Error('Unable to connect')); }
	},
	saveConfigure: async (req, res, next) => {
		try {
			if (!req.user.owner) throw new Error('Unauthorized');
			if (!req.body.url) throw new Error('No url Provided');
			if (!req.body.apikey) throw new Error('No apikey Provided');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey };
			const t = new tautulliService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				const os = settingsService.getSettings();
				os.tautulli = tempSettings
				settingsService._saveSettings(os);
				settings = tempSettings;
				setupNotifier();
				res.status(200).send({ message: 'success', settings: settings });
			} else { next(new Error('Settings error')); }
		} catch (err) { next(new Error('Unable to connect')); }
	},
	hookTautulli: async (req, res, next) => {
		try {
			if (notificationService) notificationService.emit('tautulli', req.body);
			res.status(200).send('OK');
		} catch (err) { next(err); }
	}
}
