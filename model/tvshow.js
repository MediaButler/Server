var mongoose = require('mongoose');
var TVShowSchema = new mongoose.Schema({

    // IDs
    tvdbId: String,
    tvMazeId: String,
    tvRageId: String,
    imdbId: String,
    traktId: String,
    sonarrId: String,

    // Naming
    title: String,
    alternativeTitle: [String],
    sortTitle: String, // all lower case
    cleanTitle: String, // lower case, no spaces

    // General Info
    overview: String,
    year: Number,
    certification: String,
    genres: [String],
    rating: String,
    status: String,
    network: String,
    airTime: String,
    firstAired: Date,
    prevAirtime: Date,
    nextAirtime: Date,
    seasonCount: Number,
    episodeCount: Number,
    images: [{ type: String, url: String}],
    monitoredSeasons: [Number],
    unmonitoredSeasons: [Number],

    // Maintenance
    lastUpdated: { type: Date, default: Date.now },
});
mongoose.model('TVShow', TVShowSchema);
module.exports = mongoose.model('TVShow');