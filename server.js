#!/usr/bin/env node
const process = require('process');
if (process.env.NODE_ENV == undefined) process.env.NODE_ENV = 'production';
if (process.env.NODE_ENV != 'test') console.log('\n' // eslint-disable-line no-console
	+ '███╗   ███╗███████╗██████╗ ██╗ █████╗ ██████╗ ██╗   ██╗████████╗██╗     ███████╗██████╗  \n'
	+ '████╗ ████║██╔════╝██╔══██╗██║██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██║     ██╔════╝██╔══██╗ \n'
	+ '██╔████╔██║█████╗  ██║  ██║██║███████║██████╔╝██║   ██║   ██║   ██║     █████╗  ██████╔╝ \n'
	+ '██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║██╔══██╗██║   ██║   ██║   ██║     ██╔══╝  ██╔══██╗ \n'
	+ '██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║██████╔╝╚██████╔╝   ██║   ███████╗███████╗██║  ██║ \n'
	+ '╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝ \n');

const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const cors = require('cors');
const _ = require('lodash');
const rateLimit = require('express-rate-limit');
const http = require('http');
const bodyParser = require('body-parser');
const winston = require('winston');
const expressWinston = require('express-winston');
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;

const io = require('socket.io');
const ioJwtAuth = require('socketio-jwt');
const natUpnp = require('nat-upnp');

const fs = require('fs');
const path = require('path');
const plexService = require('./src/service/plex.service');
const notificationService = require('./src/service/notification.service');
const settingsService = require('./src/service/settings.service');
const plexController = require('./src/controller/plex.controller');
const errorHandler = require('./src/errors/handler');
const settings = settingsService.settings;
const publicKey = fs.readFileSync(path.join(__dirname, 'src', 'config', 'key.pub'));
const port = process.env.PORT || 9876;

const app = express();
const server = http.createServer(app);
const ioServer = io(server, { path: '/socket.io' });
const User = require('./src/model/user');

app.use(cors());
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('json spaces', 2);
app.set('base', '/mediabutler/');
app.enable('trust proxy');
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(passport.initialize());

const asyncForEach = async (array, callback) => {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
};

const requestFilter = (req, propName) => {
	if (propName === 'headers') {
		return _
			.chain(req)
			.get(propName)
			.cloneDeep()
			.assign(_.pick({
				'authorization': '[REDACTED]',
				'cookie': '[REDACTED]'
			}, _.keys(req[propName])))
			.value();
	}
	return req[propName];
};

const connectDatabase = (dbUri) => {
	console.log('Attempting to connect to database');
	const databaseOptions = {
		autoIndex: false, reconnectTries: Infinity, reconnectInterval: 500,
		bufferMaxEntries: 0, useNewUrlParser: true,
		connectTimeoutMS: 30000, keepAlive: true
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

if (settings.debugMode == true) {
	app.use(expressWinston.logger({
		transports: [
			new winston.transports.Console({
				json: true,
				colorize: true
			})
		],
		requestFilter
	}));
}

passport.use(new JWTStrategy({
	jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
	secretOrKey: publicKey,
	issuer: 'MediaButler',
	ignoreExpiration: true,
}, (payload, next) => {
	if (payload.sub != settings.plex.machineId) next(new Error('Token provided is not for this installation'), false, 'Subscriber does not match machineId');
	const set = settings.plex;
	set.token = payload.token;
	const ps = new plexService(set);
	ps.check().then(() => {
		if (payload.owner && !settings.plex.token) {
			settings.plex.token = payload.token;
			settingsService._saveSettings(settings);
			plexController.adminService = ps;
		}
		User.find({ username: payload.username }).limit(1).then((userList) => {
			let user = false;
			if (userList.length == 0) {
				user = User.create({ username: payload.username, owner: payload.owner });
			} else {
				user = userList[0];
			}
			if (payload.owner && !user.permissions.includes('ADMIN')) { 
				user.permissions.push('ADMIN'); 
				user.save();
			}
			user.token = payload.token;
			if (user) next(null, user);
			else next(new Error('Unable to find or create User'), false, 'Unable to find or create User');
		}).catch((err) => {
			next(err, false, 'Database Error');
		});
	}).catch((err) => {
		next(err, false, 'Authentication or Communication Error');
	});
}));

app.get('/', (req, res) => {
	res.send('Hello World');
});

app.get('/version', (req, res) => {

});

const controllers = new Map();
const dir = fs.readdirSync(path.join(__dirname, 'src', 'routes'));
if (!dir) { console.log('Unable to load routes'); process.exit(1); }
console.log('loading routes');
dir.forEach((file) => {
	const routesFile = require(path.join(__dirname, 'src', 'routes', file));
	try {
		console.log(routesFile.name);
		app.use(`/${routesFile.name}/`, passport.authenticate('jwt', { session: false }), routesFile.main());
		if (routesFile.configure) {
			app.use(`/configure/${routesFile.name}/`, passport.authenticate('jwt', { session: false }), routesFile.configure());
		}
		if (routesFile.hooks) {
			app.use(`/hooks/${routesFile.name}/`, routesFile.hooks());
		}
		controllers.set(routesFile.name, routesFile);
	} catch (err) {
		console.log(`Unable to load ${routesFile.name}. There was an error.`);
	}
});

app.use(errorHandler);
app.use((req, res, next) => {
	res.status(404).send({ name: 'NotFound', message: 'Page Not Found' });
});

const notifyService = ioServer
	.on('connection', ioJwtAuth.authorize({
		secret: publicKey,
		timeout: 15000 // 15 seconds to send the authentication message
	})).on('authenticated', (socket) => {
		const user = socket.decoded_token;
		if (user.sub != process.env.PLEX_MACHINE_ID) { socket.emit('unauthorized'); socket.disconnect(); }
		const set = settings.plex;
		set.token = user.token;
		const ps = new plexService(set);
		ps.check().then(() => {
			if (user.owner && !settings.plex.token) {
				settings.plex.token = user.token;
				settingsService._saveSettings(settings);
				plexController.adminService = ps;
			}
			if (!notificationService.sockets[user.username]) notificationService.sockets[user.username] = [socket];
			else notificationService.sockets[user.username].push(socket);
			console.log(`User ${user.username} connected and authenticated with ${notificationService.sockets[user.username].length} connections`);
			socket.once('disconnect', () => {
				const idx = notificationService.sockets[user.username].indexOf(socket);
				notificationService.sockets[user.username].splice(idx, 1);
				console.log(`User ${user.username} disconnected. Now has ${notificationService.sockets[user.username].length} connections`);
			});
		}).catch((err) => { socket.emit('unauthorized'); socket.disconnect(); }); // eslint-disable-line no-unused-vars
	});

process.on('beforeExit', async (code) => {
	console.log(`About to exit with code: ${code}`);
});

process.on('exit', (code) => {
	console.log(`Exiting with code: ${code}`);
});

app.server = server.listen(port);

console.log(`MediaButler API Server v1.0 -  http://127.0.0.1:${port}`);
if (process.env.NODE_ENV != 'test') connectDefaultDatabase();
notificationService.agent = notifyService;
if (process.env.NODE_ENV != 'test') {
	console.log('Attempting to map UPnP port 9876');
	const client = natUpnp.createClient();
	client.portUnmapping({ public: 9876 });
	client.portMapping({
		public: 9876,
		private: 9876,
		ttl: 10
	}, (err) => {
		if (err) console.log('unable to map port');
		else { console.log('port mapping done'); }
	});
}

module.exports = app;