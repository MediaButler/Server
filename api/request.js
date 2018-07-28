const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const Request = require('../model/request');
const imdb = require('imdb-api');
const TVDB = require('node-tvdb');
const tvdb = new TVDB('88D2ED25A2539ECE');
const isDocker = require('is-docker');
const requestService = require('../service/requestService');
const notificationService = require('../service/notificationService');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

const settingsService = require('./settingsService');
const ss = new settingsService();
const settings = ss.getSettings();


router.get('/', async (req, res) => {
    try {
        const rs = new requestService();
        const r = await rs.getRequests();
        if (!r) return res.status(404).send({ name: 'Not Found', message: 'No Requests to display' });
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const rs = new requestService();
        const r = await rs.getRequest(req.params.id);
        if (!r) return res.status(404).send({ name: 'Not Found', message: 'Request not found' });
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.post('/approve/:id', async (req, res) => {
    const rs = new requestService();
    const approvedList = settings.requests.allowApprove;
    const originalRequest = await rs.getRequest(req.params.id);
    let t = false;
    if (req.user.owner) t = true;

    if (!t) {
        for (let i = 0; i < approvedList.length; i++) {
            if (approvedList[i].username == req.user.username && approvedList[i].types.indexOf(originalRequest.type > -1)) t = true;
        }
    }
    try {
        if (!t) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
        const r = await rs.approveRequest(req.params.id, req.body.overrideProfile, req.body.overrideRoot);
        if (notificationService) notificationService.emit('request',  { who: req.user.username, for: r.username, request: r, title: r.title, type: 'approve' });
        console.log(`${new Date()} ${req.user.username} Request approved ${originalRequest.username}'s request for ${originalRequest.title}`);
        return res.status(200).send(r);
    } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
});

// {
//     type: 'tv/movie/book/music/comic',
//     title: 'Title',
//     tvdbId: '',
//     imdbId: '',
//     musicBrainzId: '',
//     googleBooksId: '',
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
            } catch (err) {
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
            } catch (err) {
                return res.status(400).send({ name: 'Bad Request', message: 'Movie by imdbId does not exist.' });
            }
            break;
        case "book":
            return res.status(500).send({ name: 'Not Implemented', message: 'Request category not implemented yet.' })
            if (t.googleBooksId == '') return res.status(400).send({ name: 'Bad Request', message: 'Book Requests require googleBooksId' });
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
    if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'add' });
    res.status(200).send(r);
    console.log(`${new Date().toTimeString()} ${r.username} added a request for ${r.title}`);
});

router.delete('/:id', async (req, res) => {
    const rs = new requestService();
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    if (!req.body.confirmed) return res.status(400).send({ name: 'Bad Request', message: 'Please confirm deletion' });
    const r = await rs.getRequest(req.params.id);
    if (!r) return res.status(400).send({ name: 'Bad Request', message: 'Request does not exist' });
    const d = await rs.delRequest(req.params.id, true);
    res.status(200).send({ name: 'OK', message: 'Deleted' });
    console.log(`${new Date().toTimeString()} ${req.user.username} deleted request for ${r.title}`);
    if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'delete' });
});

module.exports = router;