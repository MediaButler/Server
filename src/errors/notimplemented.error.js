module.exports = class NotImplemented extends Error {
	constructor() {
		super('Not Implemented');
		this.name = 'NotImeplemented';
	}    
};