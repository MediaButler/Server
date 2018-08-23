const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const services = require('../service/services');
//const Movie = require('../model/movie');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Returns all Shows in Radarr
router.get('/', async (req, res) => {
    try {
        const radarrService = services.radarrService;
        const r = await radarrService.getMovies();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
});

// Returns a specific Show in Radarr
router.get('/:id', async (req, res) => {

});

// Deletes a specific show in Radarr
router.delete('/:id', async (req, res) => {

});

// Performs a movie lookup for adding
router.get('/:name/lookup', async (req, res) => {
    try {
        const radarrService = services.radarrService;
        const r = await radarrService.getMovie({ name: req.params.name })
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    }
    catch (err) { return res.status(500).send({ name: err.name, message: err.message }); };
});

// Adds a series to Radarr
router.post('/', (req, res) => {
    const t = req.body;
});

module.exports = router;