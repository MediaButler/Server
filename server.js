console.log("\n"
    + "███╗   ███╗███████╗██████╗ ██╗ █████╗ ██████╗ ██╗   ██╗████████╗██╗     ███████╗██████╗  \n"
    + "████╗ ████║██╔════╝██╔══██╗██║██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██║     ██╔════╝██╔══██╗ \n"
    + "██╔████╔██║█████╗  ██║  ██║██║███████║██████╔╝██║   ██║   ██║   ██║     █████╗  ██████╔╝ \n"
    + "██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║██╔══██╗██║   ██║   ██║   ██║     ██╔══╝  ██╔══██╗ \n"
    + "██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║██████╔╝╚██████╔╝   ██║   ███████╗███████╗██║  ██║ \n"
    + "╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝ \n");

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 9876;
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const os = require('os');

const plexService = require('./service/plexService');
const settings = require('./settings.json');

mongoose.connect(settings.database);

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'djfkhsjkfhdkfhsdjklrhltheamcthiltmheilucmhteischtismheisumhcteroiesmhcitumhi'
}, (jwtPayload, cb) => {
    if (jwtPayload.ident != process.env.SERV_IDENT) return cb(new Error('Something fishy with token'));
    const user = { username: jwtPayload.username, ident: jwtPayload.ident, token: jwtPayload.token, owner: jwtPayload.owner };
    const set = settings.plex;
    set.token = user.token;
    const ps = new plexService(set);
    ps.check().then(() => {
        return cb(null, user);
    }).catch((err) => { return cb(new Error('Unable to authenticate to Plex')); });
}));

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.set('json spaces', 2);

const tvShowController = require('./api/tvshow');
app.use('/tvshow', passport.authenticate('jwt', {session: false}), tvShowController);
const movieController = require('./api/movie');
app.use('/movie', passport.authenticate('jwt', {session: false}), movieController);
const statsController = require('./api/stats');
app.use('/stats', passport.authenticate('jwt', {session: false}), statsController);
const hooksController = require('./api/hooks');
app.use('/hooks', passport.authenticate('jwt', {session: false}), hooksController);
const requestController = require('./api/request');
app.use('/request', passport.authenticate('jwt', {session: false}), requestController);

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


app.listen(port, host,() => {
    console.log(`MediaButler API Server v1.0 -  http://${host}:${port}`);
});
