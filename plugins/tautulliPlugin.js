const express = require('express');
const basePlugin = require('./base');
const services = require('../service/services');
const tautulliService = require('../service/tautulliService');
const host = require('ip').address('public');

module.exports = class tautulliPlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'tautulli',
        };
        super(info, app);
    }

    async startup() {
        try {
            this.previousPlaying = false;
            this.tautulliService = new tautulliService(this.settings);
            services.tautulliService = this.tautulliService;
            this.notificationService = require('../service/notificationService');
            const t = await this.tautulliService.getNotifiers();
            const notifMap = new Array(t.data.length);
            const notificationUrl = (services.settings.urlOverride) ? `${services.settings.urlOverride}hooks/tautulli` : `http://${host}:${process.env.PORT || 9876}/hooks/tautulli`;
            t.data.map((x) => { notifMap[x.friendly_name] = x; });
            if (!notifMap['MediaButler API']) {
                await this.tautulliService.addScriptNotifier(notificationUrl);
                this.enabled = true;
            } else {
                const id = notifMap['MediaButler API'].id;
                const data = await this.tautulliService.getNotifierConfig(id);
                if (data.config_options[0].value != notificationUrl) {
                    this.tautulliService.setNotifierConfig(id, notificationUrl);
                }
                this.enabled = true;
            }
        } catch (err) { console.error(err); this.enabled = false; }
        return;
    }

    async api() {
        const router = express.Router();
        router.get('/activity', async (req, res) => {
            try {
                const r = await this.tautulliService.getNowPlaying();
                if (!req.user.owner) {
                    r.data.sessions.forEach((session) => {
                        if (session.username != req.user.username) {
                            session.user_id = 0;
                            session.username = "Plex User";
                            session.ip_address = "0.0.0.0";
                            session.user = "Plex User";
                            session.email = "Plex User";
                            session.friendly_name = "Plex User";
                            session.user_thumb = "";
                            session.ip_address_public = "0.0.0.0";
                        }
                    });
                }
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/library', async (req, res) => {
            try {
                const r = await this.tautulliService.getLibraryStats();
                return res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });
        router.get('/history', async (req, res) => {
            try {
                const r = await this.tautulliService.getHistory(req.params.username, 15);
                return res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });
        return router;
    }

    async hook() {
        const router = express.Router();
        router.post('/', async (req, res) => {
            try {
                console.log(`${req.body.action} ${req.body.session_key}`);
                if (this.notificationService) this.notificationService.emit('tautulli', req.body);
                return res.status(200).send('OK');
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });
        return router;
    }

    async shutdown() {
        return;
    }

    async configure(settings) {
        this.settings = settings;
        const router = express.Router();
        router.post('/', async (req, res) => {
            try {
                if (!req.user.owner) throw new Error('Unauthorized');
                if (!req.body.url) throw new Error('No url Provided');
                if (!req.body.apikey) throw new Error('No apikey Provided');
                const tempSettings = { url: req.body.url, apikey: req.body.apikey }
                const t = new tautulliService(tempSettings);
                const r = await t.checkSettings();
                if (r) {
                    const t = await super.saveSettings(tempSettings);
                    this.settings = tempSettings;
                    await this.startup();
                    return res.status(200).send({ message: 'success', settings: tempSettings });
                } else return res.status(400).send({ name: 'error', message: 'Unable to connect' });
            } catch (err) { return res.status(400).send({ name: 'error', message: 'Unable to connect' }); }
        });
        router.put('/', async (req, res) => {
            try {
                if (!req.user.owner) throw new Error('Unauthorized');
                if (!req.body.url) throw new Error('No url Provided');
                if (!req.body.apikey) throw new Error('No apikey Provided');
                const tempSettings = { url: req.body.url, apikey: req.body.apikey }
                const t = new tautulliService(tempSettings);
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
                    }],
                    settings
                }
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        return router;
    }
}