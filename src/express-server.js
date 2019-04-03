const debug = require('debug')('mediabutler:express');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const fs = require('fs');
const os = require('os');
const path = require('path');

const ip = require('ip').address('public');
const host = process.env.HOST || ip;

const settingsService = require('./service/settings.service');
const settings = settingsService.getSettings();

const package = require('../package.json');

const plexService = require('./service/plex.service');
const notificationService = require('./service/notification.service');
const plexController = require('./controller/plex.controller');

const publicKey = fs.readFileSync(path.join(__dirname, 'config', 'key.pub'));
const errorHandler = require('./errors/handler');

const User = require('./model/user');

const controllers = new Map();
let availablePermissions = new Array();

const versionCommand = (req, res, next) => {
    const dbg = debug.extend('versionCommand');
    try {
        dbg('Collecting information');
        const v = {
            apiVersion: package.version,
            systemOS: os.platform(),
            uptime: os.uptime(),
            url: global.state.url,
            endpoints: Array.from(controllers.keys()),
            permissions: availablePermissions,
        };
        dbg('Sending information');
        res.status(200).send(v);
    } catch (err) { next(err); }
};

module.exports = () => {
    const app = express();

    app.use(cors());
    app.use(compression());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.set('json spaces', 2);
    app.set('base', '/mediabutler/');
    app.enable('trust proxy');
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
    app.use(passport.initialize());

    passport.use(new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: publicKey,
        issuer: 'MediaButler',
        ignoreExpiration: true,
        passReqToCallback: true
    }, (req, payload, next) => {
        const dbg = debug.extend('auth');
        dbg('Checking server configuration');
        if (payload.sub != settings.plex.machineId) next(new Error('Token provided is not for this installation'), false, 'Subscriber does not match machineId');
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
            dbg('Getting user');
            User.find({ username: payload.username }).limit(1).then((userList) => {
                dbg('Found User');
                let user = false;
                if (userList.length == 0) user = User.create({ username: payload.username, owner: payload.owner });
                else user = userList[0];

                if (payload.owner && user && user.permissions && !user.permissions.includes('ADMIN')) {
                    dbg('Adding ADMIN permission to owner');
                    user.permissions.push('ADMIN');
                    user.save();
                }
                req.plex = ps;
                dbg('Finished');
                if (user) next(null, user);
                else next(new Error('Unable to find or create User'), false, 'Unable to find or create User');
            }).catch((err) => {
                dbg(err);
                next(err, false, 'Database Error');
            });
        }).catch((err) => {
            dbg(err);
            next(err, false, 'Authentication or Communication Error');
        });
    }));


    app.get('/', (req, res) => {
        res.send('Hello World');
    });

    app.get('/version', versionCommand);

    const dir = fs.readdirSync(path.join(__dirname, 'routes'));
    if (!dir) { console.log('Unable to load routes'); process.exit(1); }
    debug('Loading routes');
    dir.forEach((file) => {
        debug(`Loading ${file}`);
        const routesFile = require(path.join(__dirname, 'routes', file));
        try {
            debug('Checking for supplied permissions');
            if (routesFile.permissions) availablePermissions = availablePermissions.concat(routesFile.permissions);
            debug('Adding endpoint');
            app.use(`/${routesFile.name}/`, passport.authenticate('jwt', { session: false }), routesFile.main());
            if (routesFile.configure) {
                debug('Adding configure endpoints');
                app.use(`/configure/${routesFile.name}/`, passport.authenticate('jwt', { session: false }), routesFile.configure());
            }
            if (routesFile.hooks) {
                debug('Adding hooks endpoint');
                app.use(`/hooks/${routesFile.name}/`, routesFile.hooks());
            }
            controllers.set(routesFile.name, routesFile);
        } catch (err) { debug(err); }
    });

    debug('Applying error handlers');
    app.use(errorHandler);
    app.use((req, res, next) => {
        res.status(404).send({ name: 'NotFound', message: 'Page Not Found' });
    });

    return app;
}