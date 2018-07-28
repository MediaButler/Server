const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const TVShow = require('../model/tvshow');

const settings = require('../settings.json');
const sonarrService = require('../service/sonarrService');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// GET - Retrieve TV Show information
// POST - Adds TV Show
// PUT - ???
// DELETE - Delete's TV Show

const sonarr = new sonarrService(settings.sonarr);

// Returns all Shows in Sonarr
router.get('/', async (req, res) => {
    try {
        const r = await sonarr.getShows();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Returns a specific Show in Sonarr
router.get('/:id', async (req, res) => {
    try {
        const r = await sonarr.getShow(req.params.id);
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Deletes a specific show in Sonarr
router.delete('/:id', async (req, res) => {

});

// Performs a series lookup for adding
router.get('/:name/lookup', async (req, res) => {
    try {
        const r = await sonarr.lookupShow({ name: req.params.name })
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    }
    catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    };
});

// Download Queue
router.get('/queue', async (req, res) => {
    try {
        const r = await sonarr.getQueue();
        if (!r) throw new Error('No Results Found');
        res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

// Adds a series to Sonarr
router.post('/', (req, res) => {
    const t = req.body;
});



module.exports = router;