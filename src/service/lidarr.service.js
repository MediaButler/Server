const debug = require('debug')('mediabutler:lidarrService');
const axios = require('axios');
const url = require('url');
const axiosCache = require('axios-cache-adapter');

module.exports = class lidarrService {
	constructor(settings) {
		debug('Starting');
		this.settings = settings;
		debug('Vaidating settings');
		if (!settings.url) throw new Error('URL not set');
		if (!settings.apikey) throw new Error('APIKey not set');
		if (settings.url.slice(-1) == '/') settings.url = settings.url.substring(0, settings.url.length - 1);
		if (!settings.defaultProfile) throw new Error('Default profile not set');
		if (!settings.defaultRoot) throw new Error('Defult rootpath not set');
		this.checkSettings();

		debug('Creating cached queries');
		const cache = axiosCache.setupCache({
			maxAge: (60 * 60) * 1000
		});
		this._api = axios.create({ adapter: cache.adapter });
		debug('Finished');
	}

	async checkSettings() {
		const dbg = debug.extend('checkSettings');
		try {
			dbg('Verifying Profile');
			const a = await this.getProfile(this.settings.defaultProfile);
			dbg('Verifying rootPath');
			const b = await this.getRootPath(this.settings.defaultRoot);
			if (!a) throw Error('Profile Not Found');
			if (!b) throw Error('Rootpath Not Found');
			dbg('Verified');
			return (a && b);
		} catch (err) { throw err; }
	}

	async getNotifiers() {
		const dbg = debug.extend('getNotifiers');
		try {
			dbg('Getting notifiers');
			return await this._get('notification');
		} catch (err) { dbg(err); throw err; }
	}

	async deleteWebhook(id) {
		const dbg = debug.extend('getNotifiers');
		try {
			dbg('Deleting Webhook');
			return await this._delete(`notification/${id}`);
		} catch (err) { dbg(err); throw err; }
	}

	async addWebhookNotifier(notificationUrl) {
		const dbg = debug.extend('addWebhookNotifier');
		try {
			dbg('Crafting payload');
			const data = {
				'onGrab': true, 'onDownload': true, 'onAlbumDownload': false, 'onUpgrade': true, 'onRename': true, 'supportsOnGrab': true, 'supportsOnDownload': true, 'supportsOnAlbumDownload': false,
				'supportsOnUpgrade': true, 'supportsOnRename': true, 'name': 'MediaButler API', 'fields': [{
					'order': 0, 'name': 'url', 'label': 'URL', 'type': 'url', 'advanced': false,
					'value': notificationUrl
				}, {
					'order': 1, 'name': 'method', 'label': 'Method', 'helpText': 'Which HTTP method to use submit to the Webservice', 'value': 1, 'type': 'select', 'advanced': false,
					'selectOptions': [{ 'value': 1, 'name': 'POST' }, { 'value': 2, 'name': 'PUT' }]
				}, { 'order': 2, 'name': 'username', 'label': 'Username', 'type': 'textbox', 'advanced': false },
				{ 'order': 3, 'name': 'password', 'label': 'Password', 'type': 'password', 'advanced': false }], 'implementationName': 'Webhook', 'implementation': 'Webhook', 'configContract': 'WebhookSettings',
				'infoLink': 'https://github.com/Lidarr/Lidarr/wiki/Supported-Notifications#webhook', 'tags': [], 'presets': []
			};
			dbg('Adding webhook');
			const r = await this._post('notification', data);
			return r;
		} catch (err) { dbg(err); throw err; }
	}

	async getCalendar() {
		const dbg = debug.extend('getCalendar');
		try {
			dbg('Calculating dates');
			const today = new Date();
			const beginningMonth = new Date(today.getFullYear(), today.getMonth(), 1);
			const endMonth = new Date(today.getFullYear(), today.getMonth(), 31);
			dbg('Getting calendar');
			const result = await this._get('calendar', { 'start': beginningMonth.toISOString(), 'end': endMonth.toISOString() });
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async getQueue() {
		const dbg = debug.extend('getQueue');
		try {
			dbg('Getting queue');
			const result = await this._get('queue');
			if (result.length === 0) return []
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async getHistory() {
		const dbg = debug.extend('getHistory');
		try {
			dbg('Getting history');
			const history = await this._get('history', { page: 1, pageSize: 15, sortKey: 'date', sortDir: 'desc' });
			return history;
		} catch (err) { dbg(err); throw err; }
	}

	async getSystemStatus() {
		const dbg = debug.extend('getSystemStatus');
		try {
			dbg('Getting status');
			const status = await this._get('system/status');
			return status;
		} catch (err) { dbg(err); throw err; }
	}

	async getProfile(name) {
		const dbg = debug.extend('getProfile');
		try {
			dbg('Getting profiles');
			const allProfiles = await this._get('qualityprofile');
			dbg('Filtering profiles');
			let profileMap = Array(allProfiles.length);
			allProfiles.map((x) => profileMap[x.name.toString()] = x);
			dbg('Finished');
			return profileMap[name];
		} catch (err) { dbg(err); throw err; }
	}

	async getRootPath(path) {
		const dbg = debug.extend('getRootPath');
		try {
			dbg('Getting root paths');
			const allPaths = await this._get('rootfolder');
			dbg('Filtering paths');
			let pathMap;
			if (typeof (allPaths) == 'object') {
				return allPaths;
			} else {
				let pathMap = Array();
				allPaths.map((x) => pathMap[x.path] = x);
				return pathMap[path];
			}
		} catch (err) { dbg(err); throw err; }
	}

	async lookupArtist(filter = {}) {
		const dbg = debug.extend('lookupArtist');
		try {
			dbg('Parsing data');
			let qry;
			if (filter.musicBrainzId) qry = `lidarr:${filter.musicBrainzId}`;
			else if (filter.name) qry = filter.name;
			if (!qry) throw new Error('No query');
			dbg('Performing lookup');
			const result = await this._get('artist/lookup', { 'term': `${qry}` });
			if (result.length === 0) throw new Error('No results for query');
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async addArtist(artist) {
		const dbg = debug.extend('addArtist');
		try {
			dbg('Validating id\'s');
			if (!artist.musicBrainzId) throw new Error('musicBrainzId not set');
			if (!artist.profile && !artist.profileId) throw new Error('Profile not set');
			if (!artist.rootPath) throw new Error('Root path not set');

			dbg('Getting profile');
			if (!artist.profileId) {
				const profile = await this.getProfile(artist.profile);
				if (profile.id) artist.profileId = profile.id;
				else throw new Error('Unable to determine profile');
			}

			dbg('Performing lookup');
			const getResult = await this.lookupArtist({ musicBrainzId: artist.musicBrainzId, limit: 1 });

			dbg('Crafting payload');
			const data = getResult[0];
			data['qualityProfileId'] = artist.profileId,
				data['discogsId'] = 0;
			data['languageProfileId'] = 1;
			data['metadataProfileId'] = 1;
			data['monitored'] = true;
			data['rootFolderPath'] = artist.rootPath || this._settings.rootPath;
			data['addOptions'] = { searchForMissingAlbums: false };

			dbg('Sending Payload');
			const result = await this._post('artist', data);

			dbg('Validating add');
			if (result.artistName == undefined || result.artistName == null) throw new Error('Failed to add');
			this.cache = false;
			return true;
		} catch (err) { dbg(err); throw err; }
	}

	async getArtists() {
		const dbg = debug.extend('getArtists');
		try {
			dbg('Getting artists');
			const status = await this._get('artist');
			return status;
		} catch (err) { dbg(err); throw err; }
	}

	async getArtistByMusicBrainzId(musicBrainzId) {
		const dbg = debug.extend('getArtistByMusicBrainzId');
		try {
			dbg('Getting all artists');
			const allArtists = await this.getArtists();

			dbg('Filtering');
			let artistMap = Array();
			allArtists.map((x) => artistMap[x.foreignArtistId] = x);
			return artistMap[musicBrainzId];
		} catch (err) { dbg(err); throw err; }
	}

	async lookupAlbum(filter = {}) {
		const dbg = debug.extend('lookupAlbum');
		try {
			dbg('Parsing query');
			let qry;
			if (filter.musicBrainzId) qry = `lidarr:${filter.musicBrainzId}`;
			else if (filter.name) qry = filter.name;
			if (!qry) throw new Error('No query');
			dbg('Performing lookup');
			const result = await this._get('album/lookup', { 'term': `${qry}` });
			if (result.length === 0) throw new Error('No results for query');
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async addAlbum(album) {

	}

	async getAlbums() {
		const dbg = debug.extend('getAlbums');
		try {
			dbg('Getting all albums');
			const status = await this._get('album');
			return status;
		} catch (err) { dbg(err); throw err; }
	}

	async _get(command, args = {}) {
		const dbg = debug.extend('_get');
		try {
			dbg('Crafting URL');
			let params = '';
			if (typeof (args) == 'object') {
				for (let key of Object.keys(args)) {
					params += `${key}=${args[key]}&`;
				}
			}
			dbg('Sending Request');
			const req = await this._api({ method: 'GET', url: `${this.settings.url}/api/v1/${command}?${params}`, headers: { 'x-api-key': this.settings.apikey } });
			return req.data;
		} catch (err) { dbg(err); throw err; }
	}

	async _post(command, data) {
		const dbg = debug.extend('_post');
		try {
			dbg('Sending Payload');
			const req = await this._api({ method: 'POST', url: `${this.settings.url}/api/v1/${command}`, data, headers: { 'x-api-key': this.settings.apikey } });
			return req.data;
		} catch (err) { dbg(err); throw err; }
	}

	async _delete(command) {
		const dbg = debug.extend('_delete');
		try {
			dbg('Sending Request');
			const req = await this._api({ method: 'DELETE', url: `${this.settings.url}/api/v1/${command}`, headers: { 'x-api-key': this.settings.apikey } });
			return req.data;
		} catch (err) { dbg(err); throw err; }
	}
};