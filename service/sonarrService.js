const SonarrAPI = require('sonarr-api');

module.exports = class sonarrService {
    constructor(settings) {
        if (!settings) throw new Error('Settings not provided');
        this._settings = settings;
        const regex = /(?:([A-Za-z]+):)?(?:\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?/g;
        const details = regex.exec(settings.url);
        let useSsl = false;
        let port = 80;
        console.log(details);
        if (details[1] == 'https') { useSsl = true; port = 443; }
        if (details[3] !== undefined) port = details[3];
        this._api = new SonarrAPI({ hostname: details[2], apiKey: settings.apikey, port: port, urlBase: `${details[4]}`, ssl: useSsl });
        console.log('hello sonarr');
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

    async lookupShow(filter) {
        try {
            console.log(this._api);
            let qry;
            if (filter.tvdbId) qry = `tvdb:${filter.tvdbId}`;
            if (filter.name) qry = filter.name;
            if (!qry) throw new Error('No query');
            const result = await this._api.get('series/lookup', { 'term': `${qry}` });
            if (result.length === 0) throw new Error('No results for query');
            return result;
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

    async getShow(id) {
        try {
            const result = await this._api.get('series', { id });
            if (result.length === 0) throw new Error('No results');
            return result;
        }
        catch (err) { throw err; }
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
                if (result.title == undefined || result.title == null) throw new Error('Failed to add');
                return true;
            }
        }
        catch (err) { throw err; }
    }
}