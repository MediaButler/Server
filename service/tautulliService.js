const axios = require('axios');
const host = require('ip').address('public');
const FormData = require('form-data');
const path = require('path');
module.exports = class tautulliService {
    constructor(settings) {
        this._settings = settings;
        if (!settings.url) throw new Error('URL not set');
        if (!settings.apikey) throw new Error('APIKey not set');
        if (settings.url.slice(-1) == '/') settings.url = settings.url.substring(0, settings.url.length - 1);

        const t = this.getNotifiers().then((tt) => {
            const notifiers = tt.data;
            const notifMap = new Array(notifiers.length);
            notifiers.map((x) => { notifMap[x.friendly_name] = x; });
            if (!notifMap['MediaButler API']) {
                console.log('[Tautulli] Hook missing.... Adding');
                this.addScriptNotifier();
            } else { console.log('[Tautulli] Hook already setup, skipping'); }
        }).catch((err) => { console.log('[Tautulli] Unable to query for notifiers'); });
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

    async addScriptNotifier() {
        const getFormData = (object) => {
            const formData = new FormData();
            Object.keys(object).forEach(key => formData.append(key, encodeURIComponent(object[key])));
            return formData;
        }
        
        try {
            const before = await this.getNotifiers();
            const beforeMap = new Array(before.data.length);
            before.data.map((x) => { beforeMap[x.id] = x; });
            const res = await this._api('add_notifier_config', { agent_id: 15 });
            console.log('[Tautulli] Adding new Webhook');
            const after = await this.getNotifiers();
            const afterArr = after.data;
            afterArr.forEach((item) => {
                if (!Boolean(beforeMap[item.id])) {
                    const data = {
                        notifier_id: item.id, agent_id: 15, scripts_script_folder: encodeURI(path.join(__dirname, '../')), scripts_script: encodeURI(path.join(__dirname, '../', 'mediabutler.py')), scripts_timeout: 5,
                        friendly_name: encodeURI("MediaButler API"), on_play: 1, on_stop: 1, on_pause: 1, on_resume: 1, on_watched: 1, on_buffer: 1, on_concurrent: 1, on_newdevice: 1, on_created: 0, on_intdown: 0,
                        on_intup: 0, on_extdown: 0, on_extup: 0, on_pmsupdate: 0, on_plexpyupdate: 0, parameter: '', custom_conditions: "%5B%7B%22operator%22%3A%22%22%2C%22parameter%22%3A%22%22%2C%22value%22%3A%22%22%7D%5D",
                        on_play_subject: encodeURI(`--action play --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_stop_subject: encodeURI(`--action stop --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_pause_subject: encodeURI(`--action pause --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_resume_subject: encodeURI(`--action resume --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_watched_subject: encodeURI(`--action watched --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_buffer_subject: encodeURI(`--action buffer --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_concurrent_subject: '', on_newdevice_subject: encodeURI(`--action newdevice --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                    };
                    const t = this._api('set_notifier_config', data).then((res) => {
                        console.log('[Tautulli] Setting Webhook');
                    }).catch((err) => { console.error(err); throw err; });
                }
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
}