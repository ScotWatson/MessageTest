/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

importScripts("https://scotwatson.github.io/WebInterface/worker-import-script.js");

const Messaging = self.importScript("https://scotwatson.github.io/WebInterface/service-worker-messaging.js");

(async function () {
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
  }
})();

const selfUrl = new URL(self.location);

self.addEventListener("install", function (e) {
  console.log("sw.js: Start Installing");
  function addCaches(cache) {
  }
  self.skipWaiting();
  e.waitUntil(caches.open("store").then(addCaches));
});

self.addEventListener("activate", function (e) {
  console.log("sw.js: Start Activating");
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  function sendResponse(response) {
    return response || fetch(e.request);
  }
  e.respondWith(caches.match(e.request).then(sendResponse));
});
