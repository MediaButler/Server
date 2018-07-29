const isDocker = require('is-docker');
const fs = require('fs');

module.exports = class settingsService {
    constructor() {
        if (isDocker()) {
            this.settings = this._getSettings('/config/settings.json');
        } else {
            this.settings = this._getSettings('../settings.json');
        }
    }

    getSettings() {
        return this.settings;
    }

    _getSettings(filePath) {
        try {
            const settings = require(filePath);
            if (!settings.tautulli.url || !settings.tautulli.apikey) die('Settings not configured. Tautulli unconfigured');
            if (!settings.sonarr.url || !settings.sonarr.apikey || !settings.sonarr.defaultProfile || !settings.sonarr.defaultRoot) die('Settings not configured. Sonarr unconfigured');
            if (!settings.radarr.url || !settings.radarr.apikey || !settings.radarr.defaultProfile || !settings.radarr.defaultRoot) die('Settings not configured. Sonarr unconfigured');
            if (!settings.plex.url) die('Settings not configured. Plex unconfigured');
            return settings;
        } catch (err) {
            console.error(err);
            const settings = require('../settings.default.json');
            fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), (err) => {
                if (err) return console.error(err);
            });
            die('Settings file created. Please edit and restart.');
        }
    }
}