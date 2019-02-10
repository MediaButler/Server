
const Request = require('../model/request');
const notificationService = require('./notification.service');
const radarrService = require('./radarr.service');
const sonarrService = require('./sonarr.service');
const lidarrService = require('./lidarr.service');
const settingsService = require('./settings.service');
const User = require('../model/user');

module.exports = class requestService {
	constructor(settings, startup = false) {
		this.settings = settingsService.getSettings('request');
		if (startup) this._approveTimer = setTimeout((() => { this.autoApprove(); }), 60 * 1000);
	}

	async autoApprove() {
		console.log('checking for approvals');
		const pending = await this.getPendingRequests();
		if (pending.length > 0) {
			pending.forEach(async (request) => {
				const userResult = await User.find({ username: request.username }).limit(1);
				if (userResult > 0) {
					const user = userResult[0];
					const permission = `REQ_AUTO_${r.type.toUpperCase()}`;
					if (user.permissions.has(permission)) {
						this.approveRequest(request.id);
						if (notificationService) notificationService.emit('request', { id: request.id, who: 'System', for: request.username, title: request.title, mediaType: request.type, type: 'approve' });
						console.log(`${new Date()} System approved ${request.username}'s request for ${request.title}`);
					}
				}
			});
		}
		clearTimeout(this._approveTimer);
		this._approveTimer = setTimeout((() => { this.autoApprove(); }), (60 * 60) * 1000);
	}

	async autoDelete() {
		console.log('checking for filled');
		const filled = await Request.find({ status: 3 });
		if (filled.length > 0) {
			filled.forEach((request) => {
				request.status = 4;
				request.save();
			});
		}
		clearTimeout(this._filledTimer);
		this._filledTimer = setTimeout(() => { this.autoDelete(); }, (15 * 60) * 1000);
	}


	async getRequests() {
		try {
			const r = await Request.find({ status: { $lt: 4 } });
			if (!r) throw new Error('No Results');
			return r;
		} catch (err) { throw err; }
	}

	async getPendingRequests() {
		try {
			const r = await Request.find({ status: 0 });
			if (!r) throw new Error('No Results');
			return r;
		} catch (err) { throw err; }
	}

	async getRequest(id) {
		try {
			const r = await Request.findById(id);
			if (!r) throw new Error('No Results');
			return r;
		} catch (err) { throw err; }
	}

	async addRequest(request) {

	}

	async approveRequest(id, oProfile = null, oRoot = null) {
		try {
			const settings = settingsService.getSettings('requests');
			const r = await this.getRequest(id);
			if (!r) throw new Error('No Results');
			const targets = {};
			if (!settings.targets) settings.targets = [
				{ 'type': 'tv', 'target': 'sonarr' },
				{ 'type': 'movie', 'target': 'radarr' },
				{ 'type': 'tv4k', 'target': 'sonarr4k' },
				{ 'type': 'movie4k', 'target': 'radarr4k' },
				{ 'type': 'movies3d', 'target': 'radarr3d' },
				{ 'type': 'music', 'target': 'lidarr' }];
			settings.targets.map((x) => { targets[x.type] = x; });

			switch (r.type) {
			case 'movie':
				try {
					const settings = settingsService.getSettings(r.target);
					const mv = {
						imdbId: r.imdbId,
						profile: (oProfile != 'null') ? settings.defaultProfile : oProfile,
						rootPath: (oRoot != 'null') ? settings.defaultRoot : oRoot
					};
					const service = new radarrService(settings);
					await service.addMovie(mv);
					r.status = 1;
				} catch (err) { throw err; }
				break;
			case 'tv':
				try {
					const settings = settingsService.getSettings(r.target);
					const show = {
						tvdbId: r.tvdbId,
						profile: (oProfile != 'null') ? settings.defaultProfile : oProfile,
						rootPath: (oRoot != 'null') ? settings.defaultRoot : oRoot
					};
					const service = new sonarrService(settings);
					const a = await service.addShow(show);
					r.status = 1;
				} catch (err) { throw err; }
				break;
			case 'music':
				try {
					const settings = settingsService.getSettings(r.target);
					const artist = {
						musicBrainzId: r.musicBrainzId,
						profile: (oProfile != 'null') ? settings.defaultProfile : oProfile,
						rootPath: (oRoot != 'null') ? settings.defaultRoot : oRoot
					};
					const service = new lidarrService(settings);
					const a = await service.addArtist(artist);
					r.status = 1;
				} catch (err) { throw err; }
				break;
			default:
				throw new Error('Could not determine type to approve');
			}
			r.save();
			return r;
		} catch (err) { throw err; }
	}

	async delRequest(id, confirmed = false) {
		if (confirmed) return Request.deleteOne({ '_id': id }).exec();
		else return false;
	}

	async addApprover(username, types = []) {

	}

	async addAutoApprove(username, types = []) {

	}
};