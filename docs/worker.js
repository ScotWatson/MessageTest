/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict"

console.log("worker start");

self.importScripts("https://scotwatson.github.io/WebInterface/worker-import-script.js")
const MessageQueue = self.importScript("https://scotwatson.github.io/WebInterface/MessageQueue.js").default;
const myMessageQueue = new MessageQueue(self);
self.addEventListener("message", console.log)

setInterval(print, 1000);

function print() {
  console.log("Worker is running.");
}

const moduleUrls = [
  "https://scotwatson.github.io/WebInterface/worker-global.mjs",
  "https://scotwatson.github.io/WebInterface/streams.mjs",
];
const loading = Promise.all(moduleUrls.map((url) => { return import(url); }));

loading.then(([ Messaging, Streams ]) => {
  const parentSource = Messaging.createMessageSourceForMessagePort(myMessageQueue);
  const parentSink = Messaging.createMessageSinkForMessagePort(self);
  const parentRPS = Messaging.createRemoteProcedureSocket({
    messageSource: parentSource,
    messageSink: parentSink,
  });
  
  parentRPS.register({
    functionName: "ping",
    handlerFunc: function ping() {
      return "Hello from Worker!";
    },
  });
  console.log("worker ready for ping");
  myMessageQueue.start();
});
