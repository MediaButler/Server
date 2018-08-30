const plexApi = require('plex-api');
const url = require('url');
const WebSocket = require('ws');

module.exports = class plexService {
    constructor(settings, startup = false) {
        if (!settings.url) throw new Error('URL is not set');
        //if (!settings.token) throw new Error('Token not provided');
        const plexUrl = url.parse(settings.url);
        let port;
        if (plexUrl.port == null) {
            if (plexUrl.protocol == 'https:') port = 443;
            if (plexUrl.protocol == 'http:') port = 80;
        }
        const opts = {
            options: {
                identifier: 'df9e71a5-a6cd-488e-8730-aaa9195f7435',
                product: 'MediaButler',
                version: 'v1.0',
                deviceName: 'DeviceName',
                device: 'API',
                platformVersion: 'v1.0'
            },
            hostname: plexUrl.hostname,
            port: parseInt(plexUrl.port) || parseInt(port),
            https: Boolean((plexUrl.protocol == 'https:')),
            token: settings.token,
        };
        this._api = new plexApi(opts);
        if (startup) {
            this._websocket = new WebSocket(`ws://${plexUrl.host}/:/websockets/notifications?X-Plex-Token=${settings.token}`);
            this._websocket.on('message', (data) => { this.webSocketNotification(this, data); });
        }
    }

    async webSocketNotification(service, data) {
        data = JSON.parse(data);
        if (data.NotificationContainer.type == 'playing') {
            const sessionKey = data.NotificationContainer.PlaySessionStateNotification[0].sessionKey;
            const ratingKey = data.NotificationContainer.PlaySessionStateNotification[0].ratingKey;
            const state = data.NotificationContainer.PlaySessionStateNotification[0].state;
            const np = await service.getNowPlaying();
            const nowPlaying = new Array();
            if (np.MediaContainer.Metadata) np.MediaContainer.Metadata.map((x) => { nowPlaying[x.sessionKey] = x; });
            //console.log(nowPlaying[sessionKey]);
        }
    }

    async getIdentity() {
        try {
            const res = await this._api.query('/identity')
            return res;
        } catch (err) { return false; }
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
            return res;
        } catch (err) { throw err; }
    }

    async getMetadata(ratingKey) {
        try {
            const res = await this._api.query(`/library/metadata/${ratingKey}/children`);
            return res;
        } catch (err) { throw err; }
    }

    async getDirectory(parentRatingKey) {
        try {
            const res = await this._api.query(`/library/metadata/${parentRatingKey}/allLeaves?`);
            return res;
        } catch (err) { throw err; }
    }

    async searchLibraries(query) {
        try {
            const res = await this._api.query(`/search?query=${encodeURIComponent(query)}`);
            return res;
        } catch (err) { throw err; }
    }

    audioPlaylists() {
        // Return all playlists
    }

    audioPlaylist() {
        // Get single playlist from playlists
    }
}