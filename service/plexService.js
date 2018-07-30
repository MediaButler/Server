const plexApi = require('plex-api');

module.exports = class plexService {
    constructor(settings) {
        this.hasToken = true;
        if (!settings.url) throw new Error('URL is not set');
        if (!settings.token) throw new Error('Token not provided');
        const regex = /^(http[s]?):\/?\/?([^:\/\s]+):?([0-9]{5})?((\/\w+)*\/)([\w\-\.]+[^#?\s]+)?$/g;
        const details = regex.exec(settings.url);
        let usePort = 80;
        let useHttps = false;
        if (details[1] == 'https') { useHttps = true; usePort = 443; }
        if (details[3]) usePort = details[3];
        const opts = {
            options: { 
                identifier: 'df9e71a5-a6cd-488e-8730-aaa9195f7435', 
                product: 'MediaButler',
                version: 'v1.0', 
                deviceName: 'DeviceName', 
                device: 'API',
                platformVersion: 'v1.0'
            },
            hostname: details[2],
            port: usePort,
            https: useHttps,
            token: settings.token,
        };
        this._api = new plexApi(opts);
    }

    async check() {
        try {
            const res = await this._api.query('/')
            return res;
        } catch (err) { throw err; }
    }

    async getNowPlaying() {
        try {
            const res = await this._api.query('/status/sessions');
            return res;
        } catch (err) { throw err; }
    }

    async killStream(id, reason) {
        try {
            return await this._api.perform(`/status/sessions/terminate?sessionId=${id}&reason=${urlencode(reason)}`);
        } catch (err) { throw err; }
    }

    async getHistory() {
        try {
            const res = await this._api.query('/status/sessions/history/all');
        } catch (err) { throw err; }
    }

    audioPlaylists() {
        // Return all playlists
    }

    audioPlaylist() {
        // Get single playlist from playlists
    }
}