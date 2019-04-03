const debug = require('debug')('mediabutler:plexService');
const plexApi = require('plex-api');
const url = require('url');
const WebSocket = require('ws');

module.exports = class plexService {
	constructor(settings, startup = false) {
		debug('Validating settings');
		if (!settings.url) throw new Error('URL is not set');
		//if (!settings.token) throw new Error('Token not provided');
		const plexUrl = url.parse(settings.url);
		let port;
		if (plexUrl.port == null) {
			if (plexUrl.protocol == 'https:') port = 443;
			if (plexUrl.protocol == 'http:') port = 80;
		}
		debug(' Crafting Plex client');
		const opts = {
			options: {
				identifier: 'df9e71a5-a6cd-488e-8730-aaa9195f7435',
				product: 'MediaButler',
				version: 'v1.0',
				deviceName: 'DeviceName',
				device: 'API',
				platformVersion: 'v1.0'
			},
			hostname: plexUrl.hostname,
			port: parseInt(plexUrl.port) || parseInt(port),
			https: Boolean((plexUrl.protocol == 'https:')),
			token: settings.token,
		};
		this._api = new plexApi(opts);
		if (startup) {
			debug('Creating WebSocket connection');
			this._websocket = new WebSocket(`ws://${plexUrl.host}/:/websockets/notifications?X-Plex-Token=${settings.token}`);
			this._websocket.on('message', (data) => { this.webSocketNotification(this, data); });
		}
	}

	async webSocketNotification(service, data) {
		const dbg = debug.extend('webSocketNotification');
		try {
			dbg('Received notification')
			data = JSON.parse(data);
			if (data.NotificationContainer.type == 'playing') {
				const sessionKey = data.NotificationContainer.PlaySessionStateNotification[0].sessionKey;
				const ratingKey = data.NotificationContainer.PlaySessionStateNotification[0].ratingKey;
				const state = data.NotificationContainer.PlaySessionStateNotification[0].state;
				const np = await service.getNowPlaying();
				const nowPlaying = new Array();
				if (np.MediaContainer.Metadata) np.MediaContainer.Metadata.map((x) => { nowPlaying[x.sessionKey] = x; });
				//console.log(nowPlaying[sessionKey]);
			}
		} catch (err) { dbg(err); throw err; }
	}

	async getIdentity() {
		const dbg = debug.extend('getIdentity');
		try {
			dbg('Getting identity');
			const res = await this._api.query('/identity');
			return res;
		} catch (err) { dbg(err); return false; }
	}

	async check() {
		const dbg = debug.extend('check');
		try {
			dbg('Running check');
			const res = await this._api.query('/');
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async getNowPlaying() {
		const dbg = debug.extend('getNowPlaying');
		try {
			dbg('Getting active sessions');
			const res = await this._api.query('/status/sessions');
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async killStream(id, reason) {
		const dbg = debug.extend('killStream');
		try {
			dbg('Attempting to kill stream');
			return await this._api.perform(`/status/sessions/terminate?sessionId=${id}&reason=${urlencode(reason)}`);
		} catch (err) { dbg(err); throw err; }
	}

	async getHistory() {
		const dbg = debug.extend('getHistory');
		try {
			dbg('Getting history');
			const res = await this._api.query('/status/sessions/history/all');
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async getMetadata(ratingKey) {
		const dbg = debug.extend('getMetadata');
		try {
			dbg('Getting metadata');
			const res = await this._api.query(`/library/metadata/${ratingKey}`);
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async getDirectory(parentRatingKey) {
		const dbg = debug.extend('getDirectory');
		try {
			dbg('Getting directory');
			const res = await this._api.query(`/library/metadata/${parentRatingKey}/allLeaves?`);
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async searchAudioLibraries(query) {
		const dbg = debug.extend('searchAudioLibraries');
		try {
			dbg('Running search');
			const res = await this._api.query(`/search?type=10&query=${query}`);
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async searchLibraries(query) {
		const dbg = debug.extend('searchLibraries');
		try {
			dbg('Searching libraries');
			const res = await this._api.query(`/hubs/search?includeCollections=1&sectionId=&query=${query}`);
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async getThumb(key) {
		const dbg = debug.extend('getThumb');
		try {
			dbg('Getting thumbnail');
			const res = await this._api.query(key);
			return res;
		} catch (err) { dbg(err); throw err; }
	}

	async getPart(key) {
		const dbg = debug.extend('getPart');
		try {
			dbg('Getting part');
			const res = await this._api.query(key);
			return res;
		} catch (err) { dbg(err); throw err; }
	}
	
	audioPlaylists() {
		// Return all playlists
	}

	audioPlaylist() {
		// Get single playlist from playlists
	}
};