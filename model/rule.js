const mongoose = require('mongoose');
const RuleSchema = new mongoose.Schema({

    username: { type: String, required: true },
    ruleId: { type: String, required: true },
    argument: String

});
mongoose.model('Rule', RuleSchema);
module.exports = mongoose.model('Rule');