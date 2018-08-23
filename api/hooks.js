const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var multer = require('multer');
var upload = multer();
const notificationService = require('../service/notificationService');
const services = require('../service/services');

let previousPlaying = false;

router.post('/sonarr', (req, res) => {
    try {
        if (notificationService) notificationService.emit('tvshow', req.body);
        return res.status(200).send('OK');;
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/radarr', (req, res) => {
    try {
        if (notificationService) notificationService.emit('movie', req.body);
        return res.status(200).send('OK');;
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/plex', upload.single('thumb'), (req, res) => {
    try {
        if (notificationService) notificationService.emit('plex', JSON.parse(req.body.payload));
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.put('/plex', (req, res) => {
    try {
        if (notificationService) notificationService.emit('plex', req.body);
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

module.exports = router;