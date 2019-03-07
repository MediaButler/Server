const debug = require('debug')('mediabutler:rulesController');
const rulesService = require('../service/rules.service');
const service = new rulesService();

try {
	// Do startup options
} catch (err) { }

module.exports = {
	getRules: async (req, res, next) => {
		const dbg = debug.extend('getRules');
		try {
			dbg('Checking user permissions');
			if (!req.user.permissions.includes('ADMIN') && !req.user.permissions.includes('RULE_EDIT')) return next(new Error('Unauthorized'));
			dbg('Getting Rules');
			const rules = await service.getAllRules();
			dbg('Finished');
			res.send(rules);
		} catch (err) { dbg(err); next(err); }
	},
	postRules: async (req, res, next) => {
		const dbg = debug.extend('postRules');
		try {
			dbg('Checking user permissions');
			if (!req.user.permissions.includes('ADMIN') && !req.user.permissions.includes('RULE_EDIT')) return next(new Error('Unauthorized'));
			const { ruleId, username } = req.body;
			dbg('Adding Rule');
			const user = await service.addRule(username, ruleId);
			dbg('Finished');
			res.send(user.rules);
		} catch (err) { dbg(err); next(err); }
	},
	putRules: async (req, res, next) => {
		// update rule
	},
	deleteRules: async (req, res, next) => {
		// delete rule
	},
	getRuleUser: async (req, res, next) => {
		// get rules applied to user
	},
	postRuleUser: async (req, res, next) => {
		// apply rule to user
	},
	putRuleUser: async (req, res, next) => {
		// modify fule for user
	},
	deleteRuleUser: async (req, res, next) => {

	}
};