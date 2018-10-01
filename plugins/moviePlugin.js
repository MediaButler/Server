const express = require('express');
const basePlugin = require('./base');
const imdb = require('imdb-api');

module.exports = class moviePlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'movie',
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
                if (!req.query.page) req.query.page = 1;
                else req.query.page = parseInt(req.query.page);
                const data = await imdb.search({ name: req.query.query, type: 'movie' }, { apiKey: '5af02350' }, req.query.page);
                if (data.response) delete data.response;
                if (data.opts) delete data.opts;
                if (data.req) delete data.req;
                data.pageSize = 10;
                if (data.totalresults) { data.totalResults = data.totalresults; delete data.totalresults }
                return res.status(200).send(data);
            } catch (err) { return res.status(400).send({ name: err.name, message: err.message }); }
        });
        router.get('/:id', async (req, res) => {
            try {
                const data = await imdb.get({ id: req.params.id }, { apiKey: '5af02350' });
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