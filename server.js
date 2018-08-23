console.log("\n"
    + "███╗   ███╗███████╗██████╗ ██╗ █████╗ ██████╗ ██╗   ██╗████████╗██╗     ███████╗██████╗  \n"
    + "████╗ ████║██╔════╝██╔══██╗██║██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██║     ██╔════╝██╔══██╗ \n"
    + "██╔████╔██║█████╗  ██║  ██║██║███████║██████╔╝██║   ██║   ██║   ██║     █████╗  ██████╔╝ \n"
    + "██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║██╔══██╗██║   ██║   ██║   ██║     ██╔══╝  ██╔══██╗ \n"
    + "██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║██████╔╝╚██████╔╝   ██║   ███████╗███████╗██║  ██║ \n"
    + "╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝ \n");

const host = process.env.HOST || false;
const port = process.env.PORT || 9876;
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { path: '/socket.io' });
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const os = require('os');
const bodyParser = require('body-parser');
var ioJwtAuth = require('socketio-jwt');
const fs = require('fs');
const ip = require('ip').address('public');

const services = require('./service/services');
const settings = services.settings;
const plexService = require('./service/plexService');

const options = {
    autoIndex: false, reconnectTries: 30, reconnectInterval: 500,
    poolSize: 10, bufferMaxEntries: 0, useNewUrlParser: true
}

const connectDatabase = () => {
    console.log('Attempting to connect to database')
    mongoose.connect(process.env.DB_URL || settings.database, options).then(() => {
        console.log('Database is connected');
    }).catch((err) => {
        console.log('Database connection unsuccessful, will retry after 5 seconds.')
        setTimeout(connectDatabase, 5000);
    });
}
connectDatabase();

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'djfkhsjkfhdkfhsdjklrhltheamcthiltmheilucmhteischtismheisumhcteroiesmhcitumhi'
}, (jwtPayload, cb) => {
    if (jwtPayload.ident != process.env.PLEX_MACHINE_ID) return cb(new Error('Something fishy with token'));
    const user = { username: jwtPayload.username, ident: jwtPayload.ident, token: jwtPayload.token, owner: jwtPayload.owner };
    const set = settings.plex;
    set.token = user.token;
    const ps = new plexService(set);
    ps.check().then(() => {
        if (jwtPayload.owner && !settings.plex.token) {
            settings.plex.token = jwtPayload.token;
            services.settingsService._saveSettings(settings);
        }
        return cb(null, user);
    }).catch((err) => { return cb(null, false, 'Unable to validate user'); });
}));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(passport.initialize());
app.set('json spaces', 2);
app.set('base', '/mediabutler/');

const pluginMap = new Map();

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

const loadPlugins = async () => {
    console.log('Attempting to load plugins');
    const dir = await fs.readdirSync('./plugins');
    if (!dir) { console.log('Unable to load plugins'); process.exit(1); }
    asyncForEach(dir, async (file) => {
        if (file == 'base.js') return;
        const p = require(`./plugins/${file}`);
        const plugin = new p();
        console.log(`Attempting to load ${plugin.info.name} plugin`);
        pluginMap.set(plugin.info.name, plugin);
        const s = await plugin.startup();
        if (plugin.enabled) {
            if (typeof (plugin.hook) == 'function') { 
                const hook = await plugin.hook(); 
                if (hook) app.use(`/hooks/${plugin.info.name}`, hook);
             }
            const api = await plugin.api();
            app.use(`/${plugin.info.name}`, passport.authenticate('jwt', { session: false }), api);
            const configure =  await plugin.configure(eval(`settings.${plugin.info.name}`));
            app.use(`/configure/${plugin.info.name}`, passport.authenticate('jwt', { session: false }), configure);
            console.log(`Sucessfully loadad ${plugin.info.name} plugin`);
        } else {
            console.log(`Plugin ${plugin.info.name} is improperly configured. Not enabling`);
        }
    });
}

setTimeout(() => {
    loadPlugins();
}, 10000);

const tvShowController = require('./api/tvshow');
app.use('/tvshow', passport.authenticate('jwt', { session: false }), tvShowController);
const movieController = require('./api/movie');
app.use('/movie', passport.authenticate('jwt', { session: false }), movieController);
const statsController = require('./api/stats');
app.use('/stats', passport.authenticate('jwt', { session: false }), statsController);
const hooksController = require('./api/hooks');
app.use('/hooks', hooksController);
const requestController = require('./api/request');
app.use('/request', passport.authenticate('jwt', { session: false }), requestController);
const rulesController = require('./api/rules');
app.use('/rules', passport.authenticate('jwt', { session: false }), rulesController);


app.get('/', (req, res) => {
    console.log(req); res.send('Hello World.');
});

app.get('/version', (req, res) => {
    const v = {
        apiVersion: '1.0',
        systemOS: os.platform(),
        uptime: os.uptime(),
        url: (settings.urlOverride) ? settings.urlOverride : `http://${ip}:${port}/`,
        plugins: Array.from(pluginMap.keys())
    };
    return res.status(200).send(v);
});

const notifyService = io
    .on('connection', ioJwtAuth.authorize({
        secret: 'djfkhsjkfhdkfhsdjklrhltheamcthiltmheilucmhteischtismheisumhcteroiesmhcitumhi',
        timeout: 15000 // 15 seconds to send the authentication message
    })).on('authenticated', (socket) => {
        const user = socket.decoded_token;
        if (user.ident != process.env.PLEX_MACHINE_ID) { socket.emit('unauthorized'); socket.disconnect(); }
        const set = settings.plex;
        set.token = user.token;
        const ps = new plexService(set);
        ps.check().then(() => {
            if (user.owner && !settings.plex.token) {
                settings.plex.token = user.token;
                services.settingsService._saveSettings(settings);
            }
            if (!nService.sockets[user.username]) nService.sockets[user.username] = [socket];
            else nService.sockets[user.username].push(socket);
            console.log(`User ${user.username} connected and authenticated with ${nService.sockets[user.username].length} connections`);
            socket.once('disconnect', () => {
                const idx = nService.sockets[user.username].indexOf(socket);
                nService.sockets[user.username].splice(idx, 1);
                console.log(`User ${user.username} disconnected. Now has ${nService.sockets[user.username].length} connections`);
            });
        }).catch((err) => { socket.emit('unauthorized'); sokcet.disconnect(); });
    });

const nService = require('./service/notificationService');
server.listen(port, ip, () => {
    console.log(`MediaButler API Server v1.0 -  http://${ip}:${port}`);
    nService.agent = notifyService;
});
