const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const isDocker = require('is-docker');
const services = require('../service/services');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
const settings = services.settings;
const plexService = require('../service/plexService');

const sonarr = services.sonarrService;
const tautulli = services.tautulliService;

// Server Library statistics
router.get('/library', async (req, res) => {
    try {
        const r = await sonarr.getMovies();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.get('/nowplaying', async (req, res) => {
    try {
        const r = await tautulli.getNowPlaying();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r.data);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ name: err.name, message: err.message });
    }
});


router.get('/history', async (req, res) => {
    try {
        settings.plex.token = req.user.token;
        const plex = new plexService(settings.plex);
        const r = await plex.getHistory();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r.data);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Watch statistics (top10/homepage)
router.get('/watch', async (req, res) => {
    try {
        const r = await sonarr.getMovies();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// User Statistics over the last month
router.get('/:user', async (req, res) => {
    try {
        const r = await sonarr.getMovies();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// User History
router.get('/:user/history', async (req, res) => {
    try {
        const r = await sonarr.getMovies();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});


module.exports = router;