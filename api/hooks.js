const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var multer = require('multer');
var upload = multer();
const notificationService = require('../service/notificationService');
const tautulliService = require('../service/tautulliService');
const settingsService = require('../service/settingsService');
const ss = new settingsService();
const settings = ss.getSettings();
const tautulli = new tautulliService(settings.tautulli);


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
        if (notificationService) notificationService.emit('movie',  req.body);
        return res.status(200).send('OK');;
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});


router.put('/radarr', (req, res) => {
    try {
        if (notificationService) notificationService.emit('movie',  req.body);
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/plex', upload.single('thumb'), (req, res) => {
    try {
        if (notificationService) notificationService.emit('plex',  JSON.parse(req.body.payload));
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.put('/plex', (req, res) => {
    try {
        if (notificationService) notificationService.emit('plex',  req.body);
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/tautulli', async (req, res) => {
    try {
        // { action: 'resume', session_key: '671', rating_key: '165993' }
        const nowPlaying = await tautulli.getNowPlaying();
        const sessionMap = Array(nowPlaying.data.sessions.length)
        nowPlaying.data.sessions.map((x) => { sessionMap[x.session_key] = x; });
        const action = req.body.action;
        const data = sessionMap[req.body.session_key];
        const result = { action, data };
        if (notificationService) notificationService.emit('tautulli', result);
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.put('/tautulli', (req, res) => {
    try {
        if (notificationService) notificationService.emit('tautulli',  req.body);
        return res.status(200).send('OK');
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

module.exports = router;