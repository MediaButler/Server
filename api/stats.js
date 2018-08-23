const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const isDocker = require('is-docker');
const services = require('../service/services');
router.use(bodyParser.json({ limit: "50mb" }));
router.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
const settings = services.settings;
const plexService = require('../service/plexService');

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

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
        const tautulli = services.tautulliService;
        const r = await tautulli.getNowPlaying();
        if (!r) throw new Error('No Results Found');
        r.data.stream_count = parseInt(r.data.stream_count);
        res.status(200).send(r.data);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ name: err.name, message: err.message });
    }
});

router.get('/history', async (req, res) => {
    try {
        const settings = services.settings;
        settings.plex.token = req.user.token;
        const plex = new plexService(settings.plex);
        const r = await plex.getHistory();
        if (!r) throw new Error('No Results Found');
        const result = { video: [], audio: [] };
        r.MediaContainer.Video.forEach((video) => {
            if (video.User.title == req.user.username) {
                if (video.type == 'episode') {
                    const t = { showName: video.grandparentTitle, episodeTitle: video.title, type: video.type, episodeNumber: video.index, seasonNumber: video.parentIndex, viewedAt: video.viewedAt, user: video.User.title };
                    result.video.push(t);
                }
                if (video.type == 'movie') {
                    const t = { title: video.title, type: video.type, viewedAt: video.viewedAt, user: video.User.title };
                    result.video.push(t);
                }
            }
        });
        r.MediaContainer.Track.forEach((song) => {
            if (song.User.title == req.user.username) {
                const t = { title: song.title, artist: song.grandparentTitle, album: song.parentTitle, user: song.User.title };
                result.audio.push(t);
            }
        });
        result.count_video = result.video.length;
        result.count_audio = result.audio.length;
        res.status(200).send(result);
    } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
});

const processHistory = async (plexService, data) => {
    if (Array.isArray(data.video)) {
        asyncForEach(data.video, async (video) => {
            let t;
            if (video.type == 'episode') {
                t = await plexService.searchLibraries(video.showName);
                const episodes = await plexService.getDirectory(t.MediaContainer.Metadata[0].ratingKey);
                if (Array.isArray(episodes.MediaContainer.Metadata)) {
                    asyncForEach(episodes.MediaContainer.Metadata, async (ep) => {
                        if (ep.grandparentTitle == video.showName) {
                            if (ep.parentIndex == video.seasonNumber) {
                                if (ep.index == video.episodeNumber) {
                                    console.log(ep.ratingKey);
                                    console.log(`${video.showName} - S${video.seasonNumber}E${video.episodeNumber} - To be marked as watched`);
                                }
                            }
                        }
                    });
                }
                //if (video.type == 'movie') t = await plex.searchLibraries(video.title);
                //console.log(t.MediaContainer);
            }
        });
    }
}

router.post('/history', async (req, res) => {
    try {
        const settings = services.settings;
        settings.plex.token = req.user.token;
        const plex = new plexService(settings.plex);
        processHistory(plex, req.body);
        return res.status(200).send({ name: 'OK', message: 'Process started. This may take a while.' });
    } catch (err) { return res.status(500).send({ name: err.name, message: err.message }); }
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