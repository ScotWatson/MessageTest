/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Exceptions thrown during parsing cause register promise to reject
console.log("sw.js: Start Parsing");

const version = "20240516";

const searchParams = (new URL(self.location.toString())).searchParams;

importScripts("https://scotwatson.github.io/WebInterface/worker-import-script.js");
const Global = self.importScript("https://scotwatson.github.io/WebInterface/service-worker-global.js");

// On Firefox, self.serviceWorker does not exist for serviceWorkerGlobalScope, despite Section 4.1.3 of W3C Service Workers
/*
if (!self.serviceWorker) {
  self.serviceWorker = {
    scriptURL: self.location.toString(),
    state: "parsing",
    postMessage() {
      throw "Unable to send messages to service workers";
    },
  };
  self.addEventListener("install", (e) => {
    self.serviceWorker.state = "installing";
  });
  self.addEventListener("activate", (e) => {
    self.serviceWorker.state = "activating";
  });
}
*/

const clientInfo = new Map();

function analyzeObject(obj) {
  switch (typeof obj) {
    case "object": {
      if (obj === null) {
        return "null";
      } else {
        let ret = {};
        ret["_constructor_name"] = obj.constructor.name;
        for (const propName in obj) {
          if (obj[propName] === obj) {
            ret[propName] = "self";
          } else {
            ret[propName] = analyzeObject(obj[propName]);
          }
        }
        return ret;
      }
    }
    default:
      return typeof obj;
  };
}

function newClientInfo() {
  return {
    messageNode: null,
    messageRpcNode: null,
    messageInputPipe: null,
    messageOutputPipe: null,
  };
}

function nonCallHandler(clientId) {
  return (data) => {
    switch (typeof data) {
      case "object": {
        if (data === null) {
          // Heartbeat, no response
        } else {
          switch (evt.data.constructor.name) {
            case "Object": {
              handleObject(obj);
            }
              break;
            case "MessagePort": {
              let thisClientInfo = clientInfo.get(clientId);
              if (thisClientInfo.messageNode) {
                // Disconnects rps from message node
                thisClientInfo.messageInputPipe.return();
                // Send undefined to indicate the socket is no longer used
                thisClientInfo.messageOutputPipe.return();
              }
              thisClientInfo.messageNode = Global.Common.MessageNode.forMessagePort(data);
              thisClientInfo.messageRpsNode = new Global.Common.RemoteProcedureSocket({
              });
              thisClientInfo.messageInputPipe = new Global.Common.Streams.Pipe(thisClientInfo.messageNode.output, thisClientInfo.messageRpsNode.input);
              thisClientInfo.messageOutputPipe = new Global.Common.Streams.Pipe(thisClientInfo.messageRpsNode.output, thisClientInfo.messageNode.input);
              thisClientInfo.messageRpsNode.register({
                verb: "unregister",
                handlerFunc: async () => {
                  const success = await self.registration.unregister();
                  return success;
                }
              });
              thisClientInfo.messageRpsNode.register({
                verb: "update",
                handlerFunc: async () => {
                  const newRegistration = await self.registration.update();
                }
              });
              thisClientInfo.messageRpsNode.register({
                verb: "ping",
                handlerFunc: async () => {
                  return "Hello through port!";
                }
              });
              console.log("All Registered");
              setInterval(() => {
                thisClientInfo.messageRpsNode.call({
                  verb: "ping",
                  args: "Ping through Port!",
                });
              }, 2000);
              evt.data.start();
            }
              break;
            default: {
              // No response
            }
          }
        }
      }
        break;
      case "string": {
        switch (evt.data) {
          case "ping": {
            console.log("ping");
          }
            break;
          case "skipWaiting": {
            self.skipWaiting();
          }
            break;
          case "claimClients": {
            self.clients.claim();
          }
            break;
          default: {
            // Unrecognized command
            console.eror("Unrecognized command");
          }
            break;
        }
      }
        break;
      default: {
        // No response
      }
    }
  };
  function handleObject(obj) {
    if (!obj.action) {
      return;
    }
    switch (obj.action) {
      default:
        console.error("Unrecognized command", evt);
    }
  }
}

new Global.Common.Streams.Pipe({
  source: Global.newClientMessage,
  sink: new Global.Common.Streams.SinkNode((info) => {
    let thisClientInfo = clientInfo.get(info.source.id);
    if (!thisClientInfo) {
      thisClientInfo = newClientInfo();
      clientInfo.set(info.source.id, thisClientInfo);
    }
    thisClientInfo.clientNode = new Global.ClientNode({
      client: info.source,
    });
    thisClientInfo.clientRpcNode = new Global.Common.RPCNode({
    });
    thisClientInfo.clientInputPipe = new Global.Common.Streams.Pipe(thisClientInfo.clientNode.output, thisClientInfo.clientRpcNode.input);
    thisClientInfo.clientOutputPipe = new Global.Common.Streams.Pipe(thisClientInfo.clientRpcNode.output, thisClientInfo.clientNode.input);
    thisClientInfo.clientRpcNode.register({
      verb: "ping",
      handlerFunc: () => {
        return "Hello from Service Worker!";
      },
    });
    thisClientInfo.clientRpcNode.register({
      verb: "getVersion",
      handlerFunc: () => {
        return version;
      },
    });
    thisClientInfo.clientNonCallPipe = new Global.Common.Streams.Pipe(thisClientInfo.clientRpcNode.nonCall, new Global.Common.Streams.SinkNode(nonCallHandler(info.source.id)));
    clientInfo.set(info.source.id, thisClientInfo);
    Global.enqueueMessage(info);
  }),
  noCopy: true,
});

// Exceptions thrown from install cause state to become "redundant"
self.addEventListener("install", (e) => {
  console.log("sw.js: Start Installing");
  state = "installing";
  const installing = (() => {
    if (searchParams.get("fail") === "install") {
      return new Promise((_, reject) => { setTimeout(() => { reject("install fail"); }, 3000); });
    }
    return new Promise((resolve) => { setTimeout(resolve, 3000); });
  })();
  e.waitUntil(installing.then(() => {
//    state = "installed";
    console.log("sw.js: End Installing");
  }));
});

// Exceptions thrown from activate do NOT cause state to become "redundant" (continues to "activated")
self.addEventListener("activate", (e) => {
  console.log("sw.js: Start Activating");
  const activating = (() => {
    if (searchParams.get("fail") === "activate") {
      return new Promise((_, reject) => { setTimeout(() => { reject("activate fail"); }, 3000); });
    }
    return new Promise((resolve) => { setTimeout(resolve, 3000); });
  })();
  e.waitUntil(activating.then(() => {
//    state = "activated";
    console.log("sw.js: End Activating");
  }));
});

self.addEventListener("fetch", (e) => {
  function sendResponse(response) {
    return response || fetch(e.request);
  }
  e.respondWith(caches.match(e.request).then(sendResponse));
});

if (searchParams.get("fail") === "parse") {
  throw "parse fail";
}

console.log("sw.js: End Parsing");
