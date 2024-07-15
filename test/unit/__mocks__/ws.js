const mockSocket = require("mock-socket");

class WebSocket extends mockSocket.WebSocket {
  on(event, callback) {
    super.addEventListener(event, callback);
  }
}

module.exports = { WebSocket }