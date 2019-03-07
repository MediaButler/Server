// Sends and receives notifictions
// Only one exists
const debug = require('debug')('mediabutler:notificationService');
let constant = null;
const userSockets = {};
const otherSockets = {};
module.exports = class notifictionService {
	static get agent() {
		return constant;
	}

	static get sockets() {
		return userSockets;
	}

	static set agent(value) {
		constant = value;
	}

	static on(area, callback) {
		debug('Adding callback');
		if (!otherSockets[area]) otherSockets[area] = [];
		otherSockets[area].push(callback);
	}

	static emit(area, msg) {
		debug('Sending notification');
		constant.emit(area, msg);
		if (otherSockets[area]) otherSockets[area].forEach(callback => {
			callback(msg);
		});
		return;
	}
};