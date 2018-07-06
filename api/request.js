const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const Request = require('../model/request');
const imdb = require('imdb-api');
const TVDB = require('node-tvdb');
const tvdb = new TVDB('88D2ED25A2539ECE');
const settings = require('../settings.json');
const radarrService = require('../service/radarrService');
const sonarrService = require('../service/sonarrService');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/', async (req, res) => {
    try {
        Request.find({}, function (err, requests) {
            if (err) return res.status(400).send({ name: 'Bad Request', message: 'No Requests to display' });
            res.status(200).send(requests);
        });
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        Request.findById(req.params.id, function (err, request) {
            if (err) return res.status(400).send({ name: 'Bad Request', message: 'Request does not exist' });
            res.status(200).send(request);
        });
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/approve/:id', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    Request.findById(req.params.id, function (err, request) {
        if (err) return res.status(400).send({ name: 'Bad Request', message: 'Request does not exist' });

        switch (request.type) {
            case "movie":
                const rs = new radarrService(settings.radarr);
                const mv = {
                    imdbId: request.imdbId,
                    profile: (req.body.overrideProfile) ? req.body.overrideProfile : settings.radarr.defaultProfile,
                    rootpath: (req.body.overrideRoot) ? req.body.overrideRoot : settings.radarr.defaultRoot
                };
                rs.addMovie(mv);
                request.status = 1;
            break;
            case "tv":
                const ss = new sonarrService(settings.sonarr);
                const show = {
                    tvdbId: request.tvdbId,
                    profile: (req.body.overrideProfile) ? req.body.overrideProfile : settings.radarr.defaultProfile,
                    rootpath: (req.body.overrideRoot) ? req.body.overrideRoot : settings.radarr.defaultRoot
                };
                ss.addShow(show);
                request.status = 1;
            break;
            default:
                return res.status(400).send({ name: 'Bad Request', message: 'Could not determine type'});
            break;
        }

        request.save();
        res.status(200).send(request);
        console.log(`${new Date()} Request approved for ${request.title}`);
    });
});

// {
//     type: 'tv/movie/book/music/comic',
//     title: 'Title',
//     tvdbId: '',
//     imdbId: '',
//     musicBrainzId: '',
//     goodReadsId: '',
//     comicVineId: '',
// }
router.post('/', async (req, res) => {
    const t = req.body;
    let r;
    switch (t.type) {
        case "tv":
            if (t.tvdbId == '') return res.status(400).send({ name: 'Bad Request', message: 'TV Requests require tvdbId' });
            try {
                const tvdbGet = await tvdb.getSeriesById(t.tvdbId);
                if (tvdbGet.seriesName != t.title) return res.status(400).send({ name: 'Bad Request', message: 'Show title does not match ID' });
                const aa = await Request.find({ tvdbId: t.tvdbId }).exec();
                if (aa.length > 0) return res.status(400).send({ name: 'Bad Request', message: 'Request already exists' });
            } catch {
                return res.status(400).send({ name: 'Bad Request', message: 'Movie by imdbId does not exist.' });
            }
            break;
        case "movie":
            if (t.imdbId == '') return res.status(400).send({ name: 'Bad Request', message: 'Movie Requests require imdbId' });
            try {
                const imdbGet = await imdb.get({ id: t.imdbId }, { apiKey: '5af02350' });
                if (imdbGet.title != t.title) return res.status(400).send({ name: 'Bad Request', message: 'Movie title does not match ID' });
                const aa = await Request.find({ imdbId: t.imdbId }).exec();
                if (aa.length > 0) return res.status(400).send({ name: 'Bad Request', message: 'Request already exists' });
            } catch {
                return res.status(400).send({ name: 'Bad Request', message: 'Movie by imdbId does not exist.' });
            }
            break;
        case "book":
            return res.status(500).send({ name: 'Not Implemented', message: 'Request category not implemented yet.' })
            if (t.goodReadsId == '') return res.status(400).send({ name: 'Bad Request', message: 'Book Requests require goodReadsId' });
            break;
        case "music":
            return res.status(500).send({ name: 'Not Implemented', message: 'Request category not implemented yet.' })
            if (t.musicBrainzId == '') return res.status(400).send({ name: 'Bad Request', message: 'Music Requests require musicBrainzId' });
            break;
        case "comic":
            return res.status(500).send({ name: 'Not Implemented', message: 'Request category not implemented yet.' })
            if (t.comicVineId == '') return res.status(400).send({ name: 'Bad Request', message: 'Comic Requests require comicVineId' });
            break;
        default:
            return res.status(400).send({ name: 'Bad Request', message: 'Could not determine request type' });
            break;
    }

    r = new Request(t);
    r.dateAdded = Date.now();
    r.username = req.user.username;
    r.status = 0;
    r.save();
    res.status(200).send(r);
    console.log(`${new Date().toTimeString()} ${r.username} added a request for ${r.title}`);
});

router.delete('/:id', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    if (!req.body.confirmed) return res.status(400).send({ name: 'Bad Request', message: 'Please confirm deletion' });
    const r = Request.findById(req.params.id).exec();
    if (!r) return res.status(400).send({ name: 'Bad Request', message: 'Request does not exist' });
    Request.deleteOne({ '_id': req.params.id }).exec();
    res.status(200).send({ name: 'OK', message: 'Deleted' });
    console.log(`${new Date().toTimeString()} deleted request for ${r.title}`)
});

module.exports = router;