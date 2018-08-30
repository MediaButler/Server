const express = require('express');
const basePlugin = require('./base');

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
                if (!req.params.query) throw new Error('No Query provided');
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