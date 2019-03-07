const debug = require('debug')('mediabutler:tautulliController');
const tautulliService = require('../service/tautulli.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const process = require('process');
const host = require('ip').address('public');


let settings = settingsService.getSettings('tautulli') || false;
let service;

const setupNotifier = () => {
	const dbg = debug.extend('setupNotifier');
	service = new tautulliService(settings);
	dbg('Query for Notifiers');
	service.getNotifiers().then((notifiers) => {
		const notifMap = new Array();
		const notificationUrl = (settingsService.settings.urlOverride) ? `${settingsService.settings.urlOverride}hooks/tautulli/` : `http://${host}:${process.env.PORT || 9876}/hooks/tautulli/`;
		dbg(`Notifictation URL: ${notificationUrl}`);
		if (notifiers && notifiers.data) {
			notifiers.data.map((x) => { notifMap[x.friendly_name] = x; });
			if (!notifMap['MediaButler API']) {
				dbg('Adding WebHook');
				service.addScriptNotifier(notificationUrl);
			} else {
				const id = notifMap['MediaButler API'].id;
				service.getNotifierConfig(id).then((data) => {
					if (data.config_options[0].value != notificationUrl) {
						dbg('Updating WebHook...');
						service.setNotifierConfig(id, notificationUrl);
					}
				});
			}
		} else {
			dbg('Adding WebHook');
			service.addScriptNotifier(notificationUrl);
		}
	});
}

try {
	setupNotifier();
} catch (err) { debug(err); }


module.exports = {
	getActivity: async (req, res, next) => {
		const dbg = debug.extend('getActivity');
		try {
			dbg('Getting activity');
			const r = await service.getNowPlaying();
			if (!req.user.owner) {
				dbg('Not Administrative user, Filtering results');
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
			dbg('Finished');
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getHistory: async (req, res, next) => {
		const dbg = debug.extend('getHistory');
		try {
			let user = req.user.username;
			let limit = 20;
			if (req.query.user) user = req.query.user;
			if (req.query.limit) limit = parseInt(req.query.limit);
			dbg('Getting history');
			const r = await service.getHistory(user, limit);
			dbg('Finished');
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	getLibrary: async (req, res, next) => {
		const dbg = debug.extend('getLibrary');
		try {
			dbg('Getting Library stats');
			const r = await service.getLibraryStats();
			dbg('Finished');
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
			if (!req.body.url) throw new Error('No url Provided');
			if (!req.body.apikey) throw new Error('No apikey Provided');
			dbg('Testing provided configuration');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey };
			dbg(tempSettings);
			const t = new tautulliService(tempSettings);
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
			if (!req.body.url) throw new Error('No url Provided');
			if (!req.body.apikey) throw new Error('No apikey Provided');
			dbg('Saving provided configuration');
			const tempSettings = { url: req.body.url, apikey: req.body.apikey };
			dbg(tempSettings);
			const t = new tautulliService(tempSettings);
			const r = await t.checkSettings();
			if (r) {
				dbg('Test passed... Saving');
				const allSettings = settingsService.getSettings();
				allSettings['tautulli'] = tempSettings;
				const t = settingsService._saveSettings(allSettings);
				settings = tempSettings;
				dbg('Tripping setupNotifier');
				setupNotifier();
				res.status(200).send({ message: 'success', settings });
			} else { next(new Error('Settings error')); }
		} catch (err) { dbg(err); next(new Error('Unable to connect')); }
	},
	deleteConfigure: async (req, res, next) => {
		const dbg = debug.extend('deleteConfigure');
		try {
			dbg('Validating permissions');
			if (!req.user.permissions.includes('ADMIN')) return next(new Error('Unauthorized'));

			dbg('Getting settings');
			const allSettings = settingsService.getSettings();

			dbg('Deleting settings');
			delete allSettings['tautulli'];

			dbg('Saving settings');
			const t = settingsService._saveSettings(allSettings);
			settings = tempSettings;
			res.status(200).send({ message: 'success', settings: {} });
		} catch (err) { dbg(err); throw err; }
	},
	hookTautulli: async (req, res, next) => {
		const dbg = debug.extend('hookTautulli');
		try {
			if (notificationService) notificationService.emit('tautulli', req.body);
			dbg('Received Notification');
			res.status(200).send('OK');
		} catch (err) { dbg(err); next(err); }
	}
}
