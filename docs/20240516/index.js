/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
import * as Interface from "https://scotwatson.github.io/WebInterface/20240316/interface.mjs";
import * as Messaging from "https://scotwatson.github.io/WebInterface/20240316/window-messaging.mjs";

function start() {
  const controllerRPS = Messaging.createRemoteProcedureSocket({
    messageSource: Messaging.controllerSource,
    messageSink: Messaging.controllerSink,
    timeout: 500,
  });
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
        timeout: 500,
      });
      parentRPS.register({
        functionName: "ping",
        handlerFunc: function (args) {
          return "Hello!";
        },
      });
      Messaging.enqueueMessage(info);
    });
    myMessageQueue.addEventListener(Messaging.messageHandler);
    myMessageQueue.addEventListener(console.log);
    myMessageQueue.start();
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
      timeout: 500,
    });
    Messaging.untrustedOrigin.next().then(function () {
      throw "Received message from unrecognized source";
    });
//    thisIframe.contentWindow.addEventListener("load", function () {
    thisIframe.addEventListener("load", function () {
      RPC();
      async function RPC() {
        console.log("RPC");
        pinging();
        function pinging() {
          console.log("try to ping iframe");
          const ret = iframeRPS.call({
            functionName: "ping",
            args: {},
          });
          return ret.then(console.log, function () {
            console.log("iframe ping failed, retry");
            return pinging();
          });
        }
      }
    });
    myMessageQueue.addEventListener(Messaging.messageHandler);
    myMessageQueue.addEventListener(console.log);
    myMessageQueue.start();
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
      timeout: 250,
    });
    workerRPC();
    async function workerRPC() {
      console.log("worker RPC");
      pinging();
      function pinging() {
        console.log("try to ping worker");
        const ret = workerRPS.call({
          functionName: "ping",
          args: {},
        });
        return ret.then(console.log, function () {
          console.log("worker ping failed, retry");
          return pinging();
        });
      }
    }
    controllerRPC();
    async function controllerRPC() {
      console.log("controller RPC");
      pinging();
      function pinging() {
        console.log("try to ping controller");
        const ret = controllerRPS.call({
          functionName: "ping",
          args: {},
        });
        return ret.then(console.log, function () {
          console.log("controller ping failed, retry");
          return pinging();
        });
      }
    }
  }
}
