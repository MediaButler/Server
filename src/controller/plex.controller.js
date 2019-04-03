const debug = require('debug')('mediabutler:plexController');
const plexService = require('../service/plex.service');
const settingsService = require('../service/settings.service');
const settings = settingsService.getSettings('plex');

const _processHistory = async (service, data) => {
	const dbg = debug.extend('processHistory');
	if (Array.isArray(data.video)) {
		dbg('Data provided is an array of videos');
		asyncForEach(data.video, async (video) => {
			let t;
			if (video.type == 'episode') {
				dbg('Video is an episode');
				t = await service.searchLibraries(video.showName);
				const episodes = await service.getDirectory(t.MediaContainer.Metadata[0].ratingKey);
				dbg('Have episode information');
				if (Array.isArray(episodes.MediaContainer.Metadata)) {
					dbg('Episdode information looks appears intact');
					asyncForEach(episodes.MediaContainer.Metadata, async (ep) => {
						dbg('Verifying episode match');
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
		const dbg = debug.extend('getAudioByKey');
		try {
			const p = await req.plex.getMetadata(req.params.ratingKey);
			dbg(`Got Metadata for ${req.params.ratingKey}`);
			const a = await req.plex.getPart(p.MediaContainer.Metadata[0].Media[0].Part[0].key);
			dbg('Got Audio out of Metadata.. Finished');
			if (a) res.status(200).send(a);
			else res.status(404).send();
		} catch (err) { dbg(err); next(err); }
	},
	getImageByKey: async (req, res, next) => {
		const dbg = debug.extend('getImageByKey');
		try {
			const p = await req.plex.getMetadata(req.params.ratingKey);
			dbg(`Got Metadata for ${req.params.ratingKey}`);
			const a = await req.plex.getPart(p.MediaContainer.Metadata[0].thumb);
			dbg('Got Thumbnail out of Metadata.. Finished');
			if (a) res.status(200).send(a);
			else res.status(404).send();
		} catch (err) { dbg(err); next(err); }
	},
	searchAudio: async (req, res, next) => {
		const dbg = debug.extend('searchAudio');
		try {
			const p = await req.plex.searchAudioLibraries(req.query.query);
			dbg('Performed Search');
			const r = [];
			if (p.MediaContainer.Metadata) {
				dbg('Has reults');
				p.MediaContainer.Metadata.forEach((item) => {
					dbg(`Adding ${item.grandparentTitle} - ${item.title} to output`);
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
				dbg('Finished');
				res.status(200).send(r);
			} else res.status(404).send();
		} catch (err) { dbg(err); next(err); }
	},
	search: async (req, res, next) => {
		const dbg = debug.extend('search');
		try {
			dbg('Command incomplete');
			const p = await req.plex.searchLibraries(req.query.query);
			res.status(200).send(p.MediaContainer);
		} catch (err) { dbg(err); next(err); }
	},
	getHistory: async (req, res, next) => {
		const dbg = debug.extend('getHistory');
		try {
			const r = await req.plex.getHistory();
			dbg('Got History');
			if (!r) throw new Error('No Results Found');
			const result = { video: [], audio: [] };
			dbg('Processing Video');
			r.MediaContainer.Video.forEach((video) => {
				if (video.User.title == req.user.username) {
					if (video.type == 'episode') {
						dbg(`Adding Episode for ${video.grandparentTitle}`);
						const t = { showName: video.grandparentTitle, episodeTitle: video.title, type: video.type, episodeNumber: video.index, seasonNumber: video.parentIndex, viewedAt: video.viewedAt, user: video.User.title };
						result.video.push(t);
					}
					if (video.type == 'movie') {
						dbg(`Adding Movie ${video.title}`);
						const t = { title: video.title, type: video.type, viewedAt: video.viewedAt, user: video.User.title };
						result.video.push(t);
					}
				}
			});
			dbg('Processing Audio');
			r.MediaContainer.Track.forEach((song) => {
				if (song.User.title == req.user.username) {
					dbg(`Adding Song ${song.title} by ${song.grandparentTitle}`);
					const t = { title: song.title, artist: song.grandparentTitle, album: song.parentTitle, user: song.User.title };
					result.audio.push(t);
				}
			});
			result.count_video = result.video.length;
			result.count_audio = result.audio.length;
			dbg('Finished');
			res.status(200).send(result);
		} catch (err) { dbg(err); next(err); }
	},
	postHistory: async (req, res, next) => {
		const dbg = debug.extend('postHistory');
		try {
			_processHistory(req.plex, req.body);
			dbg('Finished');
			res.status(200).send({ name: 'OK', message: 'Process started. This may take a while.' });
		} catch (err) { dbg(err); next(err); }
	}
};
