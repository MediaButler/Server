const TVShow = require('../model/tvshow');
const url = require('url');
const axios = require('axios');

module.exports = class sonarrService {
    constructor(settings) {
        if (!settings) throw new Error('Settings not provided');
        this._settings = settings;
        const sonarrUrl = url.parse(settings.url);
        let port;
        if (sonarrUrl.port == null) {
            if (sonarrUrl.protocol == 'https:') port = 443;
            if (sonarrUrl.protocol == 'http:') port = 80;
        }
        this._cacheTimer = setTimeout((() => { this.purgeCacheTimer(); }), (60 * 60) * 1000);
    }

    async purgeCacheTimer() {
        this.cache = false;
        clearTimeout(this._cacheTimer);
        this._cacheTimer = setTimeout((() => { this.purgeCacheTimer(); }), (120 * 60) * 1000);
    }

    async checkSettings() {
        try {
            const a = await this.getProfile(this._settings.defaultProfile);
            const b = await this.getRootPath(this._settings.defaultRoot);
            if (!a) throw Error('Profile Not Found');
            if (!b) throw Error('Rootpath Not Found')
            return (a && b);
        } catch (err) { throw err; }
    }

    async getNotifiers() {
        return await this._get('notification');
    }

    async addWebhookNotifier(notificationUrl) {
        const data = {
            "onGrab": true, "onDownload": true, "onUpgrade": true, "onRename": true, "supportsOnGrab": true, "supportsOnDownload": true, "supportsOnUpgrade": true, "supportsOnRename": true, "tags": [],
            "name": "MediaButler API", "fields": [{ "order": 0, "name": "Url", "label": "URL", "type": "url", "advanced": false, "value": notificationUrl }, {
                "order": 1, "name": "Method",
                "label": "Method", "helpText": "Which HTTP method to use submit to the Webservice", "value": 1, "type": "select", "advanced": false, "selectOptions": [{ "value": 1, "name": "POST" }, { "value": 2, "name": "PUT" }]
            },
            { "order": 2, "name": "Username", "label": "Username", "type": "textbox", "advanced": false }, { "order": 3, "name": "Password", "label": "Password", "type": "password", "advanced": false }],
            "implementationName": "Webhook", "implementation": "Webhook", "configContract": "WebhookSettings", "infoLink": "https://github.com/Sonarr/Sonarr/wiki/Supported-Notifications#webhook", "presets": []
        };
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

    async getHistory() {
        try {
            const history = await this._get('history');
            return history;
        } catch (err) { throw err; }
    }

    async lookupShow(filter) {
        try {
            let qry;
            if (filter.tvdbId) qry = `tvdb:${filter.tvdbId}`;
            if (filter.name) qry = filter.name;
            if (!qry) throw new Error('No query');
            const result = await this._get('series/lookup', { 'term': `${qry}` });
            if (result.length === 0) throw new Error('No results for query');
            const a = [];
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
                    b.genres.push(g)
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
            return a;
        }
        catch (err) { throw err; }
    }

    async getShows() {
        try {
            let result = [];
            if (!this.cache) result = await this._get('series', {});
            else result = this.cache;
            if (result.length === 0) throw new Error('No results');
            this.cache = result;
            return result;
        }
        catch (err) { throw err; }
    }

    async getQueue() {
        try {
            const result = await this._get('queue', {});
            if (result.length === 0) throw new Error('No results');
            return result;
        }
        catch (err) { throw err; }
    }

    async getShowByTvdbId(id) {
        try {
            const allShows = await this.getShows();
            const showsMap = Array(allShows.length);
            allShows.map((x) => showsMap[x.tvdbId] = x);
            return showsMap[id];
        } catch (err) { throw err; }
    }

    async searchShow(tvdbId) {
        try {
            const show = await this.getShowByTvdbId(tvdbId);
            const result = await this._post('command', { name: 'SeriesSearch', seriesId: parseInt(tvdbId) });
            return result;
        }
        catch (err) { throw err; }
    }

    async getSystemStatus() {
        try {
            const status = await this._get('system/status', {});
            return status;
        } catch (err) { throw err; }
    }

    async getShow(id) {
        try {
            const result = await this._get(`series/${id}`);
            if (result.length === 0) throw new Error('No results');
            return result;
        }
        catch (err) { throw err; }
    }

    async getProfile(name) {
        try {
            const allProfiles = await this._get('profile');
            let profileMap = Array(allProfiles.length);
            allProfiles.map((x) => profileMap[x.name] = x);
            return profileMap[name];
        } catch (err) { throw err; }
    }

    async getRootPath(path) {
        try {
            const allPaths = await this._get('rootfolder');
            let pathMap;
            if (typeof (allPaths) == 'object') {
                return allPaths;
            } else {
                let pathMap = Array(allPaths.length);
                allPaths.map((x) => pathMap[x.path] = x);
                return pathMap[path];
            }
        } catch (err) { throw err; }
    }


    async addShow(show) {
        try {
            console.log(show);
            if (!show.tvdbId) throw new Error('tvdbId not set');
            if (!show.profile && !show.profileId) throw new Error('Profile not set');
            if (!show.rootPath) throw new Error('Root path not set');

            if (!show.profileId) {
                try {
                    const profile = await this.getProfile(show.profile);
                    if (profile && profile.id) show.profileId = profile.id;
                    else throw new Error('Unable to determine profile');
                } catch (err) { throw new Error('Unable to determine profile'); }
            }

            const getResult = await this.lookupShow({ tvdbId: show.tvdbId, limit: 1 });
            if (getResult) {
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
                const result = await this._post('series', data);
                if (result.title == undefined || result.title == null) throw new Error('Failed to add');
                this.cache = false;
                return true;
            }
        }
        catch (err) {
            console.error(err);
            if (err.message == "NotFound") {
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
        try {
            let params = '';
            if (typeof (args) == 'object') {
                for (let key of Object.keys(args)) {
                    params += `${key}=${args[key]}&`;
                }
            }
            const req = await axios({ method: 'GET', url: `${this._settings.url}/api/${command}?${params}`, headers: { 'x-api-key': this._settings.apikey } });
            return req.data;
        } catch (err) { throw err; }
    }

    async _post(command, data) {
        try {
            const req = await axios({ method: 'POST', url: `${this._settings.url}/api/${command}`, data, headers: { 'x-api-key': this._settings.apikey } });
            return req.data;
        } catch (err) { throw err; }
    }
}