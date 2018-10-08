const axios = require('axios');
const url = require('url');

module.exports = class lidarrService {
    constructor(settings) {
        this._settings = settings;
        if (!settings.url) throw new Error('URL not set');
        if (!settings.apikey) throw new Error('APIKey not set');
        if (settings.url.slice(-1) == '/') settings.url = settings.url.substring(0, settings.url.length - 1);
        if (!settings.defaultProfile) throw new Error('Default profile not set');
        if (!settings.defaultRoot) throw new Error('Defult rootpath not set');
        this.checkSettings();
    }

    async checkSettings() {
        try {
            const a = await this.getProfile(this._settings.defaultProfile);
            const b = await this.getRootPath(this._settings.defaultRoot);
            if (!a) throw Error('Profile Not Found');
            if (!b) throw Error('Rootpath Not Found');
            return (a && b);
        } catch (err) { throw err; }
    }

    async getNotifiers() {
        return await this._get('notification');
    }

    async addWebhookNotifier(notificationUrl) {
        const data = {
            "onGrab": true, "onDownload": true, "onAlbumDownload": false, "onUpgrade": true, "onRename": true, "supportsOnGrab": true, "supportsOnDownload": true, "supportsOnAlbumDownload": false,
            "supportsOnUpgrade": true, "supportsOnRename": true, "name": "MediaButler API", "fields": [{
                "order": 0, "name": "url", "label": "URL", "type": "url", "advanced": false,
                "value": notificationUrl
            }, {
                "order": 1, "name": "method", "label": "Method", "helpText": "Which HTTP method to use submit to the Webservice", "value": 1, "type": "select", "advanced": false,
                "selectOptions": [{ "value": 1, "name": "POST" }, { "value": 2, "name": "PUT" }]
            }, { "order": 2, "name": "username", "label": "Username", "type": "textbox", "advanced": false },
            { "order": 3, "name": "password", "label": "Password", "type": "password", "advanced": false }], "implementationName": "Webhook", "implementation": "Webhook", "configContract": "WebhookSettings",
            "infoLink": "https://github.com/Lidarr/Lidarr/wiki/Supported-Notifications#webhook", "tags": [], "presets": []
        }
        const r = await this._post('notification', data);
        return r;
    }

    async getCalendar() {
        try {
            const today = new Date();
            const beginningMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endMonth = new Date(today.getFullYear(), today.getMonth(), 31);
            const result = await this._get('calendar', { 'start': beginningMonth.toISOString(), 'end': endMonth.toISOString() });
            return result;
        }
        catch (err) { throw err; }
    }

    async getQueue() {
        try {
            const result = await this._get('queue');
            if (result.length === 0) throw new Error('No results');
            return result;
        }
        catch (err) { throw err; }
    }

    async getHistory() {
        try {
            const history = await this._get('history', { page: 1, pageSize: 15, sortKey: 'date', sortDir: 'desc' });
            return history;
        } catch (err) { throw err; }
    }

    async getSystemStatus() {
        try {
            const status = await this._get('system/status');
            return status;
        } catch (err) { throw err; }
    }

    async getProfile(name) {
        try {
            const allProfiles = await this._get('qualityprofile');
            let profileMap = Array(allProfiles.length);
            allProfiles.map((x) => profileMap[x.name.toString()] = x);
            return profileMap[name];
        }
        catch (err) { throw err; }
    }

    async getRootPath(path) {
        try {
            const allPaths = await this._get('rootfolder');
            let pathMap;
            if (typeof (allPaths) == 'object') {
                return allPaths;
            } else {
                let pathMap = Array();
                allPaths.map((x) => pathMap[x.path] = x);
                return pathMap[path];
            }
        } catch (err) { throw err; }
    }

    async lookupArtist(filter = {}) {
        try {
            let qry;
            if (filter.musicBrainzId) qry = `lidarr:${filter.musicBrainzId}`;
            else if (filter.name) qry = filter.name;
            if (!qry) throw new Error('No query');
            const result = await this._get('artist/lookup', { 'term': `${qry}` })
            if (result.length === 0) throw new Error('No results for query');
            return result;
        }
        catch (err) { throw err; }
    }

    async addArtist(artist) {
        try {
            if (!artist.musicBrainzId) throw new Error('musicBrainzId not set');
            if (!artist.profile && !artist.profileId) throw new Error('Profile not set');
            if (!artist.rootPath) throw new Error('Root path not set');

            if (!artist.profileId) {
                const profile = await this.getProfile(artist.profile);
                if (profile.id) artist.profileId = profile.id;
                else throw new Error('Unable to determine profile');
            }

            const getResult = await this.lookupArtist({ musicBrainzId: artist.musicBrainzId, limit: 1 });
            const data = getResult[0];
            data['qualityProfileId'] = artist.profileId,
            data['discogsId'] = 0;
            data['languageProfileId'] = 1;
            data['metadataProfileId'] = 1;
            data['monitored'] = true;
            data['rootFolderPath'] = artist.rootPath || this._settings.rootPath;
            data['addOptions'] = { searchForMissingAlbums: false };
            const result = await this._post('artist', data);
            if (result.artistName == undefined || result.artistName == null) throw new Error('Failed to add');
            this.cache = false;
            return true;
        } catch (err) { throw err; }
    }

    async getArtists() {
        try {
            const status = await this._get('artist');
            return status;
        } catch (err) { throw err; }
    }

    async getArtistByMusicBrainzId(musicBrainzId) {
        try {
            const allArtists = await this.getArtists();
            let artistMap = Array();
            allArtists.map((x) => artistMap[x.foreignArtistId] = x);
            return artistMap[musicBrainzId];
        } catch (err) { throw err; }
    }

    async lookupAlbum(filter = {}) {
        try {
            let qry;
            if (filter.musicBrainzId) qry = `lidarr:${filter.musicBrainzId}`;
            else if (filter.name) qry = filter.name;
            if (!qry) throw new Error('No query');
            const result = await this._get('album/lookup', { 'term': `${qry}` })
            if (result.length === 0) throw new Error('No results for query');
            return result;
        } catch (err) { throw err; }
    }

    async addAlbum(album) {

    }

    async getAlbums() {
        try {
            const status = await this._get('album');
            return status;
        } catch (err) { throw err; }
    }

    async _get(command, args = {}) {
        try {
            let params = '';
            if (typeof (args) == 'object') {
                for (let key of Object.keys(args)) {
                    params += `${key}=${args[key]}&`;
                }
            }
            const req = await axios({ method: 'GET', url: `${this._settings.url}/api/v1/${command}?${params}`, headers: { 'x-api-key': this._settings.apikey } });
            return req.data;
        } catch (err) { throw err; }
    }

    async _post(command, data) {
        try {
            const req = await axios({ method: 'POST', url: `${this._settings.url}/api/v1/${command}`, data, headers: { 'x-api-key': this._settings.apikey } });
            return req.data;
        } catch (err) { throw err; }
    }
}