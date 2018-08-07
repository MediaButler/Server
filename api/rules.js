const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
const services = require('../service/services');

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
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Deletes a rule from username
router.delete('/:username', async (req, res) => {
    try {
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

module.exports = router;
