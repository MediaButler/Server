const express = require('express');
const basePlugin = require('./base');
const TVDB = require('node-tvdb');
const tvdb = new TVDB('88D2ED25A2539ECE');

const iterator = (a, n) => {
    let current = 0, l = a.length;
    return () => {
        end = current + n;
        const part = a.slice(current, end);
        current = end < l ? end : 0;
        return part;
    };
};


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
                if (!req.query.page) req.query.page = 1;
                else req.query.page = parseInt(req.query.page);
                if (!req.query.pageSize) req.query.pageSize = 10;
                else req.query.pageSize = parseInt(req.query.pageSize);
                const iterate = iterator(data, req.query.pageSize);
                let result = [];
                for (let i = 0; i < req.query.page; i++) {
                    result = iterate();
                }
                const output = {
                    totalResults: data.length,
                    page: req.query.page,
                    pageSize: req.query.pageSize,
                    results: result,
                }
                return res.status(200).send(output);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/:id/actors', async (req, res) => {
            try {
                console.log(req.params.id);
                const data = await tvdb.getActors(req.params.id);
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/:id/episodes', async (req, res) => {
            try {
                console.log(req.params.id);
                const data = await tvdb.getEpisodesBySeriesId(req.params.id);
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/:id/images', async (req, res) => {
            try {
                console.log(req.params.id);
                const data = await tvdb.getSeriesPosters(req.params.id);
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/:id', async (req, res) => {
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