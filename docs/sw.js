/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

console.log("sw.js: Start Parsing");

//const searchParams = (new URL(self.serviceWorker.scriptURL)).searchParams;
const scriptURL = self.serviceWorker.scriptURL;
const searchParams = new Map();

importScripts("https://scotwatson.github.io/WebInterface/worker-import-script.js");
const Messaging = self.importScript("https://scotwatson.github.io/WebInterface/service-worker-messaging.js");

//Throws exception on Firefox
//self.serviceWorker.id = self.crypto.randomUUID();

let rps = null;
self.addEventListener("message", (evt) => {
  if (evt.data === "heartbeat") {
    console.log("internal keep-alive");
  }
  if (evt.data.packetId) {
    return;
  }
  if (!evt.data.action) {
    return;
  }
  switch (evt.data.action) {
    case "port": {
      console.log("Creating rps...");
      rps = Messaging.createRemoteProcedureSocket({
        messageSource: Messaging.createMessageSourceForMessagePort(evt.data.port),
        messageSink: Messaging.createMessageSinkForMessagePort(evt.data.port),
      });
      rps.register({
        functionName: "skipWaiting",
        handlerFunc: async () => {
          await self.skipWaiting();
        },
      });
      rps.register({
        functionName: "claimClients",
        handlerFunc: async () => {
          await self.clients.claim();
        },
      });
      rps.register({
        functionName: "unregister",
        handlerFunc: async () => {
          const success = await self.registration.unregister();
          return success;
        }
      });
      rps.register({
        functionName: "update",
        handlerFunc: async () => {
          const newRegistration = await self.registration.update();
        }
      });
      rps.register({
        functionName: "ping",
        handlerFunc: async () => {
          return "Hello through port!";
        }
      });
      console.log("All Registered");
      evt.data.port.start();
      setInterval(() => {
        rps.call({
          functionName: "ping",
          args: "Ping through Port!",
        });
      }, 2000);
    }
      break;
    default:
      console.error("Unrecognized command", evt);
  }
});


(async () => {
  for await (const info of Messaging.newClientMessage) {
    const newSource = Messaging.createClientSource({
      client: info.source,
    });
    const newSink = Messaging.createClientSink({
      client: info.source,
    });
    const newRPS = Messaging.createRemoteProcedureSocket({
      messageSource: newSource,
      messageSink: newSink,
    });
    newRPS.register({
      functionName: "ping",
      handlerFunc: function () {
        return "Hello from Service Worker!";
      },
    });
    console.log("controller ready for ping");
    Messaging.enqueueMessage(info);
  }
})();

const selfUrl = new URL(self.location);

self.addEventListener("install", (e) => {
  console.log("sw.js: Start Installing");
  const installing = (() => {
    if (searchParams.get("fail") === "install") {
      return new Promise((_, reject) => { setTimeout(() => { reject("install fail"); }, 3000); });
    }
    return new Promise((resolve) => { setTimeout(resolve, 3000); });
  })();
  e.waitUntil(installing.then(() => {
    console.log("sw.js: End Installing");
  }));
});

self.addEventListener("activate", (e) => {
  console.log("sw.js: Start Activating");
  const activating = (() => {
    if (searchParams.get("fail") === "activate") {
      return new Promise((_, reject) => { setTimeout(() => { reject("activate fail"); }, 3000); });
    }
    return new Promise((resolve) => { setTimeout(resolve, 3000); });
  })();
  e.waitUntil(activating.then(() => {
    console.log("sw.js: End Activating");
  }));
});

self.addEventListener("fetch", (e) => {
  function sendResponse(response) {
    return response || fetch(e.request);
  }
  e.respondWith(caches.match(e.request).then(sendResponse));
});

//if (searchParams.get("fail") === "parse") {
//  throw "parse fail";
//}

console.log("sw.js: End Parsing");
