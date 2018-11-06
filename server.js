#!/usr/bin/env node
console.log("\n"
    + "███╗   ███╗███████╗██████╗ ██╗ █████╗ ██████╗ ██╗   ██╗████████╗██╗     ███████╗██████╗  \n"
    + "████╗ ████║██╔════╝██╔══██╗██║██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██║     ██╔════╝██╔══██╗ \n"
    + "██╔████╔██║█████╗  ██║  ██║██║███████║██████╔╝██║   ██║   ██║   ██║     █████╗  ██████╔╝ \n"
    + "██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║██╔══██╗██║   ██║   ██║   ██║     ██╔══╝  ██╔══██╗ \n"
    + "██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║██████╔╝╚██████╔╝   ██║   ███████╗███████╗██║  ██║ \n"
    + "╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝ \n");

const ip = require('ip').address('public');
const host = process.env.HOST || ip;
const port = process.env.PORT || 9876;
const mongoose = require('mongoose');
const express = require('express');
const compression = require('compression')
const _ = require('lodash');
const app = express();
const rateLimit = require('express-rate-limit');
const server = require('http').createServer(app);
const io = require('socket.io')(server, { path: '/socket.io' });
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const os = require('os');
const bodyParser = require('body-parser');
const ioJwtAuth = require('socketio-jwt');
const fs = require('fs');
const path = require('path');
const services = require('./service/services');
const settings = services.settings;
const plexService = require('./service/plexService');
const expressWinston = require('express-winston');
const winston = require('winston');
const databaseOptions = {
    autoIndex: false, reconnectTries: 30, reconnectInterval: 500,
    poolSize: 10, bufferMaxEntries: 0, useNewUrlParser: true
}
const publicKey = fs.readFileSync(path.join(__dirname, 'key.pub'));
const natUpnp = require('nat-upnp');

const connectDatabase = () => {
    console.log('Attempting to connect to database')
    mongoose.connect(process.env.DB_URL || settings.database, databaseOptions).then(() => {
        console.log('Database is connected');
    }).catch((err) => {
        console.log('Database connection unsuccessful, will retry after 5 seconds.')
        setTimeout(connectDatabase, 5000);
    });
}
connectDatabase();

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: publicKey,
    issuer: 'MediaButler',
    ignoreExpiration: true,
}, (jwtPayload, cb) => {
    if (settings.debugMode == true) console.log(`Ident check for ${jwtPayload.sub} - ${settings.plex.machineId}`);
    if (jwtPayload.sub != settings.plex.machineId) return cb(null, false, 'Token provided is not for this installation');
    const user = { username: jwtPayload.username, ident: jwtPayload.sub, token: jwtPayload.token, owner: jwtPayload.owner };
    const set = settings.plex;
    set.token = user.token;
    const ps = new plexService(set);
    ps.check().then(() => {
        if (jwtPayload.owner && !settings.plex.token) {
            settings.plex.token = jwtPayload.token;
            services.settingsService._saveSettings(settings);
            services.adminPlexService = ps;
        }
        return cb(null, user);
    }).catch((err) => { return cb(null, false, 'Unable to validate user'); });
}));

const redacted = '[REDACTED]'
const requestFilter = (req, propName) => {
    if (propName === 'headers') {
        return _
            .chain(req)
            .get(propName)
            .cloneDeep()
            .assign(_.pick({
                'authorization': redacted,
                'cookie': redacted
            }, _.keys(req[propName])))
            .value()
    }
    return req[propName]
}

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

app.use(compression());

app.use((err, req, res, next) => {
    return res.status(500).send(err);
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, MB-Client-Identifier');
    res.append('Access-Control-Allow-Credentials', 'true');
    if ('OPTIONS' === req.method) res.sendStatus(200);
    else next();
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(passport.initialize());
app.set('json spaces', 2);
app.set('base', '/mediabutler/');
app.enable("trust proxy");
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

const plugins = new Map();

const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

const loadPlugins = async () => {
    console.log('Attempting to load plugins');
    const dir = await fs.readdirSync(path.join(__dirname, 'plugins'));
    if (!dir) { console.log('Unable to load plugins'); process.exit(1); }
    asyncForEach(dir, async (file) => {
        if (file == 'base.js') return;
        const p = require(path.join(__dirname, 'plugins', file));
        const plugin = new p(app);
        plugin._plugins = plugins;
        const t = eval(`settings.${plugin.info.name}`) || {};
        const configure = await plugin.configure(t);
        app.use(`/configure/${plugin.info.name}`, passport.authenticate('jwt', { session: false }), configure);
        console.log(`Attempting to load ${plugin.info.name} plugin`);
        if (typeof (plugin.hook) == 'function') {
            const hook = await plugin.hook();
            if (hook) app.use(`/hooks/${plugin.info.name}`, hook);
        }
        const s = await plugin.startup();
        const api = await plugin.api();
        app.use(`/${plugin.info.name}`, passport.authenticate('jwt', { session: false }), api);
        plugins.set(plugin.info.name, plugin);
        if (plugin.enabled) console.log(`Sucessfully loadad ${plugin.info.name} plugin`);
        else console.log(`Plugin ${plugin.info.name} is improperly configured. Not enabling`);
    });
}

const pluginStatus = (req, res, next) => {
    const plugin = req.path.split('/')[1];
    const p = plugins.get(plugin);
    if (plugin == 'hooks' || plugin == 'configure' || plugin == 'version' || plugin == '') return next();
    if (!p) return res.status(404).send({ name: 'NotFound', message: 'Not Found' }).end();
    if (p.enabled) return next();
    else return res.status(400).send({ name: 'NotEnabled', message: 'Plugin is not enabled' }).end();
}
app.use(pluginStatus);

setTimeout(() => {
    loadPlugins();
}, 3000);

app.get('/', (req, res) => {
    console.log(req);
    res.send('Hello World.');
});

app.post('/system/restart', (req, res) => {
    loadPlugins();
    return res.status(200);
});

app.get('/version', (req, res) => {
    const v = {
        apiVersion: '1.0',
        systemOS: os.platform(),
        uptime: os.uptime(),
        url: (settings.urlOverride) ? settings.urlOverride : `http://${host}:${port}/`,
        plugins: Array.from(plugins.keys())
    };
    return res.status(200).send(v);
});

const notifyService = io
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
                services.settingsService._saveSettings(settings);
                services.adminPlexService = ps;
            }
            if (!nService.sockets[user.username]) nService.sockets[user.username] = [socket];
            else nService.sockets[user.username].push(socket);
            console.log(`User ${user.username} connected and authenticated with ${nService.sockets[user.username].length} connections`);
            socket.once('disconnect', () => {
                const idx = nService.sockets[user.username].indexOf(socket);
                nService.sockets[user.username].splice(idx, 1);
                console.log(`User ${user.username} disconnected. Now has ${nService.sockets[user.username].length} connections`);
            });
        }).catch((err) => { socket.emit('unauthorized'); socket.disconnect(); });
    });

app.use(expressWinston.errorLogger({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true
        })
    ]
}));

const nService = require('./service/notificationService');
server.listen(port, host, () => {
    console.log(`MediaButler API Server v1.0 -  http://${host}:${port}`);
    nService.agent = notifyService;
    console.log('Attempting to map UPnP port 9876');
    const client = natUpnp.createClient();
    client.portUnmapping({ public: 9876 });
    client.portMapping({
        public: 9876,
        private: 9876,
        ttl: 10
    }, (err) => {
        if (err) console.log('unable to map port');
        else console.log('port mapping done');
    });
});

process.on('beforeExit', async (code) => {
    console.log(`About to exit with code: ${code}`);
});

process.on('exit', (code) => {
    console.log(`Exiting with code: ${code}`);
});