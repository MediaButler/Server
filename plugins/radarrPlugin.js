const express = require('express');
const basePlugin = require('./base');
const services = require('../service/services');
const notificationService = require('../service/notificationService');
const radarrService = require('../service/radarrService');
const host = require('ip').address('public');

module.exports = class sonarrPlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'radarr',
        };
        super(info, app);
    }

    async startup() {
        try {
            this.radarrService = new radarrService(this.settings);
            services.radarrService = this.radarrService;
            const settings = services.settings;    
            const notifiers = await this.radarrService.getNotifiers();
            const notificationUrl = (settings.urlOverride) ? `${settings.urlOverride}hooks/radarr/` : `http://${host}:${process.env.PORT || 9876}/hooks/radarr/`;
            const notifMap = Array(notifiers.length);
            notifiers.map((x) => { notifMap[x.name] = x; });
            if (!notifMap['MediaButler API']) {
                const t = await this.radarrService.addWebhookNotifier(notificationUrl);
                if (t) this.enabled = true;
                return;
            } else {
                const n = notifMap['MediaButler API'];
                if (n.fields[0].value != notificationUrl) {
                    const d = await this.radarrService._api.delete(`notification/${n.id}`);
                    const t = await this.radarrService.addWebhookNotifier(notificationUrl);
                    if (t) this.enabled = true;
                    return;
                } else { this.enabled = true; return; }
            }
        } catch (err) { this.enabled = false; }
    }

    async api() {
        const router = express.Router();
        router.get('/calendar', async (req, res) => {
            try {
                const r = await this.radarrService.getCalendar();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/history', async (req, res) => {
            try {
                const r = await this.radarrService.getHistory();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/status', async (req, res) => {
            try {
                const r = await this.radarrService.getSystemStatus();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/lookup', async (req, res) => {
            try {
                const r = await this.radarrService.lookupMovie({ name: req.params.query });
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
                const r = await this.radarrService.getQueue();
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
                const r = await this.radarrService.getMovie(req.params.id);
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
                const r = await this.radarrService.getMovies();
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
                if (notificationService) notificationService.emit('radarr', req.body);
                return res.status(200).send('OK');;
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.put('/', async (req, res) => {
            try {
                if (notificationService) notificationService.emit('radarr', req.body);
                return res.status(200).send('OK');;
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        return router;
    }

    async shutdown() {
        return;
    }

    async configure(settings) {
        this.settings = settings;
        // Verify all layers of settings are correct. Include query to service. Then call super. Else return false
        const router = express.Router();
        router.post('/', async (req, res) => {
            try {
                if (!req.user.owner) throw new Error('Unauthorized');
                if (!req.body.url) throw new Error('url Not Provided');
                if (!req.body.apikey) throw new Error('apikey Not Provided');
                if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
                if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
                const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
                const t = new radarrService(tempSettings);
                const r = await t.checkSettings();
                if (r) {
                    const t = await super.saveSettings(tempSettings);
                    this.settings = tempSettings;
                    await this.startup();
                    return res.status(200).send({ message: 'success', settings: tempSettings });
                } else return res.status(400).send({ name: 'Error', message: 'Unable to connect' });
            } catch (err) { return res.status(400).send(err); }
         });
        router.put('/', async (req, res) => { 
            try {
                if (!req.user.owner) throw new Error('Unauthorized');
                if (!req.body.url) throw new Error('url Not Provided');
                if (!req.body.apikey) throw new Error('apikey Not Provided');
                if (!req.body.defaultProfile) throw new Error('defaultProfile Not Provided');
                if (!req.body.defaultRoot) throw new Error('defaultRoot Not Provided');
                const tempSettings = { url: req.body.url, apikey: req.body.apikey, defaultProfile: req.body.defaultProfile, defaultRoot: req.body.defaultRoot };
                const t = new radarrService(tempSettings);
                const r = await t.checkSettings();
                if (r) return res.status(200).send({ message: 'success', settings: tempSettings });
                else return res.status(400).send({ name: 'Error', message: 'Unable to connect' });
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
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
                    settings
                }
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
         });
        return router;
    }
}