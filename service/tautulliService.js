const axios = require('axios');
const host = require('ip').address('public');
const FormData = require('form-data');
const fs = require('fs');
const jtfd = require('json-to-form-data');

module.exports = class tautulliService {
    constructor(settings) {
        this._settings = settings;
        if (!settings.url) throw new Error('URL not set');
        if (!settings.apikey) throw new Error('APIKey not set');
        if (settings.url.slice(-1) == '/') settings.url = settings.url.substring(0, settings.url.length - 1);

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
        try {
            const res = await this._api('get_notifier_config', { notifier_id: notifierId });
            return res.data.response.data;
        } catch (err) { throw err; }
    }

    async checkSettings() {
        try {
            const res = await this._api('get_activity', {});
            return Boolean(res.data.response.result === 'success');
        } catch (err) { throw err; }
    }

    async getNowPlaying() {
        try {
            const res = await this._api('get_activity', {});
            return res.data.response;
        }
        catch (err) { throw err; }
    }

    async getHistory(user = null, limit = null) {
        try {
            if (limit == null) limit = 3;
            const params = {
                'user': user,
                'length': limit
            };
            const r = await this._api('get_history', params);
            return r.data.response;
        }
        catch (err) { throw err; }
    }

    async getUserStats(user) {
        try {
            const r = await this._getUserId(user);
            const params = {
                'user_id': r
            };
            const res = await this._api('get_user_watch_time_stats', params);
            return res.data.response;
        }
        catch (err) { throw err; }
    }

    async _getUserId(username) {
        try {
            const res = await this._api('get_users', {})
            const u = res.data.response.data.find(o => o.username === username);
            if (u === undefined) throw new Error('Unable to resolve user');
            return u.user_id;
        }
        catch (err) { throw err; }
    }

    async getStreamInfo(sessionKey) {
        try {
            const res = await this._api('get_stream_data', { session_key: sessionKey });
            return res.data.response;
        }
        catch (err) { throw err; }
    }

    async getMetadata(ratingKey) {
        try {
            const res = await this._api('get_metadata', { rating_key: ratingKey });
            return res.data.response;
        }
        catch (err) { throw err; }
    }

    async getNotifiers() {
        try {
            const res = await this._api('get_notifiers');
            return res.data.response;
        } catch (err) { throw err; }
    }

    async setNotifierConfig(id, notificationUrl) {
        try {
            const data = {
                notifier_id: id, agent_id: 25, webhook_hook: notificationUrl, webhook_method: "POST",
                friendly_name: "MediaButler API", on_play: 1, on_stop: 1, on_pause: 1, on_resume: 1, on_watched: 1, on_buffer: 1, on_concurrent: 1, on_newdevice: 1, on_created: 0, on_intdown: 0,
                on_intup: 0, on_extdown: 0, on_extup: 0, on_pmsupdate: 0, on_plexpyupdate: 0, parameter: '', custom_conditions: "%5B%7B%22operator%22%3A%22%22%2C%22parameter%22%3A%22%22%2C%22value%22%3A%22%22%7D%5D",
                on_play_body: sendObj, on_stop_body: sendObj, on_pause_body: sendObj, on_resume_body: sendObj,
                on_watched_body: sendObj, on_buffer_body: sendObj, on_concurrent_body: sendObj, on_newdevice_body: sendObj,
            };
            const t = await this._post('set_notifier_config', data);
            return t;
        } catch (err) { throw err; }
    }

    async addScriptNotifier(notificationUrl) {
        try {
            const sendObj = await fs.readFileSync(`${process.cwd()}/tautulli.txt`, 'utf8');
            const before = await this.getNotifiers();
            const beforeMap = new Array(before.data.length);
            before.data.map((x) => { beforeMap[x.id] = x; });
            const res = await this._api('add_notifier_config', { agent_id: 25 });
            const after = await this.getNotifiers();
            const afterArr = after.data;
            afterArr.forEach((item) => {
                if (!Boolean(beforeMap[item.id])) this.setNotifierConfig(item.id, notificationUrl);
            });
            return false;
        } catch (err) { throw err; }
    }

    async _api(command, args) {
        try {
            let params = '&';
            if (typeof (args) == 'object') {
                for (let key of Object.keys(args)) {
                    params += `${key}=${args[key]}&`;
                }
            }
            return await axios({ method: 'GET', url: `${this._settings.url}/api/v2?apikey=${this._settings.apikey}&cmd=${command}${params}` });
        }
        catch (err) { throw err; }
    }

    async _post(command, data) {
        try {
            return await axios({ method: 'POST', url: `${this._settings.url}/api/v2?apikey=${this._settings.apikey}&cmd=${command}`, data: jtfd(data) });
        }
        catch (err) { throw err; }
    }

}