
const Request = require('../model/request');
const services = require('./services');
const notificationService = require('../service/notificationService');

module.exports = class requestService {
    constructor(settings, sonarrService, radarrService, startup = false) {
        this.settings = settings;
        this.sonarrService = sonarrService;
        this.radarrService = radarrService;
        if (startup) this._approveTimer = setTimeout((() => { this.autoApprove(); }), 60 * 1000);
    }

    async autoApprove() {
        console.log('checking for approvals');
        const pending = await this.getPendingRequests();
        const autoApproveLength = (this.settings.requests.autoApprove.length == 0) ? 0 : this.settings.requests.autoApprove.length - 1;
        const approvedMap = Array(autoApproveLength);
        this.settings.requests.autoApprove.map((x) => approvedMap[x.username] = x);
        if (pending.length > 0) {
            pending.forEach((request) => {
                if (approvedMap[request.username]) {
                    if (approvedMap[request.username].types.indexOf(request.type) > -1) {
                        this.approveRequest(request.id);
                        if (notificationService) notificationService.emit('request', { id: request.id, who: 'System', for: request.username, title: request.title, mediaType: request.type, type: 'approve' });
                        console.log(`${new Date()} System approved ${request.username}'s request for ${request.title}`);
                    }
                }
            });
        }
        clearTimeout(this._approveTimer);
        this._approveTimer = setTimeout((() => { this.autoApprove(); }), (60 * 60) * 1000);
    }


    async getRequests() {
        try {
            const r = await Request.find({});
            if (!r) throw new Error('No Results');
            return r;
        } catch (err) { throw err; }
    }

    async getPendingRequests() {
        try {
            const r = await Request.find({ status: 0 });
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
                    try {
                        const mv = {
                            imdbId: r.imdbId,
                            profile: (oProfile != 'null') ? this.settings.radarr.defaultProfile : oProfile,
                            rootPath: (oRoot != 'null') ? this.settings.radarr.defaultRoot : oRoot
                        };
                        this.radarrService.addMovie(mv);
                        r.status = 1;
                    } catch (err) { throw err; }
                    break;
                case "tv":
                    try {
                        const show = {
                            tvdbId: r.tvdbId,
                            profile: (oProfile != 'null') ? this.settings.sonarr.defaultProfile : oProfile,
                            rootPath: (oRoot != 'null') ? this.settings.sonarr.defaultRoot : oRoot
                        };
                        this.sonarrService.addShow(show);
                        r.status = 1;
                    } catch (err) { throw err; }
                    break;

                default:
                    throw new Error('Could not determine type to approve');
            }
            r.save();
            return r;
        } catch (err) { throw err; }
    }

    async delRequest(id, confirmed = false) {
        if (confirmed) return Request.deleteOne({ '_id': id }).exec();
        else return false;
    }

    async addApprover(username, types = []) {

    }

    async addAutoApprove(username, types = []) {
        
    }
}