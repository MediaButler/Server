const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const Movie = require('../model/movie');

const settings = require('../settings.json');
const sonarrService = require('../service/radarrService');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
const radarr = new radarrService(settings.radarr);

// Returns all Shows in Sonarr
router.get('/', async (req, res) => {
    try {
        const r = await sonarr.getMovies();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Returns a specific Show in Sonarr
router.get('/:id', async (req, res) => {

});

// Deletes a specific show in Sonarr
router.delete('/:id', async (req, res) => {

});

// Performs a series lookup for adding
router.get('/:name/lookup', async (req, res) => {
    try {
        const r = await radarr.getMovie({ name: req.params.name })
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    }
    catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    };
});

// Adds a series to Sonarr
router.post('/', (req, res) => {
    const t = req.body;
});

module.exports = router;