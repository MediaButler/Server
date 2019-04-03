const mongoose = require('mongoose');
const IssueSchema = new mongoose.Schema({
	key: {
		type: String,
		required: true
	},
	title: {
		type: String,
		required: true
	},
	type: {
		type: Number,
		required: true
	},
	status: {
		type: Number,
		required: true
	},
	comment: {
		type: String
	},
	dateAdded: {
		type: Date,
		default: Date.now()
	},
	username: {
		type: String,
		required: true
	}
});
mongoose.model('Issue', IssueSchema);
module.exports = mongoose.model('Issue');
