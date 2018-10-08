const SonarrAPI = require('sonarr-api');
const host = require('ip').address('public');
const url = require('url');

module.exports = class radarrService {
    constructor(settings) {
        if (!settings) throw new Error('Settings not provided');
        this._settings = settings;
        const services = require('./services');
        const radarrUrl = url.parse(settings.url);
        let port;
        if (radarrUrl.port == null) {
            if (radarrUrl.protocol == 'https:') port = 443;
            if (radarrUrl.protocol == 'http:') port = 80;
        }
        this._api = new SonarrAPI({ hostname: radarrUrl.hostname, apiKey: settings.apikey, port: port || radarrUrl.port, urlBase: radarrUrl.path, ssl: Boolean((radarrUrl.protocol == 'https:')) });
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
        return await this._api.get('notification');
    }

    async addWebhookNotifier(notificationUrl) {
        const data = {"onGrab":true,"onDownload":true,"onUpgrade":true,"onRename":true,"supportsOnGrab":true,"supportsOnDownload":true,"supportsOnUpgrade":true,"supportsOnRename":true,
        "tags":[],"name":"MediaButler API","fields":[{"order":0,"name":"Url","label":"URL","type":"url","advanced":false,"value": notificationUrl},
        {"order":1,"name":"Method","label":"Method","helpText":"Which HTTP method to use submit to the Webservice","value":2,"type":"select","advanced":false,"selectOptions":[{"value":2,"name":"POST"},
        {"value":1,"name":"PUT"}]},{"order":2,"name":"Username","label":"Username","type":"textbox","advanced":false},{"order":3,"name":"Password","label":"Password","type":"password","advanced":false}],
        "implementationName":"Webhook","implementation":"Webhook","configContract":"WebhookSettings","infoLink":"https://github.com/Radarr/Radarr/wiki/Supported-Notifications#webhook","presets":[]};
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

    async getQueue() {
        try {
            const result = await this._api.get('queue', {});
            if (result.length === 0) throw new Error('No results');
            return result;
        }
        catch (err) { throw err; }
    }

    async getHistory() {
        try {
            const history = await this._api.get('history', { page: 1, pageSize: 15, sortKey: 'date', sortDir: 'desc' });
            return history;
        } catch (err) { throw err; }
    }

    async getSystemStatus() {
        try {
            const status = await this._api.get('system/status', {});
            return status;
        } catch (err) { throw err; }
    }

    async getProfile(name) {
        try {
            const allProfiles = await this._api.get('profile');
            let profileMap = Array(allProfiles.length);
            allProfiles.map((x) => profileMap[x.name.toString()] = x);
            return profileMap[name];
        }
        catch (err) { throw err; }
    }

    async getRootPath(path) {
        try {
            const allPaths = await this._api.get('rootfolder');
            let pathMap;
            if (typeof(allPaths) == 'object') {
                return allPaths;
            } else {
                let pathMap = Array();
                allPaths.map((x) => pathMap[x.path] = x);
                return pathMap[path];
            }
        } catch (err) { throw err; }
    }

    async lookupMovie(filter) {
        try {
            let qry;
            if (filter.imdbId) qry = `imdb:${filter.imdbId}`;
            else if (filter.name) qry = filter.name;
            if (!qry) throw new Error('No query');
            const result = await this._api.get('movie/lookup', { 'term': `${qry}` })
            if (result.length === 0) throw new Error('No results for query');
            return result;
        }
        catch (err) { throw err; }
    }

    async getMovies() {
        try {
            let result = [];
            if (!this.cache) result = await this._api.get('movie', {})
            else result = this.cache;
            if (result.length === 0) throw new Error('No results');
            this.cache = result;
            return result;
        }
        catch (err) { throw err; }
    }

    async getMovieByimdbId(id) {
        try {
            const allMovies = await this.getMovies();
            const movieMap = Array(allMovies.length);
            allMovies.map((x) => movieMap[x.imdbId] = x);
            return movieMap[id];
        }
        catch (err) { throw err; }
    }

    async searchMovie(imdbId) {
        try {
            const movie = await this.getMovieByimdbId(imdbId);
            const result = await this._api.post('command', { name: 'MoviesSearch', movieIds: [parseInt(imdbId)] });
            return result;
        }
        catch (err) { throw err; }
    }

    async addMovie(movie) {
        try {
            console.log(movie);
            if (!movie.imdbId) throw new Error('imdbId not set');
            if (!movie.profile && !movie.profileId) throw new Error('Profile not set');
            if (!movie.rootPath) throw new Error('Root path not set');

            if (!movie.profileId) {
                const profile = await this.getProfile(movie.profile);
                if (profile.id) movie.profileId = profile.id;
                else throw new Error('Unable to determine profile');
            }

            const getResult = await this.lookupMovie({ imdbId: movie.imdbId, limit: 1 });
            const data = {
                'tmdbId': getResult.tmdbId,
                'title': getResult.title,
                'qualityProfileId': movie.profileId,
                'titleSlug': getResult.titleSlug,
                'images': getResult.images,
                'monitored': true,
                'rootFolderPath': movie.rootPath || this._settings.rootPath,
                'year': getResult.year,
                'addOptions': { searchForMovie: true }
            };
            const result = await this._api.post('movie', data)
            if (result.title == undefined || result.title == null) throw new Error('Failed to add');
            this.cache = false;
            return true;
        }
        catch (err) { 
            if (err.message == "NotFound") {
                this.searchMovie(movie.imdbId);
                return true;
            }
            throw err; 
         }
    }
}