var mongoose = require('mongoose');
var TVShowSchema = new mongoose.Schema({

    // IDs
    tvdbId: String,
    tvMazeId: String,
    tvRageId: String,
    imdbId: String,
    traktId: String,

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
    ratings: [String],
    tags: [String],
    status: String,
    network: String,
    airTime: String,
    firstAired: Date,
    prevAirtime: Date,
    nextAirtime: Date,
    seasonCount: Number,
    episodeCount: Number,
    images: [Object],

    // Maintenance
    lastUpdated: { type: Date, default: Date.now },

});
mongoose.model('TVShow', TVShowSchema);
module.exports = mongoose.model('User');