const mongoose = require('mongoose');
const RuleSchema = new mongoose.Schema({

	ruleId: { type: String, required: true },
	name: { type: String, required: true },
	condition: { type: String, required: true },
	defaultArgument: String,
	reason: { type: String, required: true }

});
mongoose.model('Rule', RuleSchema);
module.exports = mongoose.model('Rule');