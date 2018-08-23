const express = require('express');
const basePlugin = require('./base');
const services = require('../service/services');

module.exports = class tautulliPlugin extends basePlugin {
    constructor() {
        const info = {
            'name': 'tautulli',
            'requires': {
                'services': ['tautulliService', 'notificationService', 'rulesService'],
            }
        };
        super(info);
    }

    async startup() {
        // Designed for creation and enabling.
        this.previousPlaying = false;
        this.tautulliService = services.tautulliService;
        this.notificationService = require('../service/notificationService');
        try {
            const t = await this.tautulliService.getNotifiers();
            const notifMap = new Array(t.data.length);
            t.data.map((x) => { notifMap[x.friendly_name] = x; });
            if (!notifMap['MediaButler API']) {
                this.tautulliService.addScriptNotifier();
            } else {
                // Verify url is correct
                console.log('Tautulli Plugin Setup');
                this.enabled = true;
            }
        } catch (err) { throw err; }
        return;
    }

    async api() {
        const router = express.Router();
        router.get('/activity', async (req, res) => {
            try {
                const r = await this.tautulliService.getNowPlaying();
                if (!r) throw new Error('No Results Found');
                res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });
        router.get('/library', async (req, res) => {

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
        // Verify all layers of settings are correct. Include query to service. Then call super. Else return false
        const router = express.Router();
        router.post('/', async (req, res) => { });
        router.put('/', async (req, res) => { });
        router.get('/', async (req, res) => {
            const data = {
                schema: [{
                    name: 'url',
                    tyoe: 'url'
                }, 
                { 
                    name: 'apikey', 
                    type: 'string' 
                }],
                settings
            }
            res.status(200).send(data);
        });
        return router;
    }
}