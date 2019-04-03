const debug = require('debug')('mediabutler:userController')
const User = require('../model/user');

module.exports = {
	getAllUser: async (req, res, next) => {
		const dbg = debug.extend('getAllUser');
		try {
			dbg('Checking user permissions');
			if (!req.user.permissions.includes('ADMIN')) next(new Error('Unauthorized'));
			const userList = await User.find(null);
			dbg('Finished');
			res.send(userList);
		} catch (err) { next(err); }
	},
	getMyUser: async (req, res, next) => {
		const dbg = debug.extend('getMyUser');
		try {
			dbg('Sending user');
			res.send(req.user);
		} catch (err) { dbg(err); next(err); }
	},
	getUser: async (req, res, next) => {
		const dbg = debug.extend('getUser');
		try {
			dbg('Checking user permissions');
			let t = false;
			if (req.params.username == req.user.username) t = true;
			if (req.params.username == '@me' || req.params.username == '@me?') { req.params.username = req.user.username; t = true; }
			if (req.user.permissions.includes('ADMIN')) t = true;
			if (t) {
				dbg('Getting User');
				const user = await User.find({ username: req.params.username }).limit(1);
				dbg('Sending user');
				if (user.length == 0) next(new Error('User does not exist'));
				else res.send(user[0]);
			} else next(new Error('Unauthorized'));
		} catch (err) { dbg(err); next(err); }
	},
	putUser: async (req, res, next) => {
		const dbg = debug.extend('putUser');
		try {
			dbg('Checking user permissions');
			let t = false;
			if (req.params.username == req.user.username) t = true;
			if (req.params.username == '@me') { req.params.username = req.user.username; t = true; }
			if (req.user.permissions.includes('ADMIN')) t = true;
			if (t) {
				dbg('Updating User');
				await User.findOneAndUpdate({ username: req.params.username }, req.body);
				const user = await User.find({ username: req.params.username }).limit(1);
				dbg('Finished');
				res.send(user[0]);
			} else next(new Error('Unauthorized'));
		} catch (err) { next(err); }
	},
	deleteUser: async (req, res, next) => {
		const dbg = debug.extend('deleteUser');
		try {
			if (!req.user.permissions.includes('ADMIN')) next(new Error('Unauthorized'));
			await User.findOneAndDelete({ username: req.params.username });
			res.status(200).send({ name: 'OK', message: 'The User was deleted' });
		} catch (err) { dbg(err); next(err); }
	}
};