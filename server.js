const debug = require('debug')('mediabutler');
const http = require('http');
const mongoose = require('mongoose');
const settingsService = require('./src/service/settings.service');
const notificationService = require('./src/service/notification.service');
const settings = settingsService.getSettings();
const expressServer = require('./src/express-server');
const socketServer = require('./src/socket-server');
const ip = require('ip').address('public');
const port = process.env.PORT || 9876;

const package = require('./package.json');

global.state = {
    autoDiscovery: Boolean(process.env.ENABLE_DISCOVERY) || true,
    enableUpnp: Boolean(process.env.ENABLE_UPNP) || true,
    version: package.version,
    dbUrl: process.env.DB_URL || settings.dbUrl,
    url: process.env.URL || settings.urlOverride || `http://${ip}:${this.port}/`,
    host: process.env.HOST || ip,
    port: process.env.PORT || 9876,
    server: null,
    ioServer: null,
    sockets: [],
    ioSockets: [],
    settings
}

console.log('\n' // eslint-disable-line no-console
    + '███╗   ███╗███████╗██████╗ ██╗ █████╗ ██████╗ ██╗   ██╗████████╗██╗     ███████╗██████╗  \n'
    + '████╗ ████║██╔════╝██╔══██╗██║██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██║     ██╔════╝██╔══██╗ \n'
    + '██╔████╔██║█████╗  ██║  ██║██║███████║██████╔╝██║   ██║   ██║   ██║     █████╗  ██████╔╝ \n'
    + '██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║██╔══██╗██║   ██║   ██║   ██║     ██╔══╝  ██╔══██╗ \n'
    + '██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║██████╔╝╚██████╔╝   ██║   ███████╗███████╗██║  ██║ \n'
    + '╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝ \n');
console.log(`MediaButler API Server v${global.state.version} -  http://${ip}:${port}/`); // eslint-disable-line no-console

const connectDatabase = (dbUri) => {
    console.log('Attempting to connect to database');
    const databaseOptions = {
        reconnectTries: Infinity, reconnectInterval: 500,
        useNewUrlParser: true, connectTimeoutMS: 30000,
        keepAlive: true
    };
    mongoose.connect(dbUri, databaseOptions).then(() => {
        console.log('Database is connected');
    }).catch(err => { throw err; });
};

const connectDefaultDatabase = () => {
    try {
        connectDatabase(process.env.DB_URL || settings.database);
    } catch (err) {
        console.log('Unable to connect to db, retrying in 5s');
        setTimeout(connectDefaultDatabase, 5000);
    }
};

const sendDiscoveryUrl = () => {
    const axios = require('axios');
    const headers = {
        'MB-Client-Identifier': 'ef0b0a6b-abef-4535-831a-67bc709a18cc'
    };
    const data = {
        'machineId': settings.plex.machineId,
        'url': global.state.url
    };
    debug(data);
    axios({ method: 'POST', url: 'https://auth.mediabutler.io/login/discover', headers, data }).then((res) => {
        console.log('Sent Discovery URL');
    }).catch((err) => {
        debug(err);
        console.log('Unable to send Discovery URL, Please ensure the port is forwarded at the router correctly');
    });
}

const upnpPortMapping = () => {
    const udbg = debug.extend('upnp');
    const client = require('nat-upnp').createClient();
	client.portUnmapping({ public: global.state.port });
	client.portMapping({
		public: global.state.port,
		private: global.state.port,
		ttl: 10
	}, (err) => {
		if (err) udbg('unable to map port');
		else { udbg('port mapping done'); }
	});
}

const restart = () => {
    // Clean the cache
    const ids = [];
    Object.keys(require.cache).forEach((id) => {
        debug('Reloading', id);
        delete require.cache[id];
        ids.push(id);
    });

    // Kill all socket.io connections
    global.state.ioSockets.forEach((socket, index) => {
        debug('Destroying socket', index + 1);
        socket.disconnect(true);
    });

    // Kill all active api connections
    global.state.sockets.forEach((socket, index) => {
        debug('Destroying socket', index + 1);
        if (socket.destroyed === false) {
            socket.destroy();
        }
    });

    // Reset sockets back to null
    global.state.sockets = [];
    state.ioSockets = [];

    // Close servers
    global.state.ioServer.close(() => {
        global.state.server.close(() => {
            console.log('-------------------- RESTARTING -----------------');
            global.state.ioServer = null;
            global.state.server = null;
            ids.forEach((id) => {
                require.cache[id] = require(id);
            })
            start();
        });
    });
}

const start = () => {
    const app = expressServer();
    global.state.server = http.createServer(app);
    global.state.app = app;
    app.server = global.state.server;
    global.state.server.listen(port);
    global.state.server.on('connection', (socket) => {
        debug('Add http socket', global.state.sockets.length + 1);
        global.state.sockets.push(socket);
        socket.on('close', () => {
            debug('Del http socket', global.state.sockets.indexOf(socket) + 1);
            global.state.sockets.splice(global.state.sockets.indexOf(socket), 1);
        });
    });
    global.state.ioServer = socketServer(global.state.server);
    global.state.ioServer.sockets.on('connection', (socket) => {
        debug('Add io socket', global.state.ioSockets.length + 1);
        global.state.ioSockets.push(socket);
        socket.on('close', () => {
            debug('Del io socket', global.state.ioSockets.indexOf(socket) + 1);
            global.state.ioSockets.splice(global.state.ioSockets.indexOf(socket), 1);
        });
    });
    notificationService.agent = global.state.ioServer;
    if (global.state.enableUpnp) upnpPortMapping();
    if (global.state.autoDiscovery && settings.plex.token) sendDiscoveryUrl();
}

process.on('beforeExit', async (code) => {
    console.log(`About to exit with code: ${code}`);
});

process.on('exit', (code) => {
    console.log(`Exiting with code: ${code}`);
});

const getPlexMachineId = () => {
    debug('Getting Plex machindId');
    const ps = new plexService(settings.plex);
    ps.getIdentity().then((machine) => {
        settings.plex.machineId = machine.MediaContainer.machineIdentifier;
        settingsService._saveSettings(settings);
        sendDiscoveryUrl();
        debug('Saved machineId');
    });
}

if (!settings.plex.machineId || settings.plex.machineId == undefined) getPlexMachineId();

// Artificial restart after 1min to test teardown and build up process
setTimeout(() => {
    // restart();
}, 60000);

module.exports = global.state;
connectDefaultDatabase();
start();
