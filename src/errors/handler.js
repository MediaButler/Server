module.exports = (err, req, res, next) => {
	console.error(err);
	return res.status(500).send({ name: err.name, message: err.message });
};