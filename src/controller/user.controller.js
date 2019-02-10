const User = require('../model/user');

module.exports = {
	getAllUser: async (req, res, next) => {
		try {
			if (!req.user.permissions.includes('ADMIN')) next(new Error('Unauthorized'));
			const userList = await User.find(null);
			res.send(userList);
		} catch (err) { next(err); }
	},
	getMyUser: async (req, res, next) => {
		try {
			const user = await User.find({ username: req.user.username }).limit(1);
			if (user.length == 0) next(new Error('User does not exist'));
			else res.send(user[0]);
		} catch (err) { next(err); }
	},
	getUser: async (req, res, next) => {
		try {
			let t = false;
			if (req.params.username == req.user.username) t = true;
			if (req.params.username == '@me' || req.params.username == '@me?') { req.params.username = req.user.username; t = true; }
			if (req.user.permissions.includes('ADMIN')) t = true;
			if (t) {
				const user = await User.find({ username: req.params.username }).limit(1);
				if (user.length == 0) next(new Error('User does not exist'));
				else res.send(user[0]);
			} else next(new Error('Unauthorized'));
		} catch (err) { next(err); }
	},
	putUser: async (req, res, next) => {
		try {
			let t = false;
			if (req.params.username == req.user.username) t = true;
			if (req.params.username == '@me') { req.params.username = req.user.username; t = true; }
			if (req.user.permissions.includes('ADMIN')) t = true;
			if (t) {
				await User.findOneAndUpdate({ username: req.params.username }, req.body);
				const user = await User.find({ username: req.params.username }).limit(1);
				res.send(user[0]);
			} else next(new Error('Unauthorized'));
		} catch (err) { next(err); }
	},
	deleteUser: async (req, res, next) => {
		try {

		} catch (err) { next(err); }
	}
};