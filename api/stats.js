const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const isDocker = require('is-docker');
const tautulliService = require('../service/tautulliService');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

let settings;
if (isDocker()) {
    try {
        settings = require('/config/settings.json');
    } catch (err) {
        throw err;
    }
} else {
    try {
        settings = require('../settings.json');
    } catch (err) {
        throw err;
    }
}

const tautulli = new tautulliService(settings.tautulli);

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