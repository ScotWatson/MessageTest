/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

importScripts("https://scotwatson.github.io/WebInterface/worker-import-script.js");
const Messaging = self.importScript("https://scotwatson.github.io/WebInterface/service-worker-messaging.js");

//Throws exception on Firefox
//self.serviceWorker.id = self.crypto.randomUUID();

let rps = null;
self.addEventListener("message", (evt) => {
  if (typeof evt.data.action === "string") {
    switch (evt.data.action) {
      case "skipWaiting": {
        self.skipWaiting();
      }
        break;
      case "claimClients": {
        self.clients.claim();
      }
        break;
      case "unregister": {
        self.registration.unregister();
      }
        break;
      case "update": {
        self.registration.update();
      }
        break;
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
//        setInterval(() => {
          rps.call({
            functionName: "ping",
            args: "Ping through Port!",
          });
        }//, 2000);
      }
        break;
      default:
        console.error("Unrecognized command");
    }
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
  function addCaches(cache) {
  }
  e.waitUntil(caches.open("store").then(addCaches));
});

self.addEventListener("activate", (e) => {
  console.log("sw.js: Start Activating");
});

self.addEventListener("fetch", (e) => {
  function sendResponse(response) {
    return response || fetch(e.request);
  }
  e.respondWith(caches.match(e.request).then(sendResponse));
});
