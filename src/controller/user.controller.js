const User = require('../model/user');

module.exports = {
	getAllUser: async (req, res, next) => {
		if (!req.user.owner) next(new Error('Unauthorized'));
		const userList = await User.find(null);
		res.send(userList);
	},
	getUser: async (req, res, next) => {
		let t = false;
		if (req.params.username == req.user.username) t = true;
		if (req.params.username == '@me') { req.params.username = req.user.username; t = true; }
		if (req.user.permissions.includes('ADMIN')) t = true;
		if (t) {
			const user = await User.find({ username: req.params.username }).limit(1);
			if (user.length == 0) next(new Error('User does not exist'));
			else res.send(user[0]);
		} else next(new Error('Unauthorized'));
	},
	putUser: async (req, res, next) => {
		User.findOneAndUpdate({ username: req.params.username }, req.body);
	},
	postUser: async (req, res, next) => {

	},
	deleteUser: async (req, res, next) => {

	}
};