const services = require('../service/services');
const plexService = require('../service/plexService');
const express = require('express');

module.exports = class basePlugin {
    constructor(info) {
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
}