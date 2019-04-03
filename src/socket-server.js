const debug = require('debug')('mediabutler:socket-io');
const io = require('socket.io');
const ioJwtAuth = require('socketio-jwt');
const path = require('path');
const fs = require('fs');
const settingsService = require('./service/settings.service');
const plexService = require('./service/plex.service');
const notificationService = require('./service/notification.service');
const plexController = require('./controller/plex.controller');
const publicKey = fs.readFileSync(path.join(__dirname, 'config', 'key.pub'));
const settings = settingsService.getSettings();

module.exports = (server) => {
    debug('Creating socket.io Server');
    const ioServer = io(server, { path: '/socket.io' });

    debug('Binding authentication requirements');
    ioServer.on('connection', ioJwtAuth.authorize({
		secret: publicKey,
		timeout: 15000 // 15 seconds to send the authentication message
	})).on('authenticated', (socket) => {
		const dbg = debug.extend('socket-auth');
		dbg('Checking server configuration');
		const payload = socket.decoded_token;
		if (payload.sub != settings.plex.machineId) { socket.emit('unauthorized'); socket.disconnect(); }
		const set = settingsService.getSettings('plex');
		set.token = payload.token;
		const ps = new plexService(set);
		dbg('Checking authentication');
		ps.check().then(() => {
			dbg('Authenticated');
			if (payload.owner) {
				settingsService._saveSettings(settings);
				plexController.adminService = ps;
			}
			if (!notificationService.sockets[payload.username]) notificationService.sockets[payload.username] = [socket];
			else notificationService.sockets[payload.username].push(socket);
			dbg(`User ${payload.username} connected and authenticated with ${notificationService.sockets[payload.username].length} connections`);
			socket.once('disconnect', () => {
				const idx = notificationService.sockets[payload.username].indexOf(socket);
				notificationService.sockets[payload.username].splice(idx, 1);
				dbg(`User ${payload.username} disconnected. Now has ${notificationService.sockets[payload.username].length} connections`);
			});
		}).catch((err) => { dbg(err); socket.emit('unauthorized'); socket.disconnect(); });
    });
    
    return ioServer;
}