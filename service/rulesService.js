const fs = require('fs');
const Rule = require('../model/rule');
const services = require('./services');

module.exports = class rulesService {
    constructor() {
        this._rules = new Map();
        // Load rules
    }

    async _load() {
        // read dir for files
        // instanciate objects
        // save into map

        fs.readdir('../rules', async (rules) => {
            rules.foreach(async (rule) => {
                if (rule == 'base.js') return;
                const rule_load = require(`../rules/${rule}`);

                this._rules.set(rule_load.id, rule_load);
            });
        });

    }

    async addRule(username, ruleId, argument) {
        const rule = await this._rules.get(ruleId);
        let newRule = new Rule({ username, ruleId, argument });
        newRule.save();
        return newRule;
    }

    async deleteRule(username, ruleId) {

    }

    async getRules(username) {
        return await Rule.find({ username });
    }

    async validate(stream) {
        const ruleSet = await getRules(stream.username);
        let shouldKillStream = false;
        let killStreamReason = false;
        foreach (rule in ruleSet) {
            const r = this._rules.get(rule.ruleId);
            if (r.validate(stream, rule.argument)) {
                shouldKillStream = true;
                killStreamReason = r.info.reason;
            }
        }
        if (shouldKillStream && killStreamReason) {
            // Kill stream with reason
        }
    }
}