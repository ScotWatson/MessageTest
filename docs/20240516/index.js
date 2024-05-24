/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
const loadInterface = import("https://scotwatson.github.io/WebInterface/20240316/interface.mjs");
const loadMessaging = import("https://scotwatson.github.io/WebInterface/20240316/window-messaging.mjs");

Promise.all( [ loadInterface, loadMessaging ] ).then(start, fail);

function fail(err) {
  console.error(err);
}

function start( [ Interface, Messaging ] ) {
  const windowURL = new URL(window.location);
  const subURL = "./index.html#sub";
  const subFullURL = new URL(subURL, windowURL);
  if (windowURL.hash === "#sub") {
    Messaging.untrustedOrigin.next().then(function (iterator) {
      const info = iterator.value;
      const window = info.window;
      const origin = info.origin;
      Messaging.addTrustedOrigin(info.origin);
      const parentSource = Messaging.createMessageSourceForWindowOrigin({
        window: info.source,
        origin: info.origin,
      });
      const parentSink = Messaging.createMessageSinkForWindowOrigin({
        window: info.source,
        origin: info.origin,
      });
      const parentRPS = Messaging.createRemoteProcedureSocket({
        messageSource: parentSource,
        messageSink: parentSink,
      });
      parentRPS.register({
        functionName: "ping",
        handlerFunc: function (args) {
          return "Hello!";
        },
      });
      Messaging.enqueueWindowMessage(info);
    });
  } else {
    Messaging.addTrustedOrigin(windowURL.origin);
    const thisIframe = document.createElement("iframe");
    document.body.appendChild(thisIframe);
    thisIframe.src = subURL;
    thisIframe.style.visibility = "hidden";
    const iframeSource = Messaging.createMessageSourceForWindowOrigin({
      window: thisIframe.contentWindow,
      origin: subFullURL.origin,
    });
    const iframeSink = Messaging.createMessageSinkForWindowOrigin({
      window: thisIframe.contentWindow,
      origin: subFullURL.origin,
    });
    const iframeRPS = Messaging.createRemoteProcedureSocket({
      messageSource: iframeSource,
      messageSink: iframeSink,
    });
    Messaging.untrustedOrigin.next().then(function () {
      throw "Received message from unrecognized source";
    });
//    thisIframe.contentWindow.addEventListener("load", function () {
    thisIframe.addEventListener("load", function () {
      setTimeout(RPC, 1000);
      async function RPC() {
        console.log("RPC");
        try {
          const ret = await iframeRPS.call({
            functionName: "ping",
            args: {},
          });
          console.log(ret);
        } catch (reason) {
          console.error(reason);
        }
      }
    });
    const thisWorker = new Worker("worker.js");
    const workerSource = Messaging.createMessageSourceForWorker({
      worker: thisWorker,
    });
    const workerSink = Messaging.createMessageSinkForWorker({
      worker: thisWorker,
    });
    const workerRPS = Messaging.createRemoteProcedureSocket({
      messageSource: workerSource,
      messageSink: workerSink,
    });
    (async function workerRPC() {
      console.log("worker RPC");
      try {
        console.log("calling worker...");
        const ret = await workerRPS.call({
          functionName: "ping",
          args: {},
        });
        console.log("return from worker...");
        console.log(ret);
      } catch (reason) {
        console.error(reason);
      }
    })();
  }
}
