const axios = require('axios');
const host = require('ip').address('public');

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
                // Agent ID: 15
                // [ { agent_name: 'slack', agent_label: 'Slack', friendly_name: '', agent_id: 14, active: 0, id: 1 }, 
                // { agent_name: 'discord', agent_label: 'Discord', friendly_name: '', agent_id: 20, active: 1, id: 2 }, 
                // { agent_name: 'scripts', agent_label: 'Script', friendly_name: 'MediaButler API' agent_id: 15, active: 1, id: 5 } ]
                // Create notifier
                console.log('MediaButler API hooks non-existant... got to create');
                this.addScriptNotifier();
            }
        });
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
        try {
            const before = await this.getNotifiers();
            const beforeMap = new Array(before.data.length);
            before.data.map((x) => { beforeMap[x.id] = x; });
            const res = await this._api('add_notifier_config', { agent_id: 15 });
            const after = await this.getNotifiers();
            const afterArr = after.data;
            afterArr.forEach((item) => {
                if (!Boolean(beforeMap[item.id])) {
                    const data = {
                        notifier_id: item.id, agent_id: 15, scripts_script_folder: encodeURIComponent('/home/oxyg3n/tau_scripts'), scripts_script: encodeURIComponent('/home/oxyg3n/tau_scripts/send.py'), scripts_timeout: 5, 
                        friendly_name: encodeURIComponent('MediaButler API'), on_play: 1, on_stop: 1, on_pause: 1, on_resume: 1, on_watched: 1, on_buffer: 1, on_concurrent: 1, on_newdevice: 1, on_created: 0, on_intdown: 0,
                        on_intup: 0, on_extdown: 0, on_extup: 0, on_pmsupdate: 0, on_plexpyupdate: 0, parameter: '', custom_conditions: encodeURIComponent('[{"operator":"","parameter":"","value":""}]'),
                        custom_conditions_logic: '', on_play_subject: encodeURIComponent(`--action play --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`), 
                        on_stop_subject: encodeURIComponent(`--action stop --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_pause_subject: encodeURIComponent(`--action pause --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`), 
                        on_resume_subject: encodeURIComponent(`--action resume --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_watched_subject: encodeURIComponent(`--action watched --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`), 
                        on_buffer_subject: encodeURIComponent(`--action buffer --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`),
                        on_concurrent_subject: '', on_newdevice_subject: encodeURIComponent(`--action newdevice --key {session_key} --rating-key {rating_key} --url http://${process.env.HOST || host}:${process.env.PORT || 9876}/hooks/tautulli`), 
                        on_created_subject: '', on_intdown_subject: '', on_intup_subject: '', on_extdown_subject: '', on_extup_subject: '', on_pmsupdate_subject: '', on_plexpyupdate_subject: '', test_script: '', test_script_args: ''
                    };
                    console.log('lets try posting');
                    const t = axios({ method: 'POST', data, url: `${this._settings.url}/api/v2?apikey=${this._settings.apikey}&cmd=set_notifier_config` }).then((res) => {
                        console.log(res);
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