const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const Request = require('../model/request');
const imdb = require('imdb-api');
const TVDB = require('node-tvdb');
const tvdb = new TVDB('88D2ED25A2539ECE');
const services = require('../service/services');
const requestService = services.requestService;
const notificationService = require('../service/notificationService');
const settings = services.settings;

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/', async (req, res) => {
    try {
        const rs = services.requestService;
        const r = await rs.getRequests();
        if (!r) return res.status(200).send([]);
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});


router.post('/approve/:id', async (req, res) => {
    const rs = requestService;
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
        console.log(`${new Date()} ${req.user.username} approved ${originalRequest.username}'s request for ${originalRequest.title}`);
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
    const rs = services.requestService;
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    const r = await rs.getRequest(req.params.id);
    if (!r) return res.status(400).send({ name: 'Bad Request', message: 'Request does not exist' });
    const d = await rs.delRequest(req.params.id, true);
    res.status(200).send({ name: 'OK', message: 'Deleted' });
    console.log(`${new Date().toTimeString()} ${req.user.username} deleted request for ${r.title}`);
    if (notificationService) notificationService.emit('request', { who: req.user.username, for: r.username, request: r, title: r.title, type: 'delete' });
});

router.get('/autoapprove', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    return res.status(200).send(settings.requests.autoApprove);
});

router.get('/autoapprove/:username', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    const approveMap = new Array(settings.requests.autoApprove.length);
    settings.requests.autoApprove.map((x) => { approveMap[x.username] = x; });
    if (!approveMap[req.params.user]) res.status(404).send({ name: 'NotFound', message: 'Query returned no results' });
    return res.status(200).send(approveMap[req.params.username]);
});

router.post('/autoapprove', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    const approveMap = new Array(settings.requests.autoApprove.length);
    settings.requests.autoApprove.map((x) => { approveMap[x.username] = x; });
    if (approveMap[req.body.username]) return res.status(400).send({ name: 'Bad Request', message: 'Username already exists' });
    const newAutoApprove = { username: req.body.username, types: req.body.types.split(',') };
    settings.requests.autoApprove.push(newAutoApprove);
    services.settingsService._saveSettings(settings);
    return res.status(200).send(newAutoApprove);
});

router.put('/autoapprove/:username', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    let shouldReplace = true;
    const approveMap = new Array(settings.requests.autoApprove.length);
    settings.requests.autoApprove.map((x) => { approveMap[x.username] = x; });
    const idx = settings.requests.autoApprove.indexOf(approveMap[req.params.username])
    if (!req.body.replace) shouldReplace = false;
    const alltypes = new Array(approveMap[req.body.username].types.length + req.body.types.split(',').length);
    alltypes.push(approveMap[req.params.username].types);
    alltypes.push(req.body.types.split(','));
    if (shouldReplace) {
        const newAutoApprove = { username: req.params.username, types: req.body.types.split(',') };
        settings.requests.autoApprove.splice(idx, 1);
        settings.requests.autoApprove.push(newAutoApprove);
        services.settingsService._saveSettings(settings);
        return res.status(200).send(newAutoApprove);
    } else {
        const newAutoApprove = { username: req.params.username, types: alltypes };
        settings.requests.autoApprove.splice(idx, 1);
        settings.requests.autoApprove.push(newAutoApprove);
        services.settingsService._saveSettings(settings);
        return res.status(200).send(newAutoApprove);
    }
});

router.delete('/autoapprove/:username', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    const approveMap = new Array(settings.requests.autoApprove.length);
    settings.requests.autoApprove.map((x) => { approveMap[x.username] = x; });
    const idx = settings.requests.autoApprove.indexOf(approveMap[req.params.username])
    settings.requests.autoApprove.splice(idx, 1);
    services.settingsService._saveSettings(settings);
    return res.status(200).send({ name: 'OK', message: 'Deleted' });
});

router.get('/allowapprove', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    return res.status(200).send(settings.requests.allowApprove);
});

router.get('/allowapprove/:username', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    const approveMap = new Array(settings.requests.allowApprove.length);
    settings.requests.allowApprove.map((x) => { approveMap[x.username] = x; });
    if (!approveMap[req.params.user]) res.status(404).send({ name: 'NotFound', message: 'Query returned no results' });
    return res.status(200).send(approveMap[req.params.username]);
});

router.post('/allowapprove', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    const approveMap = new Array(settings.requests.allowApprove.length);
    settings.requests.allowApprove.map((x) => { approveMap[x.username] = x; });
    if (approveMap[req.body.username]) return res.status(400).send({ name: 'Bad Request', message: 'Username already exists' });
    const newApprove = { username: req.body.username, types: req.body.types.split(',') };
    settings.requests.allowApprove.push(newApprove);
    services.settingsService._saveSettings(settings);
    return res.status(200).send(newApprove);
});

router.put('/allowapprove/:username', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    let shouldReplace = true;
    const approveMap = new Array(settings.requests.allowApprove.length);
    settings.requests.allowApprove.map((x) => { approveMap[x.username] = x; });
    const idx = settings.requests.allowApprove.indexOf(approveMap[req.params.username])
    if (!req.body.replace) shouldReplace = false;
    const alltypes = new Array(approveMap[req.body.username].types.length + req.body.types.split(',').length);
    alltypes.push(approveMap[req.params.username].types);
    alltypes.push(req.body.types.split(','));
    if (shouldReplace) {
        const newApprove = { username: req.params.username, types: req.body.types.split(',') };
        settings.requests.allowApprove.splice(idx, 1);
        settings.requests.allowApprove.push(newApprove);
        services.settingsService._saveSettings(settings);
        return res.status(200).send(newApprove);
    } else {
        const newApprove = { username: req.params.username, types: alltypes };
        settings.requests.allowApprove.splice(idx, 1);
        settings.requests.allowApprove.push(newApprove);
        services.settingsService._saveSettings(settings);
        return res.status(200).send(newApprove);
    }
});

router.delete('/allowapprove/:username', async (req, res) => {
    if (!req.user.owner) return res.status(401).send({ name: 'Unauthorized', message: 'You are not authorised to perform actions on this endpoint' });
    const approveMap = new Array(settings.requests.allowApprove.length);
    settings.requests.allowApprove.map((x) => { approveMap[x.username] = x; });
    const idx = settings.requests.allowApprove.indexOf(approveMap[req.params.username])
    settings.requests.allowApprove.splice(idx, 1);
    services.settingsService._saveSettings(settings);
    return res.status(200).send({ name: 'OK', message: 'Deleted' });
});

router.get('/:id', async (req, res) => {
    try {
        const rs = requestService;
        const r = await rs.getRequest(req.params.id);
        if (!r) return res.status(404).send({ name: 'Not Found', message: 'Request not found' });
        return res.status(200).send(r);
    } catch (err) {
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

module.exports = router;
