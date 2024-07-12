const mockSocket = require("mock-socket");

class WebSocket extends mockSocket.WebSocket {
  // mock-socket's WebSocket does not support the 'on' method
  on(event, callback) {
    super.addEventListener(event, callback);
  }
}

module.exports = { WebSocket }