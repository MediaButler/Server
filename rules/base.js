module.exports = class baseRule {
    constructor(info) {
        this.info = info;
    }

    // Returns a boolean value.
    validate() {
        throw new Error('Base class does not contain implementation');
    }
}