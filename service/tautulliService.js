const axios = require('axios');

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
                addScriptNotifier();

            }
            console.log(tt);
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
            console.log(before);
            const res = await this._api(add_notifier_config, { agent_id: 15 });
            const after = await this.getNotifiers();

            after.forEach((item) => {
                if (before.indexOf(item) == -1) return item;
            });
            return;
        }
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