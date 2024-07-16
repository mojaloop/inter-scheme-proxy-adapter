const mockSocket = require("mock-socket");

class WebSocket extends mockSocket.WebSocket {
  // Polyfill missing methods in mock-socket
  on(event, callback) {
    super.addEventListener(event, callback);
  }
  once(event, callback) {
    const wrapper = (...args) => {
      const modifiedArgs = args.map((arg) => {
        if (arg.data) return arg.data;
        return arg;
      });
      callback(...modifiedArgs);
      super.removeEventListener(event, wrapper);
    };
    super.addEventListener(event, wrapper);
  }
}

module.exports = { WebSocket }
