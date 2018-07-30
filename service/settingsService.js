const isDocker = require('is-docker');
const fs = require('fs');

module.exports = class settingsService {
    constructor() {
        if (isDocker()) this.settings = this._getSettings('/config/settings.json');
        else this.settings = this._getSettings('../settings.json');
    }

    getSettings() {
        return this.settings;
    }

    _makeSettings(filePath) {
        if (fs.existsSync(filePath)) throw new Error('Settings already exists');
        const settings = require('../settings.default.json');
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), (err) => {
            if (err) return console.error(err);
        });
    }

    _getSettings(filePath) {
        try {
            const settings = require(filePath);
            if (!settings.tautulli.url || !settings.tautulli.apikey) { console.log('Settings not configured. Tautulli unconfigured'); process.exit(1); }
            if (!settings.sonarr.url || !settings.sonarr.apikey || !settings.sonarr.defaultProfile || !settings.sonarr.defaultRoot) { console.log('Settings not configured. Sonarr unconfigured'); process.exit(1); }
            if (!settings.radarr.url || !settings.radarr.apikey || !settings.radarr.defaultProfile || !settings.radarr.defaultRoot) { console.log('Settings not configured. Sonarr unconfigured'); process.exit(1); }
            if (!settings.plex.url) { console.log('Settings not configured. Plex unconfigured'); process.exit(1); }
            return settings;
        } catch (err) {
            if (err.name == "SyntaxError") { console.log('There was an error loading your settings.json, please go back and verify the file is correct'); process.exit(1); }
            console.error(err.message);
            this._makeSettings(filePath);
        }
    }
}