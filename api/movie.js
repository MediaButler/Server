const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const services = require('../service/services');
//const Movie = require('../model/movie');
const radarrService = services.radarrService;

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Returns all Shows in Sonarr
router.get('/', async (req, res) => {
    try {
        const r = await radarrService.getMovies();
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
        const r = await radarrService.getMovie({ name: req.params.name })
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