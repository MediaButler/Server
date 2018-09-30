const express = require('express');
const basePlugin = require('./base');
const TVDB = require('node-tvdb');
const tvdb = new TVDB('88D2ED25A2539ECE');

module.exports = class tvPlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'tv',
        };
        super(info, app);
    }

    async startup() {
        this.enabled = true;
    }

    async api() {
        const router = express.Router();
        router.get('/', async (req, res) => { 
            try {
                if (!req.query.query) throw new Error('No Query provided');
                const data = await tvdb.getSeriesByName(req.query.query);
                return res.status(200).send(data[0]);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/series/:id/actors', async (req, res) => { 
            try {
                console.log(req.params.id);
                const data = await tvdb.getActors(req.params.id);
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/series/:id/episodes', async (req, res) => { 
            try {
                console.log(req.params.id);
                const data = await tvdb.getEpisodesBySeriesId(req.params.id);
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/series/:id/images', async (req, res) => { 
            try {
                console.log(req.params.id);
                const data = await tvdb.getSeriesPosters(req.params.id);
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/series/:id', async (req, res) => { 
            try {
                const data = await tvdb.getSeriesById(req.params.id);
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
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
        // Verify all layers of settings are correct. Include query to service. Then call super. Else return false
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