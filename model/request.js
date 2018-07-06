var mongoose = require('mongoose');
var RequestSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    status: { 
        type: Number, 
        required: true 
    },
    tvdbId: String,
    imdbId: String,
    musicBrainzId: String,
    goodReadsId: String,
    comicVineId: String,
    dateAdded: {
        type: Number,
        default: Date.now()
    },
    username: {
        type: String,
        required: true
    }
});
mongoose.model('Request', RequestSchema);
module.exports = mongoose.model('Request');