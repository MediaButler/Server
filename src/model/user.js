const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
	username: { type: String, required: true },
	owner: { type: Boolean, required: true },
	trakt: {
		access_token: String,
		refresh_token: String,
		expires: Number,
	},
	permissions: [String],
	rules: [String],
	seen_clients: [String],
	blocked_clients: [String],
});
mongoose.model('User', userSchema);
module.exports = mongoose.model('User');
