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
                //this.addScriptNotifier();
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
                        "agent_name": "scripts",
                        "actions": {
                            "on_intup": 0, "on_pause": 1, "on_pmsupdate": 0, "on_newdevice": 1, "on_concurrent": 1, "on_plexpyupdate": 0, "on_play": 1, "on_extdown": 0, "on_resume": 1, "on_intdown": 0, "on_created": 0, "on_stop": 1, "on_watched": 1, "on_extup": 0, "on_buffer": 1
                        },
                        "id": 5,
                        "notify_text": {
                            "on_intup": { "body": "", "subject": "" },
                            "on_pause": { "body": "", "subject": "--action pause --key {session_key} --rating-key {rating_key}" },
                            "on_pmsupdate": { "body": "", "subject": "" },
                            "on_newdevice": { "body": "", "subject": "--action newdevice --key {session_key} --rating-key {rating_key}" },
                            "on_concurrent": { "body": "", "subject": "" },
                            "on_plexpyupdate": { "body": "", "subject": "" },
                            "on_play": { "body": "", "subject": "--action play --key {session_key} --rating-key {rating_key}" },
                            "on_extdown": { "body": "", "subject": "" },
                            "on_resume": { "body": "", "subject": "--action resume --key {session_key} --rating-key {rating_key}" },
                            "on_intdown": { "body": "", "subject": "" },
                            "on_created": { "body": "", "subject": "" },
                            "on_stop": { "body": "", "subject": "--action stop --key {session_key} --rating-key {rating_key}" },
                            "on_watched": { "body": "", "subject": "--action watched --key {session_key} --rating-key {rating_key}" },
                            "on_extup": { "body": "", "subject": "" },
                            "on_buffer": { "body": "", "subject": "--action buffer --key {session_key} --rating-key {rating_key}" }
                        },
                        "custom_conditions": [{ "operator": "", "parameter": "", "value": "" }],
                        "custom_conditions_logic": "",
                        "config": { "script_folder": "/home/oxyg3n/tau_scripts", "timeout": 5, "script": "/home/oxyg3n/tau_scripts/send.py" },
                        "config_options": [
                            { "input_type": "help", "description": "<span class=\"inline-pre\">.sh, .pl, .cmd, .py, .pyw, .php, .rb, .bat, .ps1, .exe</span>", "label": "Supported File Types" },
                            { "description": "Enter the full path to your script folder.", "input_type": "text", "refresh": true, "label": "Script Folder", "value": "/home/oxyg3n/tau_scripts", "name": "scripts_script_folder" },
                            { "description": "Select the script file to run.", "input_type": "select", "value": "/home/oxyg3n/tau_scripts/send.py", "label": "Script File", "select_options": { "": "", "/home/oxyg3n/tau_scripts/send.py": "./send.py" }, "name": "scripts_script" },
                            { "input_type": "number", "description": "The number of seconds to wait before killing the script. 0 to disable timeout.", "name": "scripts_timeout", "value": 5, "label": "Script Timeout" }
                        ], "agent_id": 15, "agent_label": "Script", "friendly_name": "MediaButler API"
                    };

                    console.log('lets try posting');
                    const t = axios({ method: 'POST', data, url: `${this._settings.url}/api/v2?apikey=${this._settings.apikey}&cmd=set_notifier_config&notifier_id=${item.id}&agent_id=15` }).then((res) => {
                        console.log(res);
                    }).catch((err) => { console.error(err); throw err; });
                    console.log(t);
                    // this._api('set_notifier_config', data).then((res) => {
                    //     console.log(res);
                    // });
                }
                //if (beforeArr.indexOf(item) == -1) console.log(item);
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