// Sends and receives notifictions
// Only one exists
const settingsService = require('./settingsService');
const ss = new settingsService();
const settings = ss.getSettings();
const tautulliService = require('./tautulliService');
const sonarrService = require('./sonarrService');
const radarrService = require('./radarrService');
const requestService = require('./requestService');
//const rulesService = require('./rulesService');

const tautulli = new tautulliService(settings.tautulli);
const sonarr = new sonarrService(settings.sonarr);
const radarr = new radarrService(settings.radarr);
const request = new requestService();
//let rules = new rulesService();

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

  static get settings() {
      return settings;
  }
//   static get rulesService() {
//     return rules;
//   }
}