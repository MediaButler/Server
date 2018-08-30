const isDocker = require('is-docker');
const fs = require('fs');
const defaultSettings = require('../settings.default.json');
const path = require('path');

module.exports = class settingsService {
    constructor() {
        if (isDocker()) this.filePath = path.join('/', 'config', 'settings.json');
        else this.filePath = path.join('..', 'settings.json');
        this.settings = this._getSettings();
    }

    getSettings() {
        return this.settings;
    }

    _saveSettings(settings) {
        fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), () => {
            this.settings = settings;
            return settings;
        });
    }

    _makeSettings() {
        if (fs.existsSync(this.filePath)) throw new Error('Settings already exists');
        const settings = defaultSettings;
        if (process.env.URL) settings.urlOverride = process.env.URL;
        if (process.env.PLEX_URL) settings.plex.url = process.env.PLEX_URL;
        if (process.env.PLEX_MACHINE_ID) settings.plex.machineId = process.env.PLEX_MACHINE_ID;
        fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), () => {
            this.settings = settings;
            return settings;
        });
    }

    _getSettings() {
        try {
            const settings = require(this.filePath) || this._makeSettings(this.filePath);
            if (process.env.URL) settings.urlOverride = process.env.URL;
            if ((!settings.plex.url && process.env.PLEX_URL) || settings.plex.url != process.env.PLEX_URL) settings.plex.url = process.env.PLEX_URL;
            if ((!settings.plex.machineId && process.env.PLEX_MACHINE_ID) || settings.plex.machineId != process.env.PLEX_MACHINE_ID) settings.plex.machineId = process.env.PLEX_MACHINE_ID;
            if (!settings.plex.url) { console.log('Settings not configured. Plex unconfigured'); console.log(settings.plex); process.exit(1); }
            this._saveSettings(settings);
            this.settings = settings;
            return settings;
        } catch (err) {
            if (err.name == "SyntaxError") { console.log('There was an error loading your settings.json, please go back and verify the file is correct'); process.exit(1); }
            // Check if all necessary envrionment variables are available
            console.error(err.message);
            this.settings = this._makeSettings(this.filePath);
            return this.settings;
        }
    }
}