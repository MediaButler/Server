// Sends and receives notifictions
// Only one exists
let constant = null;
const userSockets = {};
module.exports = class notifictionService {
  static get agent() {
    return constant;
  }

  static get sockets() {
    return userSockets;
  }

  static set agent(value) {
    constant = value;
  }

  static emit(area, msg) {
      return constant.emit(area, msg);
  }
}