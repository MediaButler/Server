// Sends and receives notifictions
// Only one exists
const settingsService = require('./settingsService');
const ss = new settingsService();
const settings = ss.getSettings();
const tautulliService = require('./tautulliService');
const sonarrService = require('./sonarrService');
const radarrService = require('./radarrService');
const requestService = require('./requestService');
const rulesService = require('./rulesService');
const plexService = require('./plexService');
let tautulli;
let sonarr;
let radarr;
let request;
let rules;
let adminPlex;

setTimeout(() => {
  adminPlex = new plexService(settings.plex, true);
  tautulli = new tautulliService(settings.tautulli);
  sonarr = new sonarrService(settings.sonarr);
  radarr = new radarrService(settings.radarr);
  request = new requestService(settings, sonarr, radarr, true);
  rules = new rulesService();
}, 2000);

module.exports = class settingsService {
  static get tautulliService() {
    return tautulli;
  }

  static get sonarrService() {
    return sonarr;
  }

  static get radarrService() {
    return radarr;
  }

  static get requestService() {
    return request;
  }

  static get settingsService() {
    return ss;
  }

  static get adminPlexService() {
    return adminPlex;
  }

  static get rulesService() {
    return rules;
  }

  static get settings() {
    return settings;
  }
}