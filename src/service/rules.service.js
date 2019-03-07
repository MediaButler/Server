const debug = require('debug')('mediabutler:rulesService');
const Rule = require('../model/rule');
const User = require('../model/user');
const notificationService = require('./notification.service');

module.exports = class rulesService {
	constructor() {
		debug('Starting up');
		this._load();
	}

	async _load() {
		debug('Getting all rules');
		const allRules = await Rule.find({}).exec();
		if (allRules.length == 0) {
			const rules = [
				{ ruleId: 'b50441b5-04af-4f8c-ad4d-1f86f7c64c7d', name: 'NoTranscode', condition: 'stream.stream_container_decision == \'transcode\'', reason: 'No Video Transcodes allowed' },
				{ ruleId: '5771bac5-9530-4aea-804c-0b13e088722e', name: 'DisableUser', condition: 'true', reason: 'Disabled. Please try again later.' }
			];
			rules.forEach((rule) => {
				const newRule = new Rule(rule);
				newRule.save();
			});
		}

		debug('Settup up listener on tautulli notifications');
		notificationService.on('tautulli', (stream) => {
			if (stream.action == 'play') this.validate(stream);
		});
	}

	async addRule(username, ruleId) {
		const dbg = debug.extend('addRule');
		try {
			dbg('Getting rule');
			const rule = await this.getRule(ruleId);

			dbg('Getting user');
			const user = await User.findOne({ username }).exec();
			if (Boolean(rule)) {
				if (Boolean(user)) {
					if (!user.rules.includes(ruleId)) {
						dbg('Adding rule');
						user.rules.push(`${ruleId}`);
						user.save();
						return user;
					} else throw new Error('User already has this rule');
				} else throw new Error('User not Found');
			} else throw new Error('Rule not Found');
		} catch (err) { dbg(err); throw err; }
	}

	async deleteRule(username, ruleId) {
		const dbg = debug.extend('deleteRule');
		try {
			dbg('Deleting rule');
			return await Rule.deleteOne({ username, ruleId }).exec();
		} catch (err) { dbg(err); throw err; }
	}

	async getRule(ruleId) {
		const dbg = debug.extend('getRule');
		try {
			dbg('Getting rule');
			const rule = await Rule.findOne({ ruleId }).exec();
			return rule;
		} catch (err) { dbg(err); throw err; }
	}

	async getAllRules() {
		const dbg = debug.extend('getAllRules');
		try {
			dbg('Getting all rules');
			const rules = await Rule.find({}).exec();
			return rules;
		} catch (err) { dbg(err); throw err; }
	}

	async validate(stream) {
		const dbg = debug.extend('validate');
		try {
			dbg('Getting user');
			const user = await User.findOne({ username: stream.username }).exec();
			let shouldKillStream = false;
			let killStreamReason = false;

			dbg('Checking user rules');
			if (user && user.rules.length > 0) {
				for (let i = 0; i < user.rules.length; i++) {
					dbg('Getting specific rule');
					const rule = await Rule.findOne({ ruleId: user.rules[i] }).exec();
					const condition = eval(`${rule.condition}`);
					if (condition) {
						shouldKillStream = true;
						killStreamReason = rule.reason;
					}
				}
				if (shouldKillStream && killStreamReason) {
					dbg('Kill stream');
					console.log(`Should kill stream with reason: ${killStreamReason}`);
					// Kill stream with reason
				}
			}
		} catch (err) { dbg(err); throw err; }
	}
};