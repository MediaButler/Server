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
const isDocker = require('is-docker');
const fs = require('fs');

const plexService = require('./service/plexService');
const requestService = require('./service/requestService');

let settings;
if (isDocker()) {
    console.log('Running inside a Docker container');
    try {
        settings = require('/config/settings.json');
    } catch (err) {
        settings = require('./settings.defualt.json');

        fs.writeFile("/config/settings.json", settings, (err) => {
            if (err) {
                console.error(err);
                return;
            };
            console.log("Settings created");
        });
    }
} else {
    try {
        settings = require('./settings.json');
    } catch (err) {
        settings = require('./settings.defualt.json');
        fs.writeFile("./settings.json", settings, (err) => {
            if (err) {
                console.error(err);
                return;
            };
            console.log("Settings created");
        });
    }
}

const options = { autoIndex: false, reconnectTries: 30, reconnectInterval: 500, 
    poolSize: 10, bufferMaxEntries: 0, useNewUrlParser: true }

const connectWithRetry = () => {
    console.log('Attempting to connect to database')
    mongoose.connect(process.env.DB_URL || settings.database, options).then(() => {
        console.log('Database is connected');
    }).catch((err) => {
        console.log('Database connection unsuccessful, will retry after 5 seconds.')
        setTimeout(connectWithRetry, 5000);
    });
}
connectWithRetry()


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
    }).catch((err) => { return cb(new Error('Unable to authenticate to Plex')); });
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
app.use('/hooks', passport.authenticate('jwt', { session: false }), hooksController);
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

const notifyService = io
    .of('/notify')
    .on('connection', (socket) => {
        socket.emit('event', {
            that: 'only'
            , '/notify': 'will get'
        });
        notifyService.emit('event', {
            everyone: 'in'
            , '/notify': 'will get'
        });
    });

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
    const rs = new requestService(true);
    nService.agent = notifyService;
});
