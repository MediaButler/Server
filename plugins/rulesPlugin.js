const express = require('express');
const basePlugin = require('./base');
const services = require('../service/services');
const rulesService = require('../service/rulesService');

module.exports = class rulesPlugin extends basePlugin {
    constructor(app) {
        const info = {
            'name': 'rules',
        };
        super(info, app);
    }

    async startup() {
        try {
            this.rulesService = new rulesService(this.settings);
            services.rulesService = this.rulesService;;
            this.enabled = true;
        } catch (err) { this.enabled = false; }
    }

    async api() {
        const router = express.Router();
        router.get('/', async (req, res) => {
            try {
                const r = await services.rulesService.getAllRules();
                return res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });

        // Get rules applied to username
        router.get('/:username', async (req, res) => {
            try {
                const r = await services.rulesService.getRules(req.params.username);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });

        // Adds a rule to username
        router.post('/:username', async (req, res) => {
            try {
                if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
                if (!req.body.ruleId) return res.status(401).send({ name: 'Bad Request', message: 'RuleId not provided' });
                const r = await services.rulesService.addRule(req.params.username, req.body.ruleId, req.body.argument || null);
                return res.status(200).send(r);
            } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
        });

        // Updates a rule to username
        router.put('/:username', async (req, res) => {
            try {
                if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });

                return res.status(200).send(r);
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
        });

        // Deletes a rule from username
        router.delete('/:username/:id', async (req, res) => {
            try {
                if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
                const r = await services.rulesService.getRules(req.params.username);
                const d = await services.rulesService.deleteRule(req.params.username, req.params.id);
                return res.status(200).send({ name: 'OK', message: 'Deleted' });
            } catch (err) {
                return res.status(500).send({ name: err.name, message: err.message });
            }
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
        this.settings = settings;
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