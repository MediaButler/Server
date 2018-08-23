const express = require('express');
const basePlugin = require('./base');

module.exports = class tvPlugin extends basePlugin {
    constructor() {
        const info = {
            'name': 'tv',
        };
        super(info);
    }

    async startup() {
        this.enabled = true;
    }

    async api() {
        const router = express.Router();
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
        router.get('/', async (req, res) => { });
        return router;
    }
}