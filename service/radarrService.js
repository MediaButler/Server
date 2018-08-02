const SonarrAPI = require('sonarr-api');
const host = require('ip').address('public');

module.exports = class radarrService {
    constructor(settings) {
        if (!settings) throw new Error('Settings not provided');
        this._settings = settings;
        const regex = /(?:([A-Za-z]+):)?(?:\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?/g;
        const details = regex.exec(settings.url);
        let useSsl = false;
        let port = 80;
        if (details[1] == 'https') { useSsl = true; port = 443; }
        if (details[3] !== undefined) port = details[3];
        this._api = new SonarrAPI({ hostname: details[2], apiKey: settings.apikey, port: port, urlBase: `${details[4]}`, ssl: useSsl });
        const t = this.getNotifiers().then((notifiers) => {
            const notifMap = new Array(notifiers.length);
            notifiers.map((x) => { notifMap[x.name] = x; });
            if (!notifMap['MediaButler API']) {
                console.log('[Radarr] Hook missing.... Adding');
                this.addWebhookNotifier();
            } else {
                const n = notifMap['MediaButler API'];
                if (n.fields[0].value != `http://${host}:${process.env.PORT || 9876}/hooks/sonarr`) {
                    console.log('[Radarr] Current Webhook is incorrect. Deleting');
                    this._api.delete(`notification/${n.id}`).then(() => {
                        console.log('[Radarr] Adding new Webhook');
                        this.addWebhookNotifier();
                    })
                }
            }
        });
    }

    async getNotifiers() {
        return await this._api.get('notification');
    }

    async addWebhookNotifier() {
        const data = {"onGrab":true,"onDownload":true,"onUpgrade":true,"onRename":true,"supportsOnGrab":true,"supportsOnDownload":true,"supportsOnUpgrade":true,"supportsOnRename":true,
        "tags":[],"name":"MediaButler API","fields":[{"order":0,"name":"Url","label":"URL","type":"url","advanced":false,"value":`http://${host}:${process.env.PORT || 9876}/hooks/radarr`},
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

    async getProfile(name) {
        try {
            const allProfiles = await this._api.get('profile');
            let profileMap = Array(allProfiles.length);
            allProfiles.map((x) => profileMap[x.name.toString()] = x);
            return profileMap[name];
        }
        catch (err) { throw err; }
    }

    async lookupMovie(filter) {
        try {
            let qry;
            if (filter.imdbId) qry = `imdb:${filter.imdbId}`;
            if (filter.name) qry = filter.name;
            if (!qry) throw new Error('No query');
            const result = await this._api.get('movie/lookup', { 'term': `${qry}` })
            if (result.length === 0) throw new Error('No results for query');
            return result[0];
        }
        catch (err) { throw err; }
    }

    async getMovies() {
        try {
            const result = await this._api.get('movie', {})
            if (result.length === 0) throw new Error('No results for query');
            return result;
        }
        catch (err) { throw err; }
    }

    async getMovieByimdbId(id) {
        try {
            const allMovies = await this.Movies();
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
                'year': getResult.year
            };
            console.log(data);
            const result = await this._api.post('movie', data)
            if (result.title == undefined || result.title == null) throw new Error('Failed to add');
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