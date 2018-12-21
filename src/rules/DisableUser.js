const baseRule = require('./base');

module.exports = class disableUserRule extends baseRule {
	constructor() {
		const info = {
			id: '5771bac5-9530-4aea-804c-0b13e088722e',
			name: 'DisableUser',
			description: 'Disables an account so they cannot play anything',
			reason: 'Disabled. Please try again later.'
		};
		super(info);
	}

	// Returns a boolean value.
	validate(stream) {
		return true;
	}
};