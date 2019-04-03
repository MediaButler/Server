
const debug = require('debug')('mediabutler:requestService');
const Request = require('../model/request');
const notificationService = require('./notification.service');
const radarrService = require('./radarr.service');
const sonarrService = require('./sonarr.service');
const lidarrService = require('./lidarr.service');
const settingsService = require('./settings.service');
const User = require('../model/user');

module.exports = class requestService {
	constructor(settings) {
		debug('Starting');
		this.settings = settingsService.getSettings('request');
	}

	async autoApprove() {
		const dbg = debug.extend('autoApprove');
		try {
			dbg('Get pending requests');
			const pending = await this.getPendingRequests();

			if (pending.length > 0) {
				dbg('Checking requests');
				pending.forEach(async (request) => {
					dbg('Pulling user information')
					const userResult = await User.find({ username: request.username }).limit(1);
					if (userResult > 0) {
						dbg('Checking for auto approve permission');
						const user = userResult[0];
						const permission = `REQ_AUTO_${request.type.toUpperCase()}`;
						if (user.permissions.has(permission)) {
							dbg('Has permission. Approving');
							this.approveRequest(request.id);
							if (notificationService) notificationService.emit('request', { id: request.id, who: 'System', for: request.username, title: request.title, mediaType: request.type, type: 'approve' });
						}
					}
				});
			}

			dbg('Resetting timer');
			clearTimeout(this._approveTimer);
			this._approveTimer = setTimeout((() => { this.autoApprove(); }), (5 * 60) * 1000);
		} catch (err) { dbg(err); throw err; }
	}

	async autoDelete() {
		const dbg = debug.extend('autoDelete');
		try {
			dbg('Checking for filled requests to delete');
			const filled = await Request.find({ status: 3 });
			if (filled.length > 0) {
				dbg('There are requests to delete');
				filled.forEach((request) => {
					dbg('Deleting request');
					request.status = 4;
					request.save();
				});
			}

			dbg('Resetting timer');
			clearTimeout(this._filledTimer);
			this._filledTimer = setTimeout(() => { this.autoDelete(); }, (15 * 60) * 1000);
		} catch (err) { dbg(err); throw err; }
	}

	async autoFilled() {
		const dbg = debug.extend('autoFilled');
		try {
			dbg('Checking for Approved requests to be filled');
			const reqs = await Request.find({ status: { $gt: 1, $lt: 3 }});
			if (reqs.length > 0) {
				reqs.forEach((req) => {
					// Load Service

					// Get Id

					// Check if filled

					// if filled { change status, fire notification }
				});
			}
		} catch (err) { dbg(err); throw err; }
	}

	async getRequests() {
		const dbg = debug.extend('getRequests');
		try {
			dbg('Getting requests');
			const r = await Request.find({ status: { $lt: 4 } });
			if (!r) throw new Error('No Results');
			return r;
		} catch (err) { dbg(err); throw err; }
	}

	async getPendingRequests() {
		const dbg = debug.extend('getPendingRequests');
		try {
			dbg('Getting pending requests');
			const r = await Request.find({ status: 0 });
			if (!r) throw new Error('No Results');
			return r;
		} catch (err) { dbg(err); throw err; }
	}

	async getRequest(id) {
		const dbg = debug.extend('getRequest');
		try {
			dbg(`Getting request ${id}`);
			const r = await Request.findById(id);
			if (!r) throw new Error('No Results');
			return r;
		} catch (err) { dbg(err); throw err; }
	}

	async addRequest(request) {

	}

	async approveRequest(id) {
		const dbg = debug.extend('approveRequest');
		try {
			dbg('Getting request');
			const r = await this.getRequest(id);
			if (!r) throw new Error('No Results');

			dbg('Getting target');
			switch (r.type) {
				case 'movie':
					try {
						dbg('Get Target Settings');
						const settings = settingsService.getSettings(r.target);

						dbg('Crafting payload');
						const mv = {
							imdbId: r.imdbId,
							profile: r.profile || settings.defaultProfile,
							rootPath: r.rootPath || settings.defaultRoot
						};

						dbg('Sending payload');
						const service = new radarrService(settings);
						await service.addMovie(mv);
						r.status = 1;
					} catch (err) { dbg(err); throw err; }
					break;
				case 'tv':
					try {
						dbg('Get target settings');
						const settings = settingsService.getSettings(r.target);

						dbg('Crafting payload');
						const show = {
							tvdbId: r.tvdbId,
							profile: r.profile || settings.defaultProfile,
							rootPath: r.rootPath || settings.defaultRoot
						};

						dbg('Sending payload');
						const service = new sonarrService(settings);
						const a = await service.addShow(show);
						r.status = 1;
					} catch (err) { dbg(err); throw err; }
					break;
				case 'music':
					try {
						dbg('Get target settings');
						const settings = settingsService.getSettings(r.target);

						dbg('Crafting payload');
						const artist = {
							musicBrainzId: r.musicBrainzId,
							profile: r.profile || settings.defaultProfile,
							rootPath: r.rootPath || settings.defaultRoot
						};

						dbg('Sending payload');
						const service = new lidarrService(settings);
						const a = await service.addArtist(artist);
						r.status = 1;
					} catch (err) { throw err; }
					break;
				default:
					throw new Error('Could not determine type to approve');
			}
			dbg('Saving request');
			r.save();
			return r;
		} catch (err) { dbg(err); throw err; }
	}

	async delRequest(id, confirmed = false) {
		const dbg = debug.extend('delRequest');
		try {
			dbg('Deleting request');
			if (confirmed) return Request.deleteOne({ '_id': id }).exec();
			else return false;
		} catch (err) { dbg(err); }
	}
};