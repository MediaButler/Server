const debug = require('debug')('mediabutler:sonarrService');
const TVShow = require('../model/tvshow');
const url = require('url');
const axios = require('axios');
const axiosCache = require('axios-cache-adapter');

module.exports = class sonarrService {
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
		debug('Done');
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
		} catch (err) { dbg(err); throw err; }
	}

	async getNotifiers() {
		const dbg = debug.extend('getNotifiers');
		try {
			dbg('Getting notifiers');
			return await this._get('notification');
		} catch (err) { dbg(err); throw err; }
	}

	async addWebhookNotifier(notificationUrl) {
		const dbg = debug.extend('addWebhookNotifier');
		try {
			dbg('Crafting payload');
			const data = {
				'onGrab': true, 'onDownload': true, 'onUpgrade': true, 'onRename': true, 'supportsOnGrab': true, 'supportsOnDownload': true, 'supportsOnUpgrade': true, 'supportsOnRename': true, 'tags': [],
				'name': 'MediaButler API', 'fields': [{ 'order': 0, 'name': 'Url', 'label': 'URL', 'type': 'url', 'advanced': false, 'value': notificationUrl }, {
					'order': 1, 'name': 'Method',
					'label': 'Method', 'helpText': 'Which HTTP method to use submit to the Webservice', 'value': 1, 'type': 'select', 'advanced': false, 'selectOptions': [{ 'value': 1, 'name': 'POST' }, { 'value': 2, 'name': 'PUT' }]
				},
				{ 'order': 2, 'name': 'Username', 'label': 'Username', 'type': 'textbox', 'advanced': false }, { 'order': 3, 'name': 'Password', 'label': 'Password', 'type': 'password', 'advanced': false }],
				'implementationName': 'Webhook', 'implementation': 'Webhook', 'configContract': 'WebhookSettings', 'infoLink': 'https://github.com/Sonarr/Sonarr/wiki/Supported-Notifications#webhook', 'presets': []
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

	async getHistory() {
		const dbg = debug.extend('getHistory');
		try {
			dbg('Getting history');
			const history = await this._get('history', { page: 1, pageSize: 15, sortKey: 'date', sortDir: 'desc' });
			return history;
		} catch (err) { dbg(err); throw err; }
	}

	async lookupShow(filter) {
		const dbg = debug.extend('lookupShow');
		try {
			dbg('Parsing data');
			let qry;
			if (filter.tvdbId) qry = `tvdb:${filter.tvdbId}`;
			if (filter.name) qry = filter.name;
			if (!qry) throw new Error('No query');

			dbg('Performing lookup');
			const result = await this._get('series/lookup', { 'term': `${qry}` });
			if (result.length === 0) throw new Error('No results for query');
			const a = [];
			dbg('Crafting result');
			result.forEach((show) => {
				const b = new TVShow();
				b.tvdbId = show.tvdbId;
				b.imdbId = show.imdbId;
				b.tvRageId = show.tvRageId;
				b.tvMazeId = show.tvMazeId;

				b.title = show.title;
				b.alternativeTitle = [];
				b.sortTitle = show.title.toLowerCase().replace('the ', '').replace('a ', '');
				b.cleanTitle = b.sortTitle.replace(' ', '');

				b.overview = show.overview;
				b.year = show.year;
				b.certification = show.certification;
				b.genres = [];
				show.genres.forEach((g) => {
					b.genres.push(g);
				});
				b.rating = `${(show.ratings.value) ? show.ratings.value : 0}/${(show.ratings.votes) ? show.ratings.votes : 0}`;
				b.status = show.status;
				b.network = show.network;
				b.airTime = show.airTime;
				b.firstAired = show.firstAired;
				b.seasonCount = show.seasonCount;
				b.images = [];
				// show.images.forEach((i) => {
				//     const ii = { type: i.coverType, url: i.url };
				//     console.log(i);
				//     b.images.push(ii);
				// });
				b.monitoredSeasons = [];
				b.unmonitoredSeas = [];
				show.seasons.forEach((s) => {
					if (s.monitored == true) b.monitoredSeasons.push(s.seasonNumber);
					else b.unmonitoredSeasons.push(s.seasonNumber);
				});
				a.push(b);
			});
			dbg('Sending results');
			return a;
		} catch (err) { dbg(err); throw err; }
	}

	async getShows() {
		const dbg = debug.extend('getShows');
		try {
			dbg('Getting shows');
			let result = await this._get('series', {}) || [];
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

	async getShowByTvdbId(id) {
		const dbg = debug.extend('getShowByTvdbId');
		try {
			dbg('Getting all shows');
			const allShows = await this.getShows() || [];

			dbg('Filtering shows');
			const showsMap = Array(allShows.length);
			allShows.map((x) => showsMap[x.tvdbId] = x);

			dbg('Finished');
			return showsMap[id];
		} catch (err) { dbg(err); throw err; }
	}

	async searchShow(tvdbId) {
		const dbg = debug.extend('searchShow');
		try {
			dbg('Performing search');
			const show = await this.getShowByTvdbId(tvdbId);
			const result = await this._post('command', { name: 'SeriesSearch', seriesId: parseInt(tvdbId) });
			return result;
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

	async getShow(id) {
		const dbg = debug.extend('getShow');
		try {
			dbg('Getting show by id');
			const result = await this._get(`series/${id}`);
			if (result.length === 0) throw new Error('No results');
			dbg('Finished');
			return result;
		} catch (err) { dbg(err); throw err; }
	}

	async getProfiles() {
		const dbg = debug.extend('getProfiles');
		try {
			dbg('Getting all profiles');
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

	async getRootPaths() {
		const dbg = debug.extend('getRootPaths');
		try {
			dbg('Getting paths');
			const allPaths = await this._get('rootfolder') || [];
			return allPaths;
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

	async addShow(show) {
		const dbg = debug.extend('addShow');
		try {
			dbg('Validating id\'s');
			if (!show.tvdbId) throw new Error('tvdbId not set');
			if (!show.profile && !show.profileId) throw new Error('Profile not set');
			if (!show.rootPath) throw new Error('Root path not set');

			dbg('Getting profile');
			if (!show.profileId) {
				try {
					const profile = await this.getProfile(show.profile);
					if (profile && profile.id) show.profileId = profile.id;
					else throw new Error('Unable to determine profile');
				} catch (err) { throw new Error('Unable to determine profile'); }
			}

			dbg('Performing lookup');
			const getResult = await this.lookupShow({ tvdbId: show.tvdbId, limit: 1 });
			if (getResult) {
				dbg('Crafting payload');
				const data = {
					'tvdbId': getResult[0].tvdbId,
					'title': getResult[0].title,
					'qualityProfileId': show.profileId,
					'titleSlug': getResult[0].titleSlug,
					'images': getResult[0].images,
					'seasons': getResult[0].seasons,
					'monitored': true,
					'seasonFolder': true,
					'rootFolderPath': show.rootPath || this._settings.rootPath,
					'addOptions': { 'searchForMissingEpisodes': true }
				};

				dbg('Sending Payload');
				const result = await this._post('series', data);

				dbg('Validating add');
				if (result.title == undefined || result.title == null) throw new Error('Failed to add');
				this.cache = false;
				return true;
			}
		}
		catch (err) {
			dbg(err);
			if (err.message == 'NotFound') {
				console.log('searching');
				this.searchShow(show.tvdbId);
				return true;
			}
			throw err;
		}
	}

	async deleteShow(show) {

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
};