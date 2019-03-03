const TVDB = require('node-tvdb');
const imdb = require('imdb-api');
const axios = require('axios');
const Request = require('../model/request');
const requestService = require('../service/request.service');
const settingsService = require('../service/settings.service');
const notificationService = require('../service/notification.service');
const NotImplementedError = require('../errors/notimplemented.error');
const BadRequestError = require('../errors/badrequest.error');
const sonarrService = require('../service/sonarr.service');
const radarrService = require('../service/radarr.service');

const settings = settingsService.getSettings('requests');
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

const _tvNotification = (source) => {
	notificationService.on(source, async (data) => {
		if (data.eventType == 'Download') {
			const r = await service.getRequests();
			const request = r.find((x) => x.tvdbId == data.series.tvdbId);
			if (request) {
				const ss = new sonarrService(settingsService.getSettings(source));
				const series = await ss.getShowByTvdbId(data.series.tvdbId);
				if (series && series.episodeCount == series.episodeFileCount) request.status = 3;
				else request.status = 2;
				if (request.status == 3) notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
				request.save();
			}
		}
	});
};

const _movieNotification = (source) => {
	notificationService.on(source, async (data) => {
		if (data.eventType == 'Download') {
			const r = await service.getRequests();
			const request = r.find((x) => x.imdbId == data.remoteMovie.imdbId);
			if (request) {
				request.status = 3;
				notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
				request.save();
			}
		}
	});
};

module.exports = {
	getRequests: async (req, res, next) => {
		try {
			const r = await service.getRequests();
			if (!r) res.status(200).send([]);
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	getRequestsByStatus: async (req, res, next) => {
		try {
			const r = await service.getRequests();
			if (!r) res.status(200).send([]);
			else {
				r.forEach(request => { if (request.status != req.params.status) r.splice(r.indexOf(request), 1); });
				res.status(200).send(r);
			}
		} catch (err) { next(err); }
	},
	getRequest: async (req, res, next) => {
		try {
			const r = await service.getRequest(req.params.id);
			if (!r) res.status(404).send({ name: 'Not Found', message: 'Request not found' });
			else res.status(200).send(r);
		} catch (err) { next(err); }
	},
	putRequest: async (req, res, next) => {
		try {
			const id = req.params.id
			const t = req.body;
			const r = await Request.findByIdAndUpdate(id, t);
			res.status(200).send(r);
		} catch (err) { next(err); }
	},
	postRequest: async (req, res, next) => {
		const tvdb = new TVDB('88D2ED25A2539ECE');
		const t = req.body;
		let r;
		const now = new Date();
		const requestsByUser = await Request.find({ username: req.user.username, dateAdded: { $gt: Math.floor(now.setDate(now.getDate() - 7) / 1000) } }).exec();
		console.log(requestsByUser.length);
		if (requestsByUser.length > 20) return next(new BadRequestError('Too many requests'));
		switch (t.type) {
			case 'tv':
				if (t.tvdbId == '') return next(new BadRequestError('TV Requests require tvdbId'));
				try {
					const tvdbGet = await tvdb.getSeriesById(t.tvdbId);
					if (tvdbGet.seriesName != t.title) return next(new BadRequestError('Show title does not match ID'));
					const aa = await Request.find({ tvdbId: t.tvdbId }).exec();
					if (aa.length > 0) return next(new BadRequestError('Request already exists'));
				} catch (err) { return next(new BadRequestError('Show by tvdbId does not exist')); }
				break;
			case 'movie':
				if (t.imdbId == '') return next(new BadRequestError('Movie Requests require imdbId'));
				try {
					const imdbGet = await imdb.get({ id: t.imdbId }, { apiKey: '5af02350' });
					if (imdbGet.title != t.title) return next(new BadRequestError('Movie title does not match ID'));
					const aa = await Request.find({ imdbId: t.imdbId }).exec();
					if (aa.length > 0) return next(new BadRequestError('Request already exists'));
				} catch (err) { return next(new BadRequestError('Movie by imdbId does not exist')); }
				break;
			case 'music':
				if (t.musicBrainzId == '') return next(new BadRequestError('Music Requests require musicBrainzId'));
				try {
					const musicBrainzGet = await axios({ method: 'GET', url: `http://musicbrainz.org/ws/2/artist/${t.musicBrainzId}?inc=aliases&fmt=json` });
					if (musicBrainzGet.data.name != t.title) next(new BadRequestError('Artist name does not match ID'));
					const aa = await Request.find({ musicBrainzId: t.musicBrainzId }).exec();
					if (aa.length > 0) return next(new BadRequestError('Request already exists'));
				} catch (err) { return next(new BadRequestError('Artist by musicBrainzId does not exist')); }
				break;
			default:
				return next(new BadRequestError('Could not determine request type'));
		}

		r = new Request(t);
		r.dateAdded = Date.now();
		r.username = req.user.username;
		r.status = 0;

		const targetMap = {};
		settings.targets.map((x) => { targetMap[x.type] = x; });
		if (!t.target) t.target = targetMap[t.type].target;
		r.target = t.target;

		const plugin = require(`./${r.target}.controller`);
		if (plugin.hasItem == undefined) return next(new Error('Unable to target provider'));
		let hasItem = false;

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
			r.save();
			if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'add' });
			console.log(`${new Date().toTimeString()} ${req.user.username} added request for ${r.title}`);
			res.status(200).send(r);
		} else { return next(new BadRequestError('Item Exists')); }
	},
	approveRequest: async (req, res, next) => {
		const originalRequest = await service.getRequest(req.params.id);
		if (!req.user.permissions.includes('ADMIN') && !req.user.permissions.includes(`REQ_APPROVE_${originalRequest.type.toUpperCase()}`)) return next(new Error('Unauthorized'));
		try {
			const r = await service.approveRequest(req.params.id);
			if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'approve' });
			console.log(`${new Date()} ${req.user.username} approved ${originalRequest.username}'s request for ${originalRequest.title}`);
			res.status(200).send(r);
		} catch (err) { next(err); }
	},
	deleteRequest: async (req, res, next) => {
		const r = await service.getRequest(req.params.id);
		let canDelete = false;
		if (r.username == req.user.username) canDelete = true;
		if (req.user.permissions.includes('ADMIN') || req.user.permissions.includes('REQ_DELETE')) canDelete = true;
		if (!canDelete) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
		if (!r) { res.status(400).send({ name: 'BadRequest', message: 'Request does not exist' }); }
		await service.delRequest(req.params.id, true);
		res.status(200).send({ name: 'OK', message: 'Deleted' });
		if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'delete' });
	},
	getConfigure: async (req, res, next) => {
		if (!req.user.permissions.includes('ADMIN')) throw new Error('Unauthorized');
		const data = {
			schema: [],
			settings: {}
		};
		res.status(200).send(data);
	}
};
