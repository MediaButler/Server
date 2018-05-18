const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 9876;
var User = require('./user/user');
var mongoose = require('mongoose');
mongoose.connect('mongodb://oauth:superSecretPassword@ds125680.mlab.com:25680/mbuser');
const express = require('express');
const app = express();
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

passport.use(new DiscordStrategy({
    clientID: '446409909123284994',
    clientSecret: 'T8LF4jKZLgJFYU0Qj7_4hR_z_buGfSSP',
    callbackURL: 'http://127.0.0.1:9876/auth/discord/callback',
    scope: ['identify', 'email', 'guilds'],
}, (accessToken, refreshToken, profile, cb) => {
    console.log(`Access Token: ${accessToken} - Refresh: ${refreshToken}`);
    User.findOne({ discordId: profile.id }, (err, user) => {
        if (err) return res.status(500).send("There was a problem adding the information to the database.");
        if (!user) {
            const u = User.create({ discordId: profile.id, username: profile.username, email: profile.email, guilds: profile.guilds });
            user = u;
        }
        return cb(err, user);
    });
}));

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { return next(null); }
    res.redirect('/error');
}

const expressLogger = require('express-logger');
const expressSession = require('express-session');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSession({ secret: 'thissecretrocks' }));
app.use(passport.initialize());
app.use(passport.session());

const authController = require('./auth/discord');
app.use('/auth', authController);
const tvShowController = require('./api/tvshow');
app.use('/tvshow', tvShowController);
const hooksController = require('./api/hooks');
app.use('/hooks', hooksController);


passport.serializeUser = ((user, done) => {
    done(null, user);
});

passport.deserializeUser((id, done) => {
    User.find({ discordId: id }, function (err, user) {
        done(err, user);
    });
});

app.get('/',(req, res) => {
    if (req.isAuthenticated()) { console.log(req.isAuthenticated()); res.send('Hello.'); }
    else { console.log(req.isAuthenticated()); res.send('Hello World.'); }
});

app.get('/error',(req, res) => {
    res.send('An error has occured.');
});

app.listen(port, host,() => {
    console.log("Listening on " + port);
});
