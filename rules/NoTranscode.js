const baseRule = require('./base');

module.exports = class noTranscodeVideoRule extends baseRule {
    constructor() {
        const info = {
            id: 'b50441b5-04af-4f8c-ad4d-1f86f7c64c7d',
            name: 'NoTranscodeVideo',
            description: 'No Transcode Video Streams',
            reason: 'No Video Transcodes allowed.'
        };
        super(info);
    }

    // Returns a boolean value.
    validate(stream) {
        if (!stream.stream_container_decision) return false;
        return (stream.stream_container_decision == 'transcode');
    }
}