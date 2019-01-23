const TVDB = require('node-tvdb');

const iterator = (a, n) => {
	let current = 0, l = a.length;
	return () => {
		let end = current + n;
		const part = a.slice(current, end);
		current = end < l ? end : 0;
		return part;
	};
};

module.exports = {
	getShow: async (req, res, next) => {
		try {
			if (!req.query.query) throw new Error('No Query provided');
			const tvdb = new TVDB('88D2ED25A2539ECE');
			const data = await tvdb.getSeriesByName(req.query.query);
			if (!req.query.page) req.query.page = 1;
			else req.query.page = parseInt(req.query.page);
			if (!req.query.pageSize) req.query.pageSize = 10;
			else req.query.pageSize = parseInt(req.query.pageSize);
			const iterate = iterator(data, req.query.pageSize);
			let result = [];
			for (let i = 0; i < req.query.page; i++) {
				result = iterate();
			}
			const output = {
				totalResults: data.length,
				page: req.query.page,
				pageSize: req.query.pageSize,
				results: result,
			};
			res.status(200).send(output);
			next();
		} catch (err) { next(err); }
	},
	getShowById: async (req, res, next) => {
		try {
			const tvdb = new TVDB('88D2ED25A2539ECE');
			const data = await tvdb.getSeriesById(req.params.id);
			res.status(200).send(data);
			next();
		} catch (err) { next(err); }
	},
	getActorsById: async (req, res, next) => {
		try {
			const tvdb = new TVDB('88D2ED25A2539ECE');
			const data = await tvdb.getActors(req.params.id);
			res.status(200).send(data);
			next();
		} catch (err) { next(err); }
	},
	getEpisodesById: async (req, res, next) => {
		try {
			const tvdb = new TVDB('88D2ED25A2539ECE');
			const data = await tvdb.getEpisodesBySeriesId(req.params.id);
			res.status(200).send(data);
			next();
		} catch (err) { next(err); }
	},
	getImagesById: async (req, res, next) => {
		try {
			const tvdb = new TVDB('88D2ED25A2539ECE');
			const data = await tvdb.getSeriesPosters(req.params.id);
			res.status(200).send(data);
			next();
		} catch (err) { next(err); }
	}
};
