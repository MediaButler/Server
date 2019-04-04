const debug = require('debug')('mediabutler:requestController');
const TVDB = require('node-tvdb');
const imdb = require('imdb-api');
const axios = require('axios');
const Request = require('../model/request');
const requestService = require('../service/request.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const BadRequestError = require('../errors/badrequest.error');
const sonarrService = require('../service/sonarr.service');

let settings = settingsService.getSettings('requests') || { limitDays: 7, limitAmount: 20 };
const service = new requestService(settings);
service._approveTimer = setTimeout((() => { service.autoApprove(); }), 60 * 1000);
service._filledTimer = setTimeout((() => { service.autoDelete(); }), 60 * 1000);
setTimeout(() => {
	_tvNotification('sonarr');
	_tvNotification('sonarr4k');
	_movieNotification('radarr');
	_movieNotification('radarr4k');
	_movieNotification('radarr3d');
}, 5000);
debug('Starting up');

const _tvNotification = (source) => {
	const dbg = debug.extend('tvNotification');
	notificationService.on(source, async (data) => {
		dbg('Checking to see if its an import notification');
		if (data.eventType == 'Download') {
			dbg('Is import notification. Matching...');
			const r = await service.getRequests();
			const request = r.find((x) => x.tvdbId == data.series.tvdbId);
			if (request) {
				dbg('Matched to Request... Updating');
				const ss = new sonarrService(settingsService.getSettings(source));
				const series = await ss.getShowByTvdbId(data.series.tvdbId);
				if (series && series.episodeCount == series.episodeFileCount) request.status = 3;
				else request.status = 2;
				if (request.status == 3) notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
				request.save();
				dbg('Saved');
			}
		}
	});
};

const _movieNotification = (source) => {
	const dbg = debug.extend('movieNotification');
	notificationService.on(source, async (data) => {
		dbg('Checking to see if its an import notification');
		if (data.eventType == 'Download') {
			dbg('Is import notification. Matching...');
			const r = await service.getRequests();
			const request = r.find((x) => x.imdbId == data.remoteMovie.imdbId);
			if (request) {
				dbg('Matched to Request... Updating');
				request.status = 3;
				notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
				request.save();
				dbg('Matched to Request... Updating');
			}
		}
	});
};

module.exports = {
	getRequests: async (req, res, next) => {
		const dbg = debug.extend('getRequests');
		try {
			dbg('Getting Requests');
			const r = await service.getRequests();
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
			dbg(`Sent all requests to ${req.user.username}`)
		} catch (err) { dbg(err); next(err); }
	},
	getRequestsByStatus: async (req, res, next) => {
		const dbg = debug.extend('getRequestsByStatus');
		try {
			dbg('Getting Requests');
			const r = await service.getRequests();
			if (!r) res.status(200).send([]);
			else {
				dbg('Filtering Requests');
				r.forEach(request => { if (request.status != req.params.status) r.splice(r.indexOf(request), 1); });
				res.status(200).send(r);
			}
		} catch (err) { dbg(err); next(err); }
	},
	getRequest: async (req, res, next) => {
		const dbg = debug.extend('getRequest');
		try {
			dbg(`Getting Request ${req.params.id}`);
			const r = await service.getRequest(req.params.id);
			dbg(`Sending Request to ${req.user.username}`);
			if (!r) res.status(404).send({ name: 'Not Found', message: 'Request not found' });
			else res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	putRequest: async (req, res, next) => {
		const dbg = debug.extend('putRequest');
		try {
			const id = req.params.id
			const t = req.body;
			dbg(`Updating request ${id}`);
			const r = await Request.findById(id);

			let canUpdate = false;
			if (r.username == req.user.username) canUpdate = true;
			if (req.user.permissions.includes('ADMIN') || req.user.permissions.includes('REQ_EDIT')) canUpdate = true;
			if (!canUpdate) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });

			if (t.status && t.status != r.status) r.status = t.status;
			if (t.target && t.target != r.target) r.target = t.target;
			if (t.profile && t.profile != r.profile) r.profile = t.profile;
			if (t.rootPath &&t.rootPath != r.rootPath) r.rootPath = t.rootPath;
			
			await r.save();
			dbg('Updated');
			res.status(200).send(r);
		} catch (err) { dbg(err); next(err); }
	},
	postRequest: async (req, res, next) => {
		const dbg = debug.extend('postRequest');
		const tvdb = new TVDB('88D2ED25A2539ECE');
		const t = req.body;
		let r;
		const now = new Date();
		const requestsByUser = await Request.find({ username: req.user.username, dateAdded: { $gt: Math.floor(now.setDate(now.getDate() - settings.limitDays) / 1000) } }).exec();
		dbg(`User has made ${requestsByUser.length} requests in 7 days`);
		if (requestsByUser.length > settings.limitAmount && !req.user.permissions.includes('REQ_LIMIT_EXEMPT')) return next(new BadRequestError('Too many requests'));
		switch (t.type) {
			case 'tv':
				dbg('Is TV Request');
				if (t.tvdbId == '') return next(new BadRequestError('TV Requests require tvdbId'));
				try {
					dbg('Attempting to get tvdb information');
					const tvdbGet = await tvdb.getSeriesById(t.tvdbId);
					if (tvdbGet.seriesName != t.title) return next(new BadRequestError('Show title does not match ID'));
					dbg('Confirming no requests already exist');
					const aa = await Request.find({ tvdbId: t.tvdbId }).exec();
					if (aa.length > 0) return next(new BadRequestError('Request already exists'));
				} catch (err) { return next(new BadRequestError('Show by tvdbId does not exist')); }
				break;
			case 'movie':
				dbg('Is Movie Request');
				if (t.imdbId == '') return next(new BadRequestError('Movie Requests require imdbId'));
				try {
					dbg('Attempting to get imdb information');
					const imdbGet = await imdb.get({ id: t.imdbId }, { apiKey: '5af02350' });
					if (imdbGet.title != t.title) return next(new BadRequestError('Movie title does not match ID'));
					dbg('Confirming no requests already exist');
					const aa = await Request.find({ imdbId: t.imdbId }).exec();
					if (aa.length > 0) return next(new BadRequestError('Request already exists'));
				} catch (err) { return next(new BadRequestError('Movie by imdbId does not exist')); }
				break;
			case 'music':
				dbg('Is Music Request');
				if (t.musicBrainzId == '') return next(new BadRequestError('Music Requests require musicBrainzId'));
				try {
					dbg('Attempting to get musicbrainz information');
					const musicBrainzGet = await axios({ method: 'GET', url: `http://musicbrainz.org/ws/2/artist/${t.musicBrainzId}?inc=aliases&fmt=json` });
					if (musicBrainzGet.data.name != t.title) next(new BadRequestError('Artist name does not match ID'));
					dbg('Confirming no requests already exist');
					const aa = await Request.find({ musicBrainzId: t.musicBrainzId }).exec();
					if (aa.length > 0) return next(new BadRequestError('Request already exists'));
				} catch (err) { return next(new BadRequestError('Artist by musicBrainzId does not exist')); }
				break;
			default:
				return next(new BadRequestError('Could not determine request type'));
		}

		dbg('Creating request object');
		r = new Request(t);
		r.dateAdded = Date.now();
		r.username = req.user.username;
		r.status = 0;

		dbg('Applying default target');
		const targets = [
			{ 'type': 'tv', 'target': 'sonarr' },
			{ 'type': 'movie', 'target': 'radarr' },
			{ 'type': 'tv4k', 'target': 'sonarr4k' },
			{ 'type': 'movie4k', 'target': 'radarr4k' },
			{ 'type': 'movies3d', 'target': 'radarr3d' },
			{ 'type': 'music', 'target': 'lidarr' }];
		const targetMap = {};
		targets.map((x) => { targetMap[x.type] = x; });
		if (!t.target) t.target = targetMap[t.type].target;
		r.target = t.target;

		dbg('Loading controller for target');
		const plugin = require(`./${r.target}.controller`);
		if (plugin.hasItem == undefined) return next(new Error('Unable to target provider'));
		let hasItem = false;

		dbg('Validating target does not have request');
		switch (t.type) {
			case 'tv':
				hasItem = await plugin.hasItem(t.tvdbId);
				break;
			case 'movie':
				hasItem = await plugin.hasItem(t.imdbId);
				break;
			case 'music':
				hasItem = await plugin.hasItem(t.musicBrainzId);
				break;
			default:
				throw new RangeError('Unexpected `type`');
		}

		if (!hasItem) {
			dbg('Saving..')
			r.save();
			if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'add' });
			dbg('Finished');
			res.status(200).send(r);
		} else { dbg('Already exists on Target'); next(new BadRequestError('Item Exists')); }
	},
	approveRequest: async (req, res, next) => {
		const dbg = debug.extend('approveRequest');
		dbg('Getting Request');
		const originalRequest = await service.getRequest(req.params.id);
		dbg('Checking user permissions');
		if (!req.user.permissions.includes('ADMIN') && !req.user.permissions.includes(`REQ_APPROVE_${originalRequest.type.toUpperCase()}`)) return next(new Error('Unauthorized'));
		try {
			dbg('Approving request');
			const r = await service.approveRequest(req.params.id);
			if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'approve' });
			dbg('Finished');
			res.status(200).send(r);
		} catch (err) { next(err); }
	},
	deleteRequest: async (req, res, next) => {
		const dbg = debug.extend('approveRequest');
		try {
			dbg('Getting Request');
			const r = await service.getRequest(req.params.id);
			dbg('Checking user permissions');
			let canDelete = false;
			if (r.username == req.user.username) canDelete = true;
			if (req.user.permissions.includes('ADMIN') || req.user.permissions.includes('REQ_DELETE')) canDelete = true;
			if (!canDelete) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
			if (!r) { res.status(400).send({ name: 'BadRequest', message: 'Request does not exist' }); }
			dbg('Deleting Request');
			await service.delRequest(req.params.id, true);
			dbg('Finished');
			res.status(200).send({ name: 'OK', message: 'Deleted' });
			if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'delete' });
		} catch (err) { dbg(err); next(err); }
	},
	getConfigure: async (req, res, next) => {
		const dbg = debug.extend('getConfigure');
		if (!req.user.permissions.includes('ADMIN')) throw new Error('Unauthorized');
		const data = {
			schema: [{ name: 'limitDays', type: 'number' },
			{ name: 'limitAmount', type: 'number' },
			],
		};
		if (!settings) data.settings = {}
		else data.settings = settings;
		dbg(`Sending ${req.user.username} Settings`);
		res.status(200).send(data);
	},
	testConfigure: async (req, res, next) => {
		const dbg = debug.extend('testConfigure');
		try {
			if (!req.user.permissions.includes('ADMIN')) throw new Error('Unauthorized');
			if (!req.body.limitAmount) throw new Error('`limitAmount` Not Provided');
			if (!req.body.limitDays) throw new Error('`limitDays` Not Provided');
			const tempSettings = { limitDays: parseInt(req.body.limitDays), limitAmount: parseInt(req.body.limitAmount) };
			dbg(tempSettings);

			if (!Number.isInteger(tempSettings.limitDays)) throw new TypeError('`limitDays` is not a number');
			if (!Number.isInteger(tempSettings.limitAmount)) throw new TypeError('`limitAmount` is not a number');
			res.status(200).send({ message: 'success', settings: tempSettings });
		} catch (err) { dbg(err); next(err); }
	},
	saveConfigure: async (req, res, next) => {
		const dbg = debug.extend('saveConfigure');
		try {
			if (!req.user.permissions.includes('ADMIN')) throw new Error('Unauthorized');
			if (!req.body.limitAmount) throw new Error('`limitAmount` Not Provided');
			if (!req.body.limitDays) throw new Error('`limitDays` Not Provided');
			const tempSettings = { limitDays: parseInt(req.body.limitDays), limitAmount: parseInt(req.body.limitAmount) };
			dbg(tempSettings);

			if (!Number.isInteger(tempSettings.limitDays)) throw new TypeError('`limitDays` is not a number');
			if (!Number.isInteger(tempSettings.limitAmount)) throw new TypeError('`limitAmount` is not a number');

			dbg('Test passed... Saving');
			const allSettings = settingsService.getSettings();
			allSettings.requests = tempSettings;
			await settingsService._saveSettings(allSettings);
			settings = tempSettings;
			res.status(200).send({ message: 'success', settings });
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
			delete allSettings['requests'];

			dbg('Saving settings');
			await settingsService._saveSettings(allSettings);
			settings = { limitDays: 7, limitAmount: 20 };
			res.status(200).send({ message: 'success', settings });
		} catch (err) { dbg(err); next(err); }
	}
};
