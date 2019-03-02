const plexService = require('../service/plex.service');
const settingsService = require('../service/settings.service');
const settings = settingsService.getSettings('plex');

const _processHistory = async (plexService, data) => {
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
};

const asyncForEach = async (array, callback) => {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
};

module.exports = {
	getAudioByKey: async (req, res, next) => {
		try {
			settings.token = req.user.token;
			const plex = new plexService(settings);
			const p = await plex.getMetadata(req.params.ratingKey);
			const a = await plex.getPart(p.MediaContainer.Metadata[0].Media[0].Part[0].key);
			if (a) res.status(200).send(a);
			else res.status(404).send();
		} catch (err) { next(err); }
	},
	getImageByKey: async (req, res, next) => {
		try {
			settings.token = req.user.token;
			const plex = new plexService(settings);
			const p = await plex.getMetadata(req.params.ratingKey);
			const a = await plex.getPart(p.MediaContainer.Metadata[0].thumb);
			if (a) res.status(200).send(a);
			else res.status(404).send();
		} catch (err) { next(err); }
	},
	searchAudio: async (req, res, next) => {
		try {
			console.log('hello');
			settings.token = req.user.token;
			const plex = new plexService(settings);
			const p = await plex.searchAudioLibraries(req.query.query);
			const r = [];
			if (Boolean(p.MediaContainer.Metadata)) {
				p.MediaContainer.Metadata.forEach((item) => {
					const a = {
						artist: item.grandparentTitle,
						title: item.title,
						url: `/plex/audio/${item.ratingKey}`,
						album: item.parentTitle,
						duration: item.duration,
						image: `/plex/image/${item.ratingKey}`,
						year: item.year,
					};
					r.push(a);
				});
				res.status(200).send(r);
			} else res.status(404).send();
		} catch (err) { next(err); }
	},
	search: async (req, res, next) => {
		try {
			console.log(req.user);
			settings.token = req.user.token;
			const plex = new plexService(settings);
			const p = await plex.searchLibraries(req.query.query);
			console.log(p);
		} catch (err) { next(err); }
	},
	getHistory: async (req, res, next) => {
		try {
			settings.token = req.user.token;
			const plex = new plexService(settings);
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
		} catch (err) { next(err); }
	},
	postHistory: async (req, res, next) => {
		try {
			settings.token = req.user.token;
			const plex = new plexService(settings);
			_processHistory(plex, req.body);
			res.status(200).send({ name: 'OK', message: 'Process started. This may take a while.' });
		} catch (err) { next(err); }
	}
};
