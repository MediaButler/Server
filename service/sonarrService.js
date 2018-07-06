const SonarrAPI = require('sonarr-api');
const TVShow = require('../model/tvshow');

module.exports = class sonarrService {
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

    async getShow(id) {
        try {
            const result = await this._api.get(`series/${id}`);
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