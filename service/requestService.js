
const Request = require('../model/request');
const notificationService = require('../service/notificationService');
const settingsService = require('./settingsService');

module.exports = class requestService {
    constructor(settings, plugins, startup = false) {
        this.settings = new settingsService().getSettings();
        this.plugins = plugins;
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

    async autoDelete() {
        console.log('checking for filled');
        const filled = await Request.find({ status: 3 });
        if (filled.length > 0) {
            filled.forEach((request) => {
                request.status = 4;
                request.save();
            });
        }
        clearTimeout(this._filledTimer);
        this._filledTimer = setTimeout(() => { this.autoDelete(); }, (15 * 60) * 1000);
    }


    async getRequests() {
        try {
            const r = await Request.find({ status: { $lt: 4 }});
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
            const targets = {};
            if (!this.settings.requests.targets) this.settings.requests.targets = [
                { "type": "tv", "target": "sonarr" },
                { "type": "movie", "target": "radarr" },
                { "type": "tv4k", "target": "sonarr4k" },
                { "type": "movie4k", "target": "radarr4k" },
                { "type": "movies3d", "target": "radarr3d" },
                { "type": "music", "target": "lidarr"}];
            this.settings.requests.targets.map((x) => { targets[x.type] = x; });
            const service = this.plugins.get(r.target);

            switch (r.type) {
                case 'movie':
                    try {
                        const mv = {
                            imdbId: r.imdbId,
                            profile: (oProfile != 'null') ? service.settings.defaultProfile : oProfile,
                            rootPath: (oRoot != 'null') ? service.settings.defaultRoot : oRoot
                        };
                        if (!service.enabled) throw new Error('Plugin is not Enabled');
                        else console.log('api enabled');
                        const a = await service.service.addMovie(mv);
                        r.status = 1;
                    } catch (err) { throw err; }
                    break;
                case 'tv':
                    try {
                        const show = {
                            tvdbId: r.tvdbId,
                            profile: (oProfile != 'null') ? service.settings.defaultProfile : oProfile,
                            rootPath: (oRoot != 'null') ? service.settings.defaultRoot : oRoot
                        };
                        if (!service.enabled) throw new Error('Plugin is not Enabled');
                        const a = await service.service.addShow(show);
                        r.status = 1;
                    } catch (err) { throw err; }
                    break;
                case 'music': 
                    try {
                        const artist = {
                            musicBrainzId: r.musicBrainzId,
                            profile: (oProfile != 'null') ? service.settings.defaultProfile : oProfile,
                            rootPath: (oRoot != 'null') ? service.settings.defaultRoot : oRoot
                        }
                        if (!service.enabled) throw new Error('Plugin is not Enabled');
                        const a = await service.service.addArtist(artist);
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