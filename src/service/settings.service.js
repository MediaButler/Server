const debug = require('debug')('mediabutler:settingsService');
const isDocker = require('is-docker');
const process = require('process');
const fs = require('fs');
const path = require('path');
const os = require('os');
//const __dirname = path.resolve();
const defaultSettings = {
	'plex': {
		'url': false
	},
	'database': false
};

class settingsService {
	constructor() {
		debug('Starting');
		if (isDocker()) this.filePath = path.join('/', 'config', 'settings.json');
		else this.filePath = path.join(os.homedir(), '.mediabutler', 'settings.json');
		this.settings = this._getSettings();
	}

	getSettings(section = false) {
		const dbg = debug.extend('getSettings');
		dbg('Getting settings');
		if (section) return eval(`this.settings.${section}`);
		else return this.settings;
	}

	getRoot() {
		const dbg = debug.extend('getRoot');
		dbg('Getting file root');
		return path.join(this.filePath, '../');
	}

	_saveSettings(settings) {
		const dbg = debug.extend('saveSettings');
		dbg('Saving settings');
		fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), () => {
			this.settings = settings;
			return settings;
		});
	}

	_makeSettings() {
		const dbg = debug.extend('makeSettings');
		dbg('Checking if file already exists');
		if (fs.existsSync(this.filePath)) throw new Error('Settings already exists');
		dbg('Loading default settings');
		const settings = defaultSettings;
		dbg('Initial overrides');
		if (process.env.URL !== undefined) settings.urlOverride = process.env.URL;
		if (process.env.PLEX_URL !== undefined) settings.plex.url = process.env.PLEX_URL;
		if (process.env.PLEX_MACHINE_ID !== undefined) settings.plex.machineId = process.env.PLEX_MACHINE_ID;
		dbg('Saving');
		if (!fs.existsSync(path.join(this.filePath, '../'))) fs.mkdirSync(path.join(this.filePath, '../'));
		fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), () => {
			this.settings = settings;
		});
		return settings;
	}

	_getSettings() {
		const dbg = debug.extend('_getSettings');
		try {
			dbg('Read settings');
			const settings = require(this.filePath) || this._makeSettings(this.filePath);

			dbg('Applying envrionment overrides');
			if (process.env.URL !== undefined) settings.urlOverride = process.env.URL;
			if ((!settings.plex.url && process.env.PLEX_URL !== undefined) || (process.env.PLEX_URL !== undefined && settings.plex.url != process.env.PLEX_URL)) settings.plex.url = process.env.PLEX_URL;
			if ((!settings.plex.machineId && process.env.PLEX_MACHINE_ID !== undefined) || (process.env.PLEX_MACHINE_ID !== undefined && settings.plex.machineId != process.env.PLEX_MACHINE_ID)) settings.plex.machineId = process.env.PLEX_MACHINE_ID;
			if (!settings.plex.url) { console.log('Settings not configured. Plex unconfigured'); process.exit(1); } // eslint-disable-line no-console

			dbg('Saving...');
			this._saveSettings(settings);
			this.settings = settings;
			return settings;
		} catch (err) {
			dbg(err);
			//if (err.name == 'SyntaxError') { console.log('There was an error loading your settings.json, please go back and verify the file is correct'); process.exit(1); } // eslint-disable-line no-console
			this.settings = this._makeSettings(this.filePath);
			return this.settings;
		}
	}
}
module.exports = new settingsService();