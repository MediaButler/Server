const settingsService = require('./settingsService');
const ss = new settingsService();
const settings = ss.getSettings();
const notificationService = require('../service/notificationService');
let tautulli = false;
let sonarr = false;
let radarr = false;
let request = false;
let rules = false;
let adminPlex = false;

module.exports = class settingsService {
  static get tautulliService() {
    return tautulli;
  }

  static set tautulliService(data) {
    tautulli = data;
  }

  static get sonarrService() {
    return sonarr;
  }

  static set sonarrService(data) {
    sonarr = data;
  }

  static get radarrService() {
    return radarr;
  }

  static set radarrService(data) {
    radarr = data;
  }

  static get requestService() {
    return request;
  }

  static set requestService(data) {
    request = data;
  }

  static get settingsService() {
    return ss;
  }

  static get adminPlexService() {
    return adminPlex;
  }

  static set adminPlexService(data) {
    adminPlex = data;
  }

  static get rulesService() {
    return rules;
  }

  static set rulesService(data) {
    rules = data;
  }

  static get notificationService() {
    return notificationService;
  }

  static get settings() {
    return settings;
  }
}