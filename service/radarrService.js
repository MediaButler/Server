const SonarrAPI = require('sonarr-api');

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

            const getResult = await this.getMovie({ imdbId: show.imdbId, limit: 1 });
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
            const result = await this._api.post('movie', data)
            if (result.title == undefined || result.title == null) throw new Error('Failed to add');
            return true;
        }
        catch (err) { throw err; }
    }
}