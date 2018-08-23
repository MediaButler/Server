const express = require('express');
const basePlugin = require('./base');
const services = require('../service/services');

module.exports = class sonarrPlugin extends basePlugin {
    constructor() {
        const info = {
            'name': 'sonarr',
        };
        super(info);
    }

    async startup() {
        this.sonarrService = services.sonarrService;
        this.enabled = true;
    }

    async api() {
        const router = express.Router();
        router.get('/calendar', async (req, res) => {
            try {
                const r = await this.sonarrService.getCalendar();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/history', async (req, res) => {
            try {
                const r = await this.sonarrService.getHistory();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/status', async (req, res) => {
            try {
                const r = await this.sonarrService.getSystemStatus();
                if (!r) return res.status(200).send([]);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });
        router.get('/lookup', async (req, res) => {
            try {
                const r = await this.sonarrService.lookupShow({ name: req.params.query });
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
                const r = await this.sonarrService.getQueue();
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
                const r = await this.sonarrService.getShow(req.params.id);
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
                const r = await this.sonarrService.getShows();
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
                if (notificationService) notificationService.emit('sonarr', req.body);
                return res.status(200).send('OK');;
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
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
        router.get('/', async (req, res) => { });
        return router;
    }
}