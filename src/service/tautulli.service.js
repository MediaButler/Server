const debug = require('debug')('mediabutler:tautulliService');
const axios = require('axios');
const host = require('ip').address('public');
const FormData = require('form-data');
const fs = require('fs');
const jtfd = require('json-to-form-data');
const path = require('path');

module.exports = class tautulliService {
	constructor(settings) {
		debug('Starting');
		this._settings = settings;

		debug('Validating Settings');
		if (!settings.url) throw new Error('URL not set');
		if (!settings.apikey) throw new Error('APIKey not set');
		if (settings.url.slice(-1) == '/') settings.url = settings.url.substring(0, settings.url.length - 1);
		this.checkSettings();

		// this.getNotifiers().then((t) => {
		//     console.log(t);
		//     const notifMap = new Array(t.data.length);
		//     t.data.map((x) => { notifMap[x.friendly_name] = x; });
		//     if (!notifMap['MediaButler API']) {
		//         this.addScriptNotifier();
		//     }
		// });

	}

	async getNotifierConfig(notifierId) {
		const dbg = debug.extend('getNotifierConfig');
		try {
			dbg('Getting config');
			const res = await this._api('get_notifier_config', { notifier_id: notifierId });
			return res.response.data;
		} catch (err) { dbg(err); throw err; }
	}

	async checkSettings() {
		const dbg = debug.extend('checkSettings');
		try {
			dbg('Checking settings');
			const res = await this._api('get_activity', {});
			return Boolean(res.response.result === 'success');
		} catch (err) { dbg(err); throw err; }
	}

	async getNowPlaying() {
		const dbg = debug.extend('getNowPlaying');
		try {
			dbg('Getting activity');
			const res = await this._api('get_activity', {});
			return res.response;
		} catch (err) { dbg(err); throw err; }
	}

	async getHistory(user = null, limit = 3) {
		const dbg = debug.extend('getHistory');
		try {
			dbg('Starting');
			dbg(user);
			const params = {
				user,
				'length': limit
			};
			dbg('Getting History');
			const r = await this._api('get_history', params);
			return r;
		} catch (err) { dbg(err); throw err; }
	}

	async getLibraryStats() {
		const dbg = debug.extend('getLibraryStats');
		try {
			dbg('Getting library stats');
			const r = await this._api('get_libraries', {});
			return r.response;
		} catch (err) { dbg(err); throw err; }
	}

	async getUserStats(user) {
		const dbg = debug.extend('getUserStats');
		try {
			dbg('Getting user id');
			const r = await this._getUserId(user);

			dbg('Crafting query');
			const params = {
				'user_id': r
			};
			
			dbg('Querying stats');
			const res = await this._api('get_user_watch_time_stats', params);
			return res.response;
		} catch (err) { dbg(err); throw err; }
	}

	async _getUserId(username) {
		const dbg = debug.extend('getUserId');
		try {
			dbg('Getting users');
			const res = await this._api('get_users', {});

			dbg('Filtering users');
			const u = res.data.response.data.find(o => o.username === username);
			if (u === undefined) throw new Error('Unable to resolve user');
			
			dbg('Returning user');
			return u.user_id;
		} catch (err) { dbg(err); throw err; }
	}

	async getStreamInfo(sessionKey) {
		const dbg = debug.extend('getStreamInfo');
		try {
			dbg('Getting Stream data');
			const res = await this._api('get_stream_data', { session_key: sessionKey });
			return res.response;
		} catch (err) { dbg(err); throw err; }
	}

	async getMetadata(ratingKey) {
		const dbg = debug.extend('getMetadata');
		try {
			dbg('Getting metadata');
			const res = await this._api('get_metadata', { rating_key: ratingKey });
			return res.response;
		} catch (err) { dbg(err); throw err; }
	}

	async getNotifiers() {
		const dbg = debug.extend('getNotifiers');
		try {
			dbg('Getting Notifiers');
			const res = await this._api('get_notifiers');
			return res.response;
		} catch (err) { dbg(err); throw err; }
	}

	async setNotifierConfig(id, notificationUrl) {
		const dbg = debug.extend('setNotifierConfig');
		try {
			dbg('Loading partial payload');
			const sendObj = await fs.readFileSync(path.join(__dirname, '../', 'config', 'tautulli.txt'), 'utf8');
			
			dbg('Crafting payload');
			const data = {
				notifier_id: id, agent_id: 25, webhook_hook: notificationUrl, webhook_method: 'POST',
				friendly_name: 'MediaButler API', on_play: 1, on_stop: 1, on_pause: 1, on_resume: 1, on_watched: 1, on_buffer: 1, on_concurrent: 1, on_newdevice: 1, on_created: 0, on_intdown: 0,
				on_intup: 0, on_extdown: 0, on_extup: 0, on_pmsupdate: 0, on_plexpyupdate: 0, parameter: '', custom_conditions: '%5B%7B%22operator%22%3A%22%22%2C%22parameter%22%3A%22%22%2C%22value%22%3A%22%22%7D%5D',
				on_play_body: sendObj, on_stop_body: sendObj, on_pause_body: sendObj, on_resume_body: sendObj,
				on_watched_body: sendObj, on_buffer_body: sendObj, on_concurrent_body: sendObj, on_newdevice_body: sendObj,
			};

			dbg('Sending payload');
			const t = await this._post('set_notifier_config', data);
			return t;
		} catch (err) { dbg(err); throw err; }
	}

	async addScriptNotifier(notificationUrl) {
		const dbg = debug.extend('addScriptNotifier');
		try {
			dbg('Getting notifiers');
			const before = await this.getNotifiers();
			
			dbg('Parsing result');
			const beforeMap = new Array(before.data.length);
			before.data.map((x) => { beforeMap[x.id] = x; });

			dbg('Adding notifier');
			const res = await this._api('add_notifier_config', { agent_id: 25 });

			dbg('Getting notifiers');
			const after = await this.getNotifiers();

			dbg('Filtering');
			const afterArr = after.data;
			afterArr.forEach((item) => {
				if (!beforeMap[item.id]) this.setNotifierConfig(item.id, notificationUrl);
			});
			return false;
		} catch (err) { dbg(err); throw err; }
	}

	async _api(command, args) {
		const dbg = debug.extend('_get');
		try {
			dbg('Crafting URL');
			let params = '&';
			if (typeof (args) == 'object') {
				for (let key of Object.keys(args)) {
					params += `${key}=${args[key]}&`;
				}
			}

			dbg('Sending Request');
			const r = await axios({ method: 'GET', url: `${this._settings.url}/api/v2?apikey=${this._settings.apikey}&cmd=${command}${params}` });
			return r.data;
		} catch (err) { dbg(err); throw err; }
	}

	async _post(command, data) {
		const dbg = debug.extend('_post');
		try {
			dbg('Sending Payload');
			const r = await axios({ method: 'POST', url: `${this._settings.url}/api/v2?apikey=${this._settings.apikey}&cmd=${command}`, data: jtfd(data) });
			return r.data;
		} catch (err) { dbg(err); throw err; }
	}
};