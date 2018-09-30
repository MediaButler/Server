const fs = require('fs');
const Rule = require('../model/rule');
const path = require('path');
const services = require('./services');
const rules = new Map();

module.exports = class rulesService {
    constructor() {
        this._load();
    }

    async _load() {
        const dir = await fs.readdirSync(path.join(__dirname, '../', 'rules'));
        dir.forEach(element => {
            if (element == 'base.js') return;
            const rule_load = require(path.join(__dirname, '../', 'rules', element));
            const rule = new rule_load();
            rules.set(`${rule.info.id}`, rule);
        });
    }

    async addRule(username, ruleId, argument) {
        const rule = await rules.get(ruleId);
        let newRule = new Rule({ username, ruleId, argument });
        newRule.save();
        return newRule;
    }

    async deleteRule(username, ruleId) {
        return await Rule.deleteOne({ username, ruleId }).exec();
    }

    getAllRules() {
        const allRules = new Array();
        Array.from(rules.values()).forEach((x) => { allRules.push(x.info); });
        return allRules;
    }

    async getRules(username) {
        return await Rule.find({ username });
    }

    async validate(stream) {
        const ruleSet = await this.getRules(stream.username);
        let shouldKillStream = false;
        let killStreamReason = false;
        ruleSet.forEach((rule) => {
            const r = rules.get(rule.ruleId);
            if (r.validate(stream, rule.argument)) {
                shouldKillStream = true;
                killStreamReason = r.info.reason;
            }
        });
        if (shouldKillStream && killStreamReason) {
            console.log(`Should kill stream with reason: ${killStreamReason}`);
            // Kill stream with reason
        }
    }
}