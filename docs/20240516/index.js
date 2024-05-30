/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
import * as Interface from "https://scotwatson.github.io/WebInterface/20240316/interface.mjs";
import * as Messaging from "https://scotwatson.github.io/WebInterface/20240316/window-messaging.mjs";

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
        return "Hello from iframe!";
      },
    });
    Messaging.enqueueMessage(info);
  });
  myMessageQueue.addEventListener("message", Messaging.messageHandler);
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
  myMessageQueue.addEventListener("message", Messaging.messageHandler);
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

  let serviceWorkerRegistration = null;
  const registerBtn = document.createElement("button");
  registerBtn.innerHTML = "Register";
  registerBtn.disabled = false;
  document.body.appendChild(registerBtn);
  const unregisterBtn = document.createElement("button");
  unregisterBtn.innerHTML = "Unregister";
  unregisterBtn.disabled = true;
  document.body.appendChild(unregisterBtn);
  const updateBtn = document.createElement("button");
  updateBtn.innerHTML = "Update";
  document.body.appendChild(updateBtn);
  const skipWaitingBtn = document.createElement("button");
  skipWaitingBtn.innerHTML = "Skip Waiting";
  document.body.appendChild(skipWaitingBtn);
  const claimClientsBtn = document.createElement("button");
  claimClientsBtn.innerHTML = "Claim Clients";
  document.body.appendChild(claimClientsBtn);
  
  registerBtn.addEventListener("click", function () {
    Init.registerServiceWorker({
      url: serviceWorkerUrl,
      scope: serviceWorkerScope,
    }).then((x) => {
      serviceWorkerRegistration = x;
      serviceWorkerRegistration.addEventListener("updateFound", () => {
        console.log("updateFound");
        refreshButtons();
      });
      refreshButtons();
    }, console.error);
    registerBtn.disabled = true;
  });
  unregisterBtn.addEventListener("click", function () {
    serviceWorkerRegistration.unregister().then(() => {
      console.log("Unregistered");
      serviceWorkerRegistration = null;
      refreshButtons();
    }, console.error);
  });
  registerBtn.click();
  updateBtn.addEventListener("click", function () {
    serviceWorkerRegistration.update().then(() => {
      console.log("Updated");
      refreshButtons();
    }, console.error);
  });
  skipWaitingBtn.addEventListener("click", function () {
    serviceWorkerRegistration.waiting.postMessage("skipWaiting");
  });
  claimClientsBtn.addEventListener("click", function () {
    serviceWorkerRegistration.active.postMessage("claimClients");
  });
  function refreshButtons() {
    if (serviceWorkerRegistration.installed) {
      console.log("registration.installed present");
    } else {
      console.log("registration.installed not present");
    }
    if (serviceWorkerRegistration.waiting) {
      console.log("registration.waiting present");
      skipWaitingBtn.disabled = false;
    } else {
      console.log("registration.waiting not present");
      skipWaitingBtn.disabled = true;
    }
    if (serviceWorkerRegistration.active) {
      console.log("registration.active present");
      claimClientsBtn.disabled = false;
    } else {
      console.log("registration.active not present");
      claimClientsBtn.disabled = true;
    }
  }
  const controllerPara = document.createElement("p");
  document.body.appendChild(controllerPara);
  controllerPara.append("Controller");
  const controllerState = document.createElement("p");
  controllerPara.appendChild(controllerState);
  Init.controller.then(controllerRPC);
  async function controllerRPC() {
    console.log("controller RPC");
    controllerState.innerHTML = self.navigator.serviceWorker.controller.state;
    self.navigator.serviceWorker.controller.addEventListener("statechange", (newState) => {
      controllerState.innerHTML = newState;
    });
    const controllerRPS = Messaging.createRemoteProcedureSocket({
      messageSource: Messaging.controllerSource,
      messageSink: Messaging.controllerSink,
      timeout: 500,
    });
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
