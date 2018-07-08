// Sends and receives notifictions
// Only one exists
let constant = null;
module.exports = class notifictionService {
  static get agent() {
    return constant;
  }

  static set agent(value) {
    constant = value;
  }

  static emit(area, msg) {
      return constant.emit(area, msg);
  }
}