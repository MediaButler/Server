const express = require('express');
const services = require('../service/services');
const basePlugin = require('./base');
const requestService = require('../service/requestService');
const notificationService = require('../service/notificationService');
const TVDB = require('node-tvdb');
const imdb = require('imdb-api');
const axios = require('axios');
const Request = require('../model/request');

module.exports = class requestsPlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'requests',
        };
        super(info, app);
    }

    async startup() {
        // Area to setup hooks and timers
        try {
            this.requestService = new requestService(this.settings, this._plugins);
            services.requestService = this.requestService;
            this.requestService._approveTimer = setTimeout((() => { this.requestService.autoApprove(); }), 60 * 1000);
            this.requestService._filledTimer = setTimeout((() => { this.requestService.autoDelete(); }), 60 * 1000);
            this.enabled = true;

            setTimeout(() => {
                notificationService.on('sonarr', async (data) => {
                    console.log(`sonarr ${data.eventType}`);
                    if (data.eventType == 'Download') {
                        const r = await this.requestService.getRequests();
                        const request = r.find((x) => x.tvdbId == data.series.tvdbId);
                        if (request) {
                            const service = await this._plugins.get('sonarr');
                            const series = await service.service.getShowByTvdbId(data.series.tvdbId);
                            if (series && series.episodeCount == series.episodeFileCount) request.status = 3;
                            else request.status = 2;

                            if (request.status == 3) notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
                            request.save();
                        }
                    }
                });
                notificationService.on('sonarr4k', async (data) => {
                    console.log(`sonarr4k ${data.eventType}`);
                    if (data.eventType == 'Download') {
                        const r = await this.requestService.getRequests();
                        const request = r.find((x) => x.tvdbId == data.series.tvdbId);
                        if (request) {
                            const service = await this._plugins.get('sonarr4k');
                            const series = await service.service.getShowByTvdbId(data.series.tvdbId);

                            if (series && series.episodeCount == series.episodeFileCount) request.status = 3;
                            else request.status = 2;

                            if (request.status == 3) notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
                            request.save();
                        }
                    }
                });
                notificationService.on('radarr', async (data) => {
                    console.log(`radarr ${data.eventType}`);
                    if (data.eventType == 'Download') {
                        const r = await this.requestService.getRequests();
                        const request = r.find((x) => x.imdbId == data.remoteMovie.imdbId);
                        if (request) {
                            request.status = 3;
                            notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
                            request.save();
                        }
                    }
                });
                notificationService.on('radarr4k', async (data) => {
                    console.log(`radarr4k ${data.eventType}`);
                    if (data.eventType == 'Download') {
                        const r = await this.requestService.getRequests();
                        const request = r.find((x) => x.imdbId == data.remoteMovie.imdbId);
                        if (request) {
                            request.status = 3;
                            notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
                            request.save();
                        }
                    }
                });
                notificationService.on('radarr3d', async (data) => {
                    console.log(`radarr3d ${data.eventType}`);
                    if (data.eventType == 'Download') {
                        const r = await this.requestService.getRequests();
                        const request = r.find((x) => x.imdbId == data.remoteMovie.imdbId);
                        if (request) {
                            request.status = 3;
                            notificationService.emit('request', { who: 'System', for: request.username, request, title: request.title, type: 'filled' });
                            request.save();
                        }
                    }
                });
            }, 5000);
        } catch (err) { console.error(err); this.enabled = false; }
    }

    async api() {
        const router = express.Router();
        router.get('/', async (req, res) => {
            try {
                const r = await this.requestService.getRequests();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });
        router.get('/status/:status', async (req, res) => {
            try {
                const r = await this.requestService.getRequests();
                if (!r) return res.status(200).send([]);
                r.forEach(request => {
                    if (request.status != req.params.status) {
                        r.splice(r.indexOf(request), 1);
                    }
                });
                return res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });
        router.post('/approve/:id', async (req, res) => {
            const approvedList = this.settings.allowApprove;
            const originalRequest = await this.requestService.getRequest(req.params.id);
            let t = false;
            if (req.user.owner) t = true;
            if (!t) {
                for (let i = 0; i < approvedList.length; i++) {
                    if (approvedList[i].username == req.user.username && approvedList[i].types.indexOf(originalRequest.type > -1)) t = true;
                }
            }
            try {
                if (!t) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
                const profile = (req.body.overrideProfile) ? req.body.overrideProfile : null;
                const root = (req.body.overrideRoot) ? req.body.overrideRoot : null;
                const r = await this.requestService.approveRequest(req.params.id, profile, root);
                if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'approve' });
                console.log(`${new Date()} ${req.user.username} approved ${originalRequest.username}'s request for ${originalRequest.title}`);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });

        // {
        //     type: 'tv/movie/book/music/comic',
        //     title: 'Title',
        //     tvdbId: '',
        //     imdbId: '',
        //     musicBrainzId: '',
        //     googleBooksId: '',
        //     comicVineId: '',
        // }
        router.post('/', async (req, res) => {
            const tvdb = new TVDB('88D2ED25A2539ECE');
            const t = req.body;
            let r;
            const now = new Date();
            const requestsByUser = await Request.find({ username: req.user.username, dateAdded: { $gt: Math.floor(now.setDate(now.getDate() - 7) / 1000) } }).exec();
            console.log(requestsByUser.length);
            if (requestsByUser.length > 20) return res.status(400).send({ name: 'BadRequest', message: 'Too many requests' });
            switch (t.type) {
                case 'tv':
                    if (t.tvdbId == '') return res.status(400).send({ name: 'Bad Request', message: 'TV Requests require tvdbId' });
                    try {
                        const tvdbGet = await tvdb.getSeriesById(t.tvdbId);
                        if (tvdbGet.seriesName != t.title) return res.status(400).send({ name: 'Bad Request', message: 'Show title does not match ID' });
                        const aa = await Request.find({ tvdbId: t.tvdbId }).exec();
                        if (aa.length > 0) return res.status(400).send({ name: 'Bad Request', message: 'Request already exists' });
                    } catch (err) { return res.status(400).send({ name: 'Bad Request', message: 'Show by tvdbId does not exist.' }); }
                    break;
                case 'movie':
                    if (t.imdbId == '') return res.status(400).send({ name: 'Bad Request', message: 'Movie Requests require imdbId' });
                    try {
                        const imdbGet = await imdb.get({ id: t.imdbId }, { apiKey: '5af02350' });
                        if (imdbGet.title != t.title) return res.status(400).send({ name: 'Bad Request', message: 'Movie title does not match ID' });
                        const aa = await Request.find({ imdbId: t.imdbId }).exec();
                        if (aa.length > 0) return res.status(400).send({ name: 'Bad Request', message: 'Request already exists' });
                    } catch (err) { return res.status(400).send({ name: 'Bad Request', message: 'Movie by imdbId does not exist.' }); }
                    break;
                case 'book':
                    return res.status(500).send({ name: 'Not Implemented', message: 'Request category not implemented yet.' })
                    if (t.googleBooksId == '') return res.status(400).send({ name: 'Bad Request', message: 'Book Requests require googleBooksId' });
                    break;
                case 'music':
                    if (t.musicBrainzId == '') return res.status(400).send({ name: 'Bad Request', message: 'Music Requests require musicBrainzId' });
                    try {
                        const musicBrainzGet = await axios({ method: 'GET', url: `http://musicbrainz.org/ws/2/artist/${t.musicBrainzId}?inc=aliases&fmt=json` });
                        if (musicBrainzGet.data.name != t.title) return res.status(400).send({ name: 'Bad Request', message: 'Artist name does not match ID' });
                        const aa = await Request.find({ musicBrainzId: t.musicBrainzId }).exec();
                        if (aa.length > 0) return res.status(400).send({ name: 'Bad Request', message: 'Request already exists' });
                    } catch (err) { console.error(err); return res.status(400).send({ name: 'Bad Request', message: 'Artist by musicBrainzId does not exist.' }); }
                    break;
                case 'comic':
                    return res.status(500).send({ name: 'Not Implemented', message: 'Request category not implemented yet.' })
                    if (t.comicVineId == '') return res.status(400).send({ name: 'Bad Request', message: 'Comic Requests require comicVineId' });
                    break;
                default:
                    return res.status(400).send({ name: 'Bad Request', message: 'Could not determine request type' });
                    break;
            }

            r = new Request(t);
            r.dateAdded = Date.now();
            r.username = req.user.username;
            r.status = 0;

            const targetMap = {};
            this.settings.targets.map((x) => { targetMap[x.type] = x; });
            if (!t.target) t.target = targetMap[t.type].target;
            r.target = t.target;
            const providerPlugin = this._plugins.get(r.target);
            if (!providerPlugin) throw new Error('Unable to find plugin');
            if (!providerPlugin.enabled) throw new Error('Plugin not Enabled');
            if (!providerPlugin.info.requestTarget) throw new Error('Unable to target provider');
            let hasItem = false;

            switch (t.type) {
                case 'tv':
                    hasItem = await providerPlugin.hasItem(t.tvdbId);
                    break;
                case 'movie':
                    hasItem = await providerPlugin.hasItem(t.imdbId);
                    break;
                case 'music':
                    hasItem = await providerPlugin.hasItem(t.musicBrainzId);
                    break;
                default:
                    throw new RangeError('Unexpected `type`');
            }

            if (!hasItem) {
                r.save();
                if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'add' });
                console.log(`${new Date().toTimeString()} ${req.user.username} added request for ${r.title}`);
                res.status(200).send(r);
            } else { res.status(400).send({ name: 'BadRequest', message: 'Item Exists' }); }
        });

        router.delete('/:id', async (req, res) => {
            const r = await this.requestService.getRequest(req.params.id);
            let canDelete = false;
            if (r.username == req.user.username) canDelete = true;
            if (req.user.owner) canDelete = true;
            if (!canDelete) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            if (!r) return res.status(400).send({ name: 'BadRequest', message: 'Request does not exist' });
            const d = await this.requestService.delRequest(req.params.id, true);
            res.status(200).send({ name: 'OK', message: 'Deleted' });
            console.log(`${new Date().toTimeString()} ${req.user.username} deleted request for ${r.title}`);
            if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'delete' });
        });

        router.get('/autoapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array(this.settings.autoApprove.length);
            this.settings.autoApprove.map((x) => { approveMap[x.username] = x; });
            if (!approveMap[req.params.username]) res.status(404).send({ name: 'NotFound', message: 'Query returned no results' });
            return res.status(200).send(approveMap[req.params.username]);
        });

        router.get('/autoapprove', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            return res.status(200).send(this.settings.autoApprove);
        });

        router.post('/autoapprove', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array(this.settings.autoApprove.length);
            this.settings.autoApprove.map((x) => { approveMap[x.username] = x; });
            if (approveMap[req.body.username]) return res.status(400).send({ name: 'Bad Request', message: 'Username already exists' });
            const newAutoApprove = { username: req.body.username, types: req.body.types.split(',') };
            this.settings.autoApprove.push(newAutoApprove);
            const settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send(newAutoApprove);
        });

        router.post('/autoapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array(this.settings.autoApprove.length);
            this.settings.autoApprove.map((x) => { approveMap[x.username] = x; });
            const idx = this.settings.autoApprove.indexOf(approveMap[req.params.username])
            const alltypes = new Array();
            alltypes.push(approveMap[req.params.username].types);
            alltypes.push(req.body.types.split(','));
            const newAutoApprove = { username: req.params.username, types: req.body.types.split(',') };
            this.settings.autoApprove.splice(idx, 1);
            this.settings.autoApprove.push(newAutoApprove);
            const settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send(newAutoApprove);
        });

        router.put('/autoapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array(this.settings.autoApprove.length);
            this.settings.autoApprove.map((x) => { approveMap[x.username] = x; });
            const idx = this.settings.autoApprove.indexOf(approveMap[req.params.username])
            const alltypes = new Array();
            alltypes.push(approveMap[req.params.username].types);
            alltypes.push(req.body.types.split(','));
            const newAutoApprove = { username: req.params.username, types: alltypes };
            this.settings.autoApprove.splice(idx, 1);
            this.settings.autoApprove.push(newAutoApprove);
            settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send(newAutoApprove);
        });

        router.delete('/autoapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array();
            this.settings.autoApprove.map((x) => { approveMap[x.username] = x; });
            const idx = this.settings.autoApprove.indexOf(approveMap[req.params.username])
            this.settings.autoApprove.splice(idx, 1);
            const settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send({ name: 'OK', message: 'Deleted' });
        });

        router.get('/allowapprove', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            return res.status(200).send(this.settings.allowApprove);
        });

        router.get('/allowapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array();
            this.settings.allowApprove.map((x) => { approveMap[x.username] = x; });
            if (!approveMap[req.params.username]) return res.status(404).send({ name: 'NotFound', message: 'Query returned no results' });
            return res.status(200).send(approveMap[req.params.username]);
        });

        router.post('/allowapprove', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array();
            this.settings.allowApprove.map((x) => { approveMap[x.username] = x; });
            if (approveMap[req.body.username]) return res.status(400).send({ name: 'Bad Request', message: 'Username already exists' });
            const newApprove = { username: req.body.username, types: req.body.types.split(',') };
            this.settings.allowApprove.push(newApprove);
            const settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send(newApprove);
        });

        router.post('/allowapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array();
            this.settings.allowApprove.map((x) => { approveMap[x.username] = x; });
            const idx = this.settings.allowApprove.indexOf(approveMap[req.params.username])
            const alltypes = new Array();
            alltypes.push(approveMap[req.params.username].types);
            alltypes.push(req.body.types.split(','));
            const newApprove = { username: req.params.username, types: req.body.types.split(',') };
            this.settings.allowApprove.splice(idx, 1);
            this.settings.allowApprove.push(newApprove);
            const settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send(newApprove);
        });

        router.put('/allowapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array();
            this.settings.allowApprove.map((x) => { approveMap[x.username] = x; });
            const idx = this.settings.allowApprove.indexOf(approveMap[req.params.username])
            const alltypes = new Array();
            alltypes.push(approveMap[req.params.username].types);
            alltypes.push(req.body.types.split(','));
            const newApprove = { username: req.params.username, types: alltypes };
            this.settings.allowApprove.splice(idx, 1);
            this.settings.allowApprove.push(newApprove);
            const settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send(newApprove);
        });

        router.delete('/allowapprove/:username', async (req, res) => {
            if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
            const approveMap = new Array();
            this.settings.allowApprove.map((x) => { approveMap[x.username] = x; });
            const idx = this.settings.allowApprove.indexOf(approveMap[req.params.username])
            this.settings.allowApprove.splice(idx, 1);
            const settings = services.settingsService.getSettings();
            settings.requests = this.settings;
            services.settingsService._saveSettings(settings);
            return res.status(200).send({ name: 'OK', message: 'Deleted' });
        });

        router.get('/:id', async (req, res) => {
            try {
                const r = await this.requestService.getRequest(req.params.id);
                if (!r) return res.status(404).send({ name: 'Not Found', message: 'Request not found' });
                return res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });
        return router;
    }

    async hook() {
        return false;
    }

    async shutdown() {

    }

    async configure(settings) {
        this.settings = settings;
        const router = express.Router();
        router.post('/', async (req, res) => { });
        router.put('/', async (req, res) => { });
        router.get('/', async (req, res) => {
            if (!req.user.owner) throw new Error('Unauthorized');
            const data = {
                schema: [],
                settings: {}
            }
            return res.status(200).send(data);
        });
        return router;
    }
}