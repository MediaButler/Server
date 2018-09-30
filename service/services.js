const settingsService = require('./settingsService');
const ss = new settingsService();
const settings = ss.getSettings();
const notificationService = require('../service/notificationService');
let tautulli = false;
let sonarr = false;
let sonarr4k = false;
let radarr = false;
let radarr3d = false;
let radarr4k = false;
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

  static get sonarr4kService() {
    return sonarr4k;
  }

  static set sonarr4kService(data) {
    sonarr4k = data;
  }

  static get radarrService() {
    return radarr;
  }

  static set radarrService(data) {
    radarr = data;
  }

  static get radarr3dService() {
    return radarr3d;
  }

  static set radarr3dService(data) {
    radarr3d = data;
  }

  static get radarr4kService() {
    return radarr4k;
  }

  static set radarr4kService(data) {
    radarr4k = data;
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