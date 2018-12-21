module.exports = class BadRequestError extends Error {
	constructor(message, extra = false) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = 'BadRequest';
		if (extra) this.extra = extra;
	}
};