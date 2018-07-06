
const Request = require('../model/request');
const sonarrService = require('./sonarrService');
const radarrService = require('./radarrService');
const settings = require('../settings.json');

module.exports = class requestService {
    constructor() {
        this.radarrService = new radarrService(settings.radarr);
        this.sonarrService = new sonarrService(settings.sonarr);
    }

    async getRequests() {
        try {
            const r = await Request.find({});
            if (!r) throw new Error('No Results');
            return r;
        } catch (err) { throw err; }
    }

    async getRequest(id) {
        try {
            const r = await Request.findById(id);
            if (!r) throw new Error('No Results');
            return r;
        } catch (err) { throw err; }
    }

    async addRequest(request) {

    }

    async approveRequest(id, oProfile = null, oRoot = null) {
        try {
            const r = await this.getRequest(id);
            if (!r) throw new Error('No Results');
            switch (r.type) {
                case "movie":
                    const mv = {
                        imdbId: request.imdbId,
                        profile: (oProfile != 'null') ? oProfile : settings.radarr.defaultProfile,
                        rootpath: (oRoot != 'null') ? oRoot : settings.radarr.defaultRoot
                    };
                    this.radarrService.addMovie(mv);
                    request.status = 1;
                break;
                case "tv":
                    const show = {
                        tvdbId: request.tvdbId,
                        profile: (req.body.overrideProfile) ? req.body.overrideProfile : settings.radarr.defaultProfile,
                        rootpath: (req.body.overrideRoot) ? req.body.overrideRoot : settings.radarr.defaultRoot
                    };
                    this.sonarrService.addShow(show);
                    request.status = 1;
                break;

                default:
                    throw new Error('Could not determine type to approve');
            }
            r.save();
            return r;
        } catch (err) { throw err; }
    }

    async delRequest(id) {

    }
}