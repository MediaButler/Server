const express = require('express');
const basePlugin = require('./base');
const services = require('../service/services');
const plexService = require('../service/plexService');

module.exports = class plexPlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'plex',
        };
        super(info, app);
    }

    async startup() {
        try {
            if (this.settings.token) {
                this.plexService = new plexService(this.settings, true);
                services.adminPlexService = this.plexService;
                this.enabled = true;
            } else {
                console.log('Plex Token not found, deferring full startup');
                this.plexService = new plexService(this.settings);
                if (!this.plexService.getIdentity()) throw new Error('Unable to connect to plex Server')
                else { this.enabled = true; }
            }
        } catch (err) { this.enabled = false; }
    }

    async api() {
        const router = express.Router();
        router.get('/', async (req, res) => {
            try {
                this.settings.token = req.user.token;
                const plex = new plexService(this.settings);
                const r = await plex.getIdentity();
                if (!r) throw new Error('Unable to connect');
                else return r;
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/history', async (req, res) => {
            try {
                const settings = services.settings;
                settings.plex.token = req.user.token;
                const plex = new plexService(settings.plex);
                const r = await plex.getHistory();
                if (!r) throw new Error('No Results Found');
                const result = { video: [], audio: [] };
                r.MediaContainer.Video.forEach((video) => {
                    if (video.User.title == req.user.username) {
                        if (video.type == 'episode') {
                            const t = { showName: video.grandparentTitle, episodeTitle: video.title, type: video.type, episodeNumber: video.index, seasonNumber: video.parentIndex, viewedAt: video.viewedAt, user: video.User.title };
                            result.video.push(t);
                        }
                        if (video.type == 'movie') {
                            const t = { title: video.title, type: video.type, viewedAt: video.viewedAt, user: video.User.title };
                            result.video.push(t);
                        }
                    }
                });
                r.MediaContainer.Track.forEach((song) => {
                    if (song.User.title == req.user.username) {
                        const t = { title: song.title, artist: song.grandparentTitle, album: song.parentTitle, user: song.User.title };
                        result.audio.push(t);
                    }
                });
                result.count_video = result.video.length;
                result.count_audio = result.audio.length;
                res.status(200).send(result);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.post('/history', async (req, res) => {
            try {
                const settings = services.settings;
                settings.plex.token = req.user.token;
                const plex = new plexService(settings.plex);
                this._processHistory(plex, req.body);
                return res.status(200).send({ name: 'OK', message: 'Process started. This may take a while.' });
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        return router;
    }

    async hook() {
        return false;
    }

    async shutdown() {
        return;
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

    async _processHistory(plexService, data) {
        if (Array.isArray(data.video)) {
            asyncForEach(data.video, async (video) => {
                let t;
                if (video.type == 'episode') {
                    t = await plexService.searchLibraries(video.showName);
                    const episodes = await plexService.getDirectory(t.MediaContainer.Metadata[0].ratingKey);
                    if (Array.isArray(episodes.MediaContainer.Metadata)) {
                        asyncForEach(episodes.MediaContainer.Metadata, async (ep) => {
                            if (ep.grandparentTitle == video.showName) {
                                if (ep.parentIndex == video.seasonNumber) {
                                    if (ep.index == video.episodeNumber) {
                                        console.log(ep.ratingKey);
                                        console.log(`${video.showName} - S${video.seasonNumber}E${video.episodeNumber} - To be marked as watched`);
                                    }
                                }
                            }
                        });
                    }
                    //if (video.type == 'movie') t = await plex.searchLibraries(video.title);
                    //console.log(t.MediaContainer);
                }
            });
        }
    }
}