const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 9876;
const mongoose = require('mongoose');
mongoose.connect('mongodb://request:requestUser1@ds125680.mlab.com:25680/mbuser')
const express = require('express');
const app = express();
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;

const plexService = require('./service/plexService');
const settings = require('./settings.json');


passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'djfkhsjkfhdkfhsdjklrhltheamcthiltmheilucmhteischtismheisumhcteroiesmhcitumhi'
},
function (jwtPayload, cb) {
    if (jwtPayload.ident != process.env.SERV_IDENT) return cb(new Error('Something fishy with token'));
    const user = { 
        username: jwtPayload.username,
        ident: jwtPayload.ident,
        token: jwtPayload.token,
        owner: jwtPayload.owner
    };
    settings.plex.token = user.token;
    const ps = new plexService(settings.plex)
    ps.check().then((res) => {
        return cb(null, user);
    }).catch((err) => { return cb(new Error('Unable to authenticate to Plex')); })
}
));

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { return next(null); }
    res.redirect('/error');
}

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.set('json spaces', 2);

const tvShowController = require('./api/tvshow');
app.use('/tvshow', passport.authenticate('jwt', {session: false}), tvShowController);
const movieController = require('./api/movie');
app.use('/movie', passport.authenticate('jwt', {session: false}), tvShowController);
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

app.listen(port, host,() => {
    console.log(`Listening on http://${host}:${port}`);
});
