const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const settings = require('../settings.json');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Get all available rules
router.get('/', async (req, res) => {
    try {
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Get rules applied to username
router.get('/:username', async (req, res) => {
    try {
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Adds a rule to username
router.post('/:username', async (req, res) => {
    try {
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
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