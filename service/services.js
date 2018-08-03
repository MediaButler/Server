// Sends and receives notifictions
// Only one exists
const settingsService = require('./settingsService');
const ss = new settingsService();
setTimeout(() =>{
  tautulli = new tautulliService(settings.tautulli);
  sonarr = new sonarrService(settings.sonarr);
  radarr = new radarrService(settings.radarr);
  request = new requestService();
  //rules = new rulesService();
}, 2000);
const settings = ss.getSettings();
const tautulliService = require('./tautulliService');
const sonarrService = require('./sonarrService');
const radarrService = require('./radarrService');
const requestService = require('./requestService');
//const rulesService = require('./rulesService');

let tautulli;
let sonarr;
let radarr;
let request;
//let rules;

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