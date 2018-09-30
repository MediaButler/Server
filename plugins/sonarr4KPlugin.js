const express = require('express');
const basePlugin = require('./base');
const services = require('../service/services');
const sonarrService = require('../service/sonarrService');
const host = require('ip').address('public');

module.exports = class sonarr4KPlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'sonarr4k',
            'requestTarget': true,
        };
        super(info, app);
    }
    async startup() {
        try {
            const settings = services.settings;
            this.service = new sonarrService(this.settings);  
            services.sonarr4kService = this.service;
            const notifiers = await this.service.getNotifiers();
            const notificationUrl = (settings.urlOverride) ? `${settings.urlOverride}hooks/${this.info.name}/` : `http://${host}:${process.env.PORT || 9876}/hooks/${this.info.name}/`;
            const notifMap = Array(notifiers.length);
            notifiers.map((x) => { notifMap[x.name] = x; });
            if (!notifMap['MediaButler API']) {
                const t = await this.service.addWebhookNotifier(notificationUrl);
                if (t) this.enabled = true;
                return;
            } else {
                const n = notifMap['MediaButler API'];
                if (n.fields[0].value != notificationUrl) {
                    const d = await this.service._api.delete(`notification/${n.id}`);
                    const t = await this.service.addWebhookNotifier(notificationUrl);
                    if (t) this.enabled = true;
                    return;
                } else { this.enabled = true; }
            }
        } catch (err) { console.error(err); this.enabled = false; }
    }

    async api() {
        const router = express.Router();
        router.get('/calendar', async (req, res) => {
            try {
                const r = await this.service.getCalendar();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/history', async (req, res) => {
            try {
                const r = await this.service.getHistory();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/status', async (req, res) => {
            try {
                const r = await this.service.getSystemStatus();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/lookup', async (req, res) => {
            try {
                const r = await this.service.lookupShow({ name: req.query.query });
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/search', async (req, res) => {
            // Perform episode search
        });
        router.post('/search', async (req, res) => {
            // Add download from search
        });
        router.get('/queue', async (req, res) => {
            try {
                const r = await this.service.getQueue();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.post('/queue', async (req, res) => {
            // Adds something to the queue
            // RELEASE/PUSH
        });
        router.get('/:id', async (req, res) => {
            try {
                const r = await this.service.getShow(req.params.id);
                if (!r) throw new Error('No Results Found');
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.put('/:id', async (req, res) => {
            // Updates a show (from id)
        });
        router.delete('/:id', async (req, res) => {
            // Deleted a show (by id)
        });
        router.get('/', async (req, res) => {
            try {
                const r = await this.service.getShows();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.post('/', async (req, res) => {
            // Adds a show to Sonarr
        });
        return router;
    }

    async hook() {
        const router = express.Router();
        router.post('/', async (req, res) => {
            try {
                services.notificationService.emit('sonarr4k', req.body);
                return res.status(200).send('OK');;
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.put('/', async (req, res) => {
            try {
                services.notificationService.emit('sonarr4k', req.body);
                return res.status(200).send('OK');;
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        return router;
    }

    async shutdown() {
        return;
    }

    async configure(settings) {
        this.settings = (settings) ? settings : { url: '', apikey: '', defaultProfile: '', defaultRoot: '' };
        const router = express.Router();
        router.post('/', async (req, res) => {
            try {
                if (!req.user.owner) throw new Error('Unauthorized');
                if (!req.body.url) throw new Error('url Not Provided');
                if (!req.body.apikey) throw new Error('apikey Not Provided');
                if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
                if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
                const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
                const t = new sonarrService(tempSettings);
                const r = await t.checkSettings();
                if (r) {
                    const t = await super.saveSettings(tempSettings);
                    this.settings = tempSettings;
                    await this.startup();
                    this._plugins.set(this.info.name, this);
                    return res.status(200).send({ message: 'success', settings: tempSettings });
                } else return res.status(400).send({ name: 'error', message: 'Unable to connect' });
            } catch (err) { return res.status(400).send({ name: 'error', message: 'Unable to connect' }); }
         });
        router.put('/', async (req, res) => {
            try {
                if (!req.user.owner) throw new Error('Unauthorized');
                if (!req.body.url) throw new Error('url Not Provided');
                if (!req.body.apikey) throw new Error('apikey Not Provided');
                if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
                if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
                const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
                const t = new sonarrService(tempSettings);
                const r = await t.checkSettings();
                if (r) return res.status(200).send({ message: 'success', settings: tempSettings });
                else return res.status(400).send({ name: 'error', message: 'Unable to connect' });
            } catch (err) { return res.status(400).send({ name: 'error', message: 'Unable to connect' }); }
         });
        router.get('/', async (req, res) => {
            try {
                if (!req.user.owner) throw new Error('Unauthorized');
                const data = {
                    schema: [{
                        name: 'url',
                        type: 'url'
                    },
                    {
                        name: 'apikey',
                        type: 'secure-string'
                    },
                    {
                        name: 'defaultProfile',
                        type: 'string'
                    },
                    {
                        name: 'defaultRoot',
                        type: 'string'
                    }],
                    settings: this.settings
                }
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
         });
        return router;
    }

    async hasItem(tvdbId) {
        try {
            const r = await this.service.getShowByTvdbId(tvdbId);
            if (r) return true;
            else return false;
        } catch (err) { return false; }
    }

    async getAll() {
        try {
            return await this.service.getShows();
        } catch (err) { return false; }
    }
}