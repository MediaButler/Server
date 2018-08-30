const services = require('../service/services');
const plexService = require('../service/plexService');
const settingsService = require('../service/settingsService');
const express = require('express');

module.exports = class basePlugin {
    constructor(info, app) {
        this.app = app;
        this.info = info;
        this.logService = false; // For logService so we can keep track of who did what.
        this.enabled = false;
    }

    async startup() {
        // Area to setup hooks and timers
    }

    async route() {
        throw new Error('Base class does not contain implementation');
    }

    async hook() {
        return false;
    }

    async shutdown() {

    }

    async saveSettings(settings) {
        try {
            const ss = new settingsService();
            const oldSettings = ss.getSettings();
            oldSettings[this.info.name] = settings;
            await ss._saveSettings(oldSettings);
            return true;
        } catch (err) { return false; }
    }
}