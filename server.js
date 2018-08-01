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
const io = require('socket.io')(server);
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const os = require('os');
const bodyParser = require('body-parser');
var ioJwtAuth = require('socketio-jwt-auth');


const services = require('./service/services');
const settings = services.settings;
const plexService = require('./service/plexService');

const options = { autoIndex: false, reconnectTries: 30, reconnectInterval: 500, 
    poolSize: 10, bufferMaxEntries: 0, useNewUrlParser: true }

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
        return cb(null, user);
    }).catch((err) => { return done(null, false, 'Unable to validate user'); });
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.set('json spaces', 2);
app.set('base', '/mediabutler');

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

app.get('/', (req, res) => {
    if (req.user) { console.log(req); res.send('Hello.'); }
    else { console.log(req); res.send('Hello World.'); }
});

app.get('/version', (req, res) => {
    const v = {
        apiVersion: '1.0',
        systemOS: os.platform(),
        uptime: os.uptime(),
        url: (settings.urlOverride) ? settings.urlOverride : `http://${host}:${port}/`
    };
    return res.status(200).send(v);
});
const userSockets = {};
const notifyService = io
    .of('/notify')
    //.of('/mediabutler/notify')
    .on('connection', (socket) => {
        const user = socket.request.user;
        userSockets[user.username] = [socket];
        console.log(userSockets);
    }).use(ioJwtAuth.authenticate({
        secret: 'djfkhsjkfhdkfhsdjklrhltheamcthiltmheilucmhteischtismheisumhcteroiesmhcitumhi'
      }, (payload, done) => {
        if (payload.ident != process.env.PLEX_MACHINE_ID) return done(null, false, 'Token not for this API');
        console.log('hello');
        console.log(payload);
        const user = { username: payload.username, ident: payload.ident, token: payload.token, owner: payload.owner };
        const set = settings.plex;
        set.token = user.token;
        const ps = new plexService(set);
        console.log('set up plex');
        ps.check().then(() => {
            console.log('yep all good');
            return cb(null, user);
        }).catch((err) => { return done(null, false, 'Unable to validate user'); });
      }));

//   notifyService.use((socket, next) => {
//     let header = socket.handshake.headers['authorization'];
//     if (isValidJwt(header)) {
//       return next();
//     }
//     return next(new Error('authentication error'));
//   });


const nService = require('./service/notificationService');
server.listen(port, host, () => {
    console.log(`MediaButler API Server v1.0 -  http://127.0.0.1:${port}`);
    nService.agent = notifyService;
});
