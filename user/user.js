var mongoose = require('mongoose');  
var UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  discordId: String,
  mbId: String,
  guilds: mongoose.Schema.Types.Mixed,
  settings: [{ 
      name: String,
      defaultTVEngine: String,
      defaultMovieEngine: String,
      defaultMusicEngine: String,
      defaultStreamEngine: String,
      plex: {
          uuid: String,
          url: String,
          token: String,
      },
      emby: {
          url: String,
          token: String,
      },
      tautulli: {
          url: String,
          apikey: String,
      },
      sonarr: {
          url: String,
          apikey: String,
          rootpath: String,
          profile: String,
      },
      radarr: {
          url: String,
          apikey: String,
          rootpath: String,
          profile: String,
      },
      lidarr: {
          url: String,
          apikey: String,
          rootpath: String,
          profile: String,
      },


  }]
});
mongoose.model('User', UserSchema);
module.exports = mongoose.model('User');