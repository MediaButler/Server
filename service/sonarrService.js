const SonarrAPI = require('sonarr-api');
const TVShow = require('../model/tvshow');
const url = require('url');

module.exports = class sonarrService {
    constructor(settings) {
        const services = require('./services');
        const settingsService = services.settingsService;

        if (!settings) throw new Error('Settings not provided');
        this._settings = settings;
        const sonarrUrl = url.parse(settings.url);
        let port;
        if (sonarrUrl.port == null) {
            if (sonarrUrl.protocol == 'https:') port = 443;
            if (sonarrUrl.protocol == 'http:') port = 80;
        }
        this._api = new SonarrAPI({ hostname: sonarrUrl.hostname, apiKey: settings.apikey, port: sonarrUrl.port || port, urlBase: sonarrUrl.path, ssl: Boolean((sonarrUrl.protocol == 'https:')) });
    }

    async checkSettings() {
        try {
            const a = await this.getProfile(this._settings.defaultProfile);
            const b = await this.getRootPath(this._settings.defaultRoot);
            return (a && b);
        } catch (err) { throw err; }
    }

    async getNotifiers() {
        return await this._api.get('notification');
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
        const r = await this._api.post('notification', data);
        return r;
    }

    async getCalendar() {
        try {
            const today = new Date();
            const beginningMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endMonth = new Date(today.getFullYear(), today.getMonth(), 31);
            const result = await this._api.get('calendar', { 'start': beginningMonth.toISOString(), 'end': endMonth.toISOString() });
            return result;
        }
        catch (err) { throw err; }
    }

    async getHistory() {
        try {
            const history = await this._api.get('/history');
            return history;
        } catch (err) { throw err; }
    }

    async lookupShow(filter) {
        try {
            let qry;
            if (filter.tvdbId) qry = `tvdb:${filter.tvdbId}`;
            if (filter.name) qry = filter.name;
            if (!qry) throw new Error('No query');
            const result = await this._api.get('series/lookup', { 'term': `${qry}` });
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
            const result = await this._api.get('series', {});
            if (result.length === 0) throw new Error('No results');
            return result;
        }
        catch (err) { throw err; }
    }

    async getQueue() {
        try {
            const result = await this._api.get('queue', {});
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
            const result = await this._api.post('command', { name: 'SeriesSearch', seriesId: parseInt(tvdbId) });
            return result;
        }
        catch (err) { throw err; }
    }

    async getShow(id) {
        try {
            const result = await this._api.get(`series/${id}`);
            if (result.length === 0) throw new Error('No results');
            return result;
        }
        catch (err) { throw err; }
    }

    async getProfile(name) {
        try {
            const allProfiles = await this._api.get('profile');
            let profileMap = Array(allProfiles.length);
            allProfiles.map((x) => profileMap[x.name] = x);
            return profileMap[name];
        } catch (err) { throw err; }
    }

    async getRootPath(path) {
        try {
            const allPaths = await this._api.get('rootfolder');
            let pathMap;
            if (typeof(allPaths) == 'object') {
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
            if (!show.tvdbId) throw new Error('tvdbId not set');
            if (!show.profile && !show.profileId) throw new Error('Profile not set');
            if (!show.rootPath) throw new Error('Root path not set');

            if (!show.profileId) {
                const profile = await this.getProfile(show.profile);
                if (profile.id) show.profileId = profile.id;
                else throw new Error('Unable to determine profile');
            }

            const getResult = await this.getShow({ tvdbId: show.tvdbId, limit: 1 });
            if (getResult) {
                const data = {
                    'tvdbId': getResult.tvdbId,
                    'title': getResult.title,
                    'qualityProfileId': show.profileId,
                    'titleSlug': getResult.titleSlug,
                    'images': getResult.images,
                    'seasons': getResult.seasons,
                    'monitored': true,
                    'seasonFolder': true,
                    'rootFolderPath': show.rootPath || this._settings.rootPath
                };
                const result = await this._api.post('series', data);
                console.log(result);
                if (result.title == undefined || result.title == null) throw new Error('Failed to add');
                return true;
            }
        }
        catch (err) {
            if (err.message == "NotFound") {
                this.searchShow(show.tvdbId);
                return true;
            }
            throw err;
        }
    }

    async deleteShow(show) {

    }
}