const debug = require('debug')('mediabutler:radarrService');
const url = require('url');
const axios = require('axios');
const axiosCache = require('axios-cache-adapter');

module.exports = class radarrService {
	constructor(settings) {
		debug('Starting');
		this._settings = settings;

		debug('Validating Settings');
		if (!settings) throw new Error('Settings not provided');
		if (!settings.url) throw new Error('URL not set');
		if (!settings.apikey) throw new Error('APIKey not set');
		if (settings.url.slice(-1) == '/') settings.url = settings.url.substring(0, settings.url.length - 1);
		if (!settings.defaultProfile) throw new Error('Default profile not set');
		if (!settings.defaultRoot) throw new Error('Defult rootpath not set');

		debug('Creating cached queries');
		const cache = axiosCache.setupCache({
			maxAge: (60 * 60) * 1000
		});
		this._api = axios.create({ adapter: cache.adapter });

		this.checkSettings();
		debug('Finished');
	}

	async checkSettings() {
		const dbg = debug.extend('checkSettings');
		try {
			dbg('Verifying Profile');
			const a = await this.getProfile(this._settings.defaultProfile);
			dbg('Verifying rootPath');
			const b = await this.getRootPath(this._settings.defaultRoot);
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
				'onGrab': true, 'onDownload': true, 'onUpgrade': true, 'onRename': true, 'supportsOnGrab': true, 'supportsOnDownload': true, 'supportsOnUpgrade': true, 'supportsOnRename': true,
				'tags': [], 'name': 'MediaButler API', 'fields': [{ 'order': 0, 'name': 'Url', 'label': 'URL', 'type': 'url', 'advanced': false, 'value': notificationUrl },
					{
						'order': 1, 'name': 'Method', 'label': 'Method', 'helpText': 'Which HTTP method to use submit to the Webservice', 'value': 2, 'type': 'select', 'advanced': false, 'selectOptions': [{ 'value': 2, 'name': 'POST' },
							{ 'value': 1, 'name': 'PUT' }]
					}, { 'order': 2, 'name': 'Username', 'label': 'Username', 'type': 'textbox', 'advanced': false }, { 'order': 3, 'name': 'Password', 'label': 'Password', 'type': 'password', 'advanced': false }],
				'implementationName': 'Webhook', 'implementation': 'Webhook', 'configContract': 'WebhookSettings', 'infoLink': 'https://github.com/Radarr/Radarr/wiki/Supported-Notifications#webhook', 'presets': []
			};

			dbg('Adding webhook');
			const r = await this._post('notification', data);
			return r.data;
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
			const result = await this._get('queue', { 'sort_by': 'timeleft', 'order': 'asc' });
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
			const status = await this._get('system/status', {});
			return status;
		} catch (err) { dbg(err); throw err; }
	}

	async getProfiles() {
		const dbg = debug.extend('getProfiles');
		try {
			dbg('Getting profiles');
			const req = await this._get('profile') || [];
			return req;
		} catch (err) { dbg(err); throw err; }
	}

	async getProfile(name) {
		const dbg = debug.extend('getProfile');
		try {
			dbg('Getting profiles');
			const allProfiles = await this._get('profile');
			dbg('Filtering profiles');
			let profileMap = Array(allProfiles.length);
			allProfiles.map((x) => profileMap[x.name.toString()] = x);
			dbg('Finsihed');
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
				pathMap = Array();
				allPaths.map((x) => pathMap[x.path] = x);
				return pathMap[path];
			}
		} catch (err) { dbg(err); throw err; }
	}

	async getRootPaths() {
		const dbg = debug.extend('getRootPaths');
		try {
			dbg('Getting paths');
			const allPaths = await this._get('rootfolder') || [];
			return allPaths;
		} catch (err) { dbg(err); throw err; }
	}

	async lookupMovie(filter) {
		const dbg = debug.extend('lookupMovie');
		try {
			dbg('Parsing data');
			let qry;
			if (filter.imdbId) qry = `imdb:${filter.imdbId}`;
			else if (filter.name) qry = filter.name;
			if (!qry) throw new Error('No query');

			dbg('Performing lookup');
			const result = await this._get('movie/lookup', { 'term': `${qry}` }) || [];
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async getMovies() {
		const dbg = debug.extend('getMovies');
		try {
			dbg('Getting movies');
			const result = await this._get('movie', {}) || [];
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async getMovieByimdbId(id) {
		const dbg = debug.extend('getMovieByimdbId');
		try {
			dbg('Getting movies');
			const allMovies = await this.getMovies();

			dbg('Filtering movies');
			const movieMap = Array(allMovies.length);
			allMovies.map((x) => movieMap[x.imdbId] = x);

			dbg('Finished');
			return movieMap[id];
		} catch (err) { dbg(err); throw err; }
	}

	async searchMovie(imdbId) {
		const dbg = debug.extend('searchMovie');
		try {
			dbg('Performing search');
			const result = await this._post('command', { name: 'MoviesSearch', movieIds: [parseInt(imdbId)] });
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async addMovie(movie) {
		const dbg = debug.extend('addMovie');
		try {
			dbg('Validating id\'s');
			if (!movie.imdbId) throw new Error('imdbId not set');
			if (!movie.profile && !movie.profileId) throw new Error('Profile not set');
			if (!movie.rootPath) throw new Error('Root path not set');

			dbg('Getting profile');
			if (!movie.profileId) {
				const profile = await this.getProfile(movie.profile);
				if (profile.id) movie.profileId = profile.id;
				else throw new Error('Unable to determine profile');
			}

			dbg('Performing lookup');
			const getResult = await this.lookupMovie({ imdbId: movie.imdbId, limit: 1 });

			dbg('Crafting payload');
			const data = {
				'tmdbId': getResult[0].tmdbId,
				'title': getResult[0].title,
				'qualityProfileId': movie.profileId,
				'titleSlug': getResult[0].titleSlug,
				'images': getResult[0].images,
				'monitored': true,
				'rootFolderPath': movie.rootPath || this._settings.rootPath,
				'year': getResult[0].year,
				'addOptions': { searchForMovie: true }
			};

			dbg('Sending Payload');
			const result = await this._post('movie', data);

			dbg('Validating add');
			if (result.title == undefined || result.title == null) throw new Error('Failed to add');
			return true;
		} catch (err) {
			dbg(err);
			if (err.message == 'NotFound') {
				this.searchMovie(movie.imdbId);
				return true;
			}
			throw err;
		}
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
			const req = await this._api({ method: 'GET', url: `${this._settings.url}/api/${command}?${params}`, headers: { 'x-api-key': this._settings.apikey } });
			return req.data;
		} catch (err) { dbg(err); throw err; }
	}

	async _post(command, data) {
		const dbg = debug.extend('_post');
		try {
			dbg('Sending Payload');
			const req = await this._api({ method: 'POST', url: `${this._settings.url}/api/${command}`, data, headers: { 'x-api-key': this._settings.apikey } });
			return req.data;
		} catch (err) { dbg(err); throw err; }
	}

	async _put(command, data) {
		const dbg = debug.extend('_put');
		try {
			dbg('Sending Payload');
			const req = await this._api({ method: 'PUT', url: `${this._settings.url}/api/${command}`, data, headers: { 'x-api-key': this._settings.apikey } });
			return req.data;
		} catch (err) { dbg(err); throw err; }
	}

	async _delete(command) {
		const dbg = debug.extend('_delete');
		try {
			dbg('Sending Payload');
			const req = await this._api({ method: 'DELETE', url: `${this._settings.url}/api/${command}`, headers: { 'x-api-key': this._settings.apikey } });
			return req.data;
		} catch (err) { dbg(err); throw err; }
	}
};