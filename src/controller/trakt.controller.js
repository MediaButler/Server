const debug = require('debug')('mediabutler:traktController')
const Trakt = require('trakt.tv');
const User = require('../model/user');
const notificationService = require('../service/notification.service');

const traktSettings = {
	client_id: 'fac3770f1886212d1af54d6d4239258e5636cd3db052caeef3f45642ffd82729',
	client_secret: '54cf5770fe1075a4413fbd018909901731e7585c2044ea5c78ebf3329f03c66a',
	redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
	api_url: 'https://api.trakt.tv',
	useragent: 'MediaButler/1.0',
	pagination: false,
	plugins: {
		cached: require('trakt.tv-cached')
	},
	options: {
		cached: {
			storageOptions: { table: 'trakt' },
			defaultTTL: 3600
		}
	}
};

let trakt = new Trakt(traktSettings);

try {
	notificationService.on('tautulli', async (data) => {
		const user = await User.findOne({ username: data.username }).exec();
		if (!user || !user.trakt || !user.trakt.access_token) return;

		const trakt = new Trakt(traktSettings);
		const i = await trakt.import_token(user.trakt);
		let search = false;
		switch (data.media_type) {
		case 'episode':
			const i = await trakt.search.id({ id_type: 'tvdb', id: data.thetvdb_id });
			search = await trakt.episodes.summary({ id: i[0].show.ids.trakt, season: data.season_num, episode: data.episode_num });
			break;
		case 'movie':
			search = await trakt.search.id({ id_type: 'imdb', id: data.imdb_id });
			search = search[0];
			break;
		default:
			return;
		}

		const scrobbleData = { progress: data.progress_percent };
		if (data.media_type == 'episode') scrobbleData['episode'] = search;
		if (data.media_type == 'movie') scrobbleData['movie'] = search;

		switch (data.action) {
		case 'play':
			trakt.scrobble.start(scrobbleData);
			debug(`${user.username} play`)
			break;
		case 'pause':
			trakt.scrobble.pause(scrobbleData);
			debug(`${user.username} pause`)
			break;
		case 'resume':
			trakt.scrobble.start(scrobbleData);
			debug(`${user.username} resume`)
			break;
		case 'stop':
			trakt.scrobble.stop(scrobbleData);
			debug(`${user.username} stop`)
			break;
		default:
			return;
		}
	});
} catch (err) { debug(err); console.error(err); }

module.exports = {
	getUrl: async (req, res, next) => {
		try {
			const url = trakt.get_url();
			res.status(200).send({ url });
		} catch (err) { next(err); }
	},
	authenticate: async (req, res, next) => {
		try {
			await trakt.exchange_code(req.body.code, null);
			const traktToken = await trakt.export_token();
			req.user.trakt = traktToken;
			trakt = new Trakt(traktSettings);
			await req.user.save();
			res.status(200).send({ name: 'OK', message: 'Saved' });
		} catch (err) { next(err); }
	}
};