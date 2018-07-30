const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
const notificationService = require('../service/notificationService');

router.post('/sonarr', (req, res) => {
    try {
        if (notificationService) notificationService.emit('tvshow',  req.body);
        return res.status(200).send('OK');;
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.put('/sonarr', (req, res) => {
    try {
        if (notificationService) notificationService.emit('tvshow',  req.body);
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/radarr', (req, res) => {
    try {
        console.log(req.body);
        return res.status(200).send('OK');;
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});


router.put('/radarr', (req, res) => {
    try {
        console.log(req.body);
        return res.status(200);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/plex', (req, res) => {
    try {
        console.log(req.body);
        return res.status(200);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.put('/plex', (req, res) => {
    try {
        console.log(req.body);
        return res.status(200);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/tautulli', (req, res) => {
    try {
        console.log(req.body);
        return res.status(200);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.put('/tautulli', (req, res) => {
    try {
        console.log(req.body);
        return res.status(200);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

module.exports = router;