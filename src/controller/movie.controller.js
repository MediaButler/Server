const debug = require('debug')('mediabutler:movieController');
const imdb = require('imdb-api');

module.exports = {
	getMovie: async (req, res, next) => {
		const dbg = debug.extend('getMovie');
		try {
			if (!req.query.query) throw new Error('No Query provided');
			if (!req.query.page) req.query.page = 1;
			else req.query.page = parseInt(req.query.page);
			dbg(`Querying Movie ${req.query.query}`);
			const data = await imdb.search({ name: req.query.query, type: 'movie' }, { apiKey: '5af02350' }, req.query.page);
			dbg('Received Data');
			if (data.response) delete data.response;
			if (data.opts) delete data.opts;
			if (data.req) delete data.req;
			data.pageSize = 10;
			if (data.totalresults) { data.totalResults = data.totalresults; delete data.totalresults; }
			dbg('Finished');
			res.status(200).send(data);
		} catch (err) { next(err); }
	},
	getMovieById: async (req, res, next) => {
		const dbg = debug.extend('getMovieById');
		try {
			dbg(`Querying MovieId ${req.params.id}`);
			const data = await imdb.get({ id: req.params.id }, { apiKey: '5af02350' });
			dbg('Finished');
			res.status(200).send(data);
		} catch (err) { next(err); }
	}
}
