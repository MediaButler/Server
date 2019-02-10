const imdb = require('imdb-api');

module.exports = {
	getMovie: async (req, res, next) => {
		try {
			if (!req.query.query) throw new Error('No Query provided');
			if (!req.query.page) req.query.page = 1;
			else req.query.page = parseInt(req.query.page);
			const data = await imdb.search({ name: req.query.query, type: 'movie' }, { apiKey: '5af02350' }, req.query.page);
			if (data.response) delete data.response;
			if (data.opts) delete data.opts;
			if (data.req) delete data.req;
			data.pageSize = 10;
			if (data.totalresults) { data.totalResults = data.totalresults; delete data.totalresults; }
			res.status(200).send(data);
		} catch (err) { next(err); }
	},
	getMovieById: async (req, res, next) => {
		try {
			const data = await imdb.get({ id: req.params.id }, { apiKey: '5af02350' });
			res.status(200).send(data);
		} catch (err) { next(err); }
	}
}
