const isDocker = require('is-docker');
const fs = require('fs');
const defaultSettings = require('../settings.default.json');

module.exports = class settingsService {
    constructor() {
        if (isDocker()) this.settings = this._getSettings('/config/settings.json');
        else this.settings = this._getSettings('../settings.json');
    }

    getSettings() {
        return this.settings;
    }

    _saveSettings(filePath, settings) {
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), () => {
            this.settings = settings;
            return settings;
        });
    }

    _makeSettings(filePath) {
        console.log('attempting to make settings');
        if (fs.existsSync(filePath)) throw new Error('Settings already exists');
        const settings = defaultSettings;
        if (process.env.TAUTULLI_URL) settings.tautulli.url = process.env.TAUTULLI_URL;
        if (process.env.TAUTULLI_KEY) settings.tautulli.apikey = process.env.TAUTULLI_KEY;
        if (process.env.SONARR_URL) settings.sonarr.url = process.env.SONARR_URL;
        if (process.env.SONARR_KEY) settings.sonarr.apikey = process.env.SONARR_KEY;
        if (process.env.SONARR_PROFILE_NAME) settings.sonarr.defaultProfile = process.env.SONARR_PROFILE_NAME;
        if (process.env.SONARR_ROOT_PATH) settings.sonarr.defaultRoot = process.env.SONARR_ROOT_PATH;
        if (process.env.RADARR_URL) settings.radarr.url = process.env.RADARR_URL;
        if (process.env.RADARR_KEY) settings.radarr.apikey = process.env.RADARR_KEY;
        if (process.env.RADARR_PROFILE_NAME) settings.radarr.defaultProfile = process.env.RADARR_PROFILE_NAME;
        if (process.env.RADARR_ROOT_PATH) settings.radarr.defaultRoot = process.env.RADARR_ROOT_PATH;
        if (process.env.PLEX_URL) settings.plex.url = process.env.PLEX_URL;
        if (process.env.PLEX_MACHINE_ID) settings.plex.machineId = process.env.PLEX_MACHINE_ID;
        if (process.env.ORGANIZR_URL) settings.organizr.url = process.env.ORGANIZR_URL;
        if (process.env.ORGANIZR_KEY) settings.organizr.apikey = process.env.ORGANIZR_KEY;
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), () => {
            this.settings = settings;
            return settings;
        });
    }

    _getSettings(filePath) {
        try {
            console.log(`trying to get settings from file`);
            const settings = require(filePath);
            if ((!settings.tautulli.url && process.env.TAUTULLI_URL) || settings.tautulli.url != process.env.TAUTULLI_URL) settings.tautulli.url = process.env.TAUTULLI_URL;
            if ((!settings.tautulli.apikey && process.env.TAUTULLI_KEY) || settings.tautulli.apikey != process.env.TAUTULLI_KEY) settings.tautulli.apikey = process.env.TAUTULLI_KEY;
            if ((!settings.sonarr.url && process.env.SONARR_URL) || settings.sonarr.url != process.env.SONARR_URL) settings.sonarr.url = process.env.SONARR_URL;
            if ((!settings.sonarr.apikey && process.env.SONARR_KEY) || settings.sonarr.apikey != process.env.SONARR_KEY) settings.sonarr.apikey = process.env.SONARR_KEY;
            if ((!settings.sonarr.defaultProfile && process.env.SONARR_PROFILE_NAME) || settings.sonarr.defaultProfile != process.env.SONARR_PROFILE_NAME) settings.sonarr.defaultProfile = process.env.SONARR_PROFILE_NAME;
            if ((!settings.sonarr.defaultRoot && process.env.SONARR_ROOT_PATH) || settings.sonarr.defaultRoot != process.env.SONARR_ROOT_PATH) settings.sonarr.defaultRoot = process.env.SONARR_ROOT_PATH;
            if ((!settings.radarr.url && process.env.RADARR_URL) || settings.radarr.url != process.env.RADARR_URL) settings.radarr.url = process.env.RADARR_URL;
            if ((!settings.radarr.apikey && process.env.RADARR_KEY) || settings.radarr.apikey != process.env.RADARR_KEY) settings.radarr.apikey = process.env.RADARR_KEY;
            if ((!settings.radarr.defaultProfile && process.env.RADARR_PROFILE_NAME) || settings.radarr.defaultProfile != process.env.RADARR_PROFILE_NAME) settings.radarr.defaultProfile = process.env.RADARR_PROFILE_NAME;
            if ((!settings.radarr.defaultRoot && process.env.RADARR_ROOT_PATH) || settings.radarr.defaultRoot != process.env.RADARR_ROOT_PATH) settings.radarr.defaultRoot = process.env.RADARR_ROOT_PATH;
            if ((!settings.plex.url && process.env.PLEX_URL) || settings.plex.url != process.env.PLEX_URL) settings.plex.url = process.env.PLEX_URL;
            if ((!settings.plex.machineId && process.env.PLEX_MACHINE_ID) || settings.plex.machineId != process.env.PLEX_MACHINE_ID) settings.plex.machineId = process.env.PLEX_MACHINE_ID;
            if (!settings.tautulli.url || !settings.tautulli.apikey) { console.log('Settings not configured. Tautulli unconfigured'); console.log(settings.tautulli); process.exit(1); }
            if (!settings.sonarr.url || !settings.sonarr.apikey || !settings.sonarr.defaultProfile || !settings.sonarr.defaultRoot) { console.log('Settings not configured. Sonarr unconfigured'); console.log(settings.sonarr); process.exit(1); }
            if (!settings.radarr.url || !settings.radarr.apikey || !settings.radarr.defaultProfile || !settings.radarr.defaultRoot) { console.log('Settings not configured. Radarr unconfigured'); console.log(settings.radarr); process.exit(1); }
            if (!settings.plex.url) { console.log('Settings not configured. Plex unconfigured'); console.log(settings.plex); process.exit(1); }
            this._saveSettings(filePath, settings);
            return settings;
        } catch (err) {
            if (err.name == "SyntaxError") { console.log('There was an error loading your settings.json, please go back and verify the file is correct'); process.exit(1); }
            // Check if all necessary envrionment variables are available
            console.error(err.message);
            this.settings = this._makeSettings(filePath);
            return this.settings;
        }
    }
}