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
  const serviceWorkerFunctions = [];
  const registerBtn = document.createElement("button");
  registerBtn.innerHTML = "Register";
  document.body.appendChild(registerBtn);
  const unregisterBtn = document.createElement("button");
  unregisterBtn.innerHTML = "Unregister";
  document.body.appendChild(unregisterBtn);
  const updateBtn = document.createElement("button");
  updateBtn.innerHTML = "Update";
  document.body.appendChild(updateBtn);
  function addServiceWorker(serviceWorker) {
    if (serviceWorkerFunctions.some((value) => { return value === serviceWorker; })) {
      return;
    }
    const paragraph = document.createElement("p");
    const stateSpan = document.createElement("span");
    paragraph.appendChild(stateSpan);
    const controllerSpan = document.createElement("span");
    paragraph.appendChild(controllerSpan);
    const port = (() => {
      const channel = new MessageChannel();
      const messageSource = Messaging.createMessageSourceForMessagePort(channel.port1);
      const messageSink = Messaging.createMessageSinkForMessagePort(channel.port1);
      serviceWorker.postMessage({ action: "port", port: channel.port2 }, [ channel.port2 ] );
      return {
        messageSource,
        messageSink,
        start() {
          channel.port1.start();
        },
      }
    })();
    const rps = Messaging.createRemoteProcedureSocket({
      messageSource: port.messageSource,
      messageSink: port.messageSink,
      timeout: 1000,
    });
    port.start();
    const skipWaitingBtn = document.createElement("button");
    skipWaitingBtn.innerHTML = "Skip Waiting";
    paragraph.appendChild(skipWaitingBtn);
    const claimClientsBtn = document.createElement("button");
    claimClientsBtn.innerHTML = "Claim Clients";
    paragraph.appendChild(claimClientsBtn);
    const unregisterBtn = document.createElement("button");
    unregisterBtn.innerHTML = "Unregister";
    paragraph.appendChild(unregisterBtn);
    const updateBtn = document.createElement("button");
    updateBtn.innerHTML = "Update";
    paragraph.appendChild(updateBtn);
    const pingBtn = document.createElement("button");
    pingBtn.innerHTML = "Ping";
    paragraph.appendChild(pingBtn);
    document.body.appendChild(paragraph);
    skipWaitingBtn.addEventListener("click", (evt) => {
      rps.call({
        functionName: "skipWaiting",
        args: {},
      }).then(console.log, console.error);
    });
    claimClientsBtn.addEventListener("click", (evt) => {
      rps.call({
        functionName: "claimClients",
        args: {},
      }).then(console.log, console.error);
    });
    unregisterBtn.addEventListener("click", (evt) => {
      rps.call({
        functionName: "unregister",
        args: {},
      }).then(console.log, console.error);
    });
    updateBtn.addEventListener("click", (evt) => {
      rps.call({
        functionName: "update",
        args: {},
      }).then(console.log, console.error);
    });
    pingBtn.addEventListener("click", (evt) => {
      console.log("ping");
      rps.call({
        functionName: "ping",
        args: {},
      }).then(console.log, console.error);
    });
    serviceWorker.addEventListener("statechange", (evt) => {
      stateSpan.innerHTML = serviceWorker.state;
    });
    stateSpan.innerHTML = serviceWorker.state;
    serviceWorker.addEventListener("error", console.error);
    const ret = {
      serviceWorker,
      checkController() {
        const match = (serviceWorker === navigator.serviceWorker.controller);
        controllerSpan.innerHTML = match ? "*" : "";
        return match;
      },
    };
    serviceWorkerFunctions.push(ret);
    return ret;
  }
  navigator.serviceWorker.addEventListener("controllerchange", (evt) => {
    console.log("controllerchange", evt);
    newController();
  });
  let controllerRPS = null;
  function newController() {
    for (const serviceWorker of serviceWorkerFunctions) {
      serviceWorker.checkController();
    }
    addServiceWorker(navigator.serviceWorker.controller).checkController();
    controllerRPS = Messaging.createRemoteProcedureSocket({
      messageSource: Messaging.controllerSource,
      messageSink: Messaging.createMessageSinkForServiceWorker(navigator.serviceWorker.controller),
      timeout: 500,
    });
  }
  if (navigator.serviceWorker.controller !== null) {
    newController();
    registerBtn.disabled = true;
  } else {
    registerBtn.disabled = false;
  }
  function newRegistration(registration) {
    serviceWorkerRegistration = registration;
    registerBtn.disabled = false;
    unregisterBtn.disabled = !registration;
    updateBtn.disabled = !registration;
    serviceWorkerRegistration.addEventListener("updateFound", () => {
      console.log("updateFound");
    });
    if (serviceWorkerRegistration.installed) {
      addServiceWorker(serviceWorkerRegistration.installed);
    }
    if (serviceWorkerRegistration.waiting) {
      addServiceWorker(serviceWorkerRegistration.waiting);
    }
    if (serviceWorkerRegistration.active) {
      addServiceWorker(serviceWorkerRegistration.active);
    }
  }
  registerBtn.addEventListener("click", function () {
    Init.registerServiceWorker({
      url: serviceWorkerUrl,
      scope: serviceWorkerScope,
    }).then(newRegistration);
    registerBtn.disabled = true;
  });
  unregisterBtn.addEventListener("click", function () {
    serviceWorkerRegistration.unregister().then((success) => {
      if (success) {
        console.log("Unregistered");
        newRegistration(null);
        refreshButtons();
      } else {
        console.log("Unable to unregister");
      }
    }, console.error);
  });
  updateBtn.addEventListener("click", function () {
    serviceWorkerRegistration.update().then((registration) => {
      newRegistration(registration);
      console.log("Updated");
      refreshButtons();
    }, console.error);
  });
  unregisterBtn.disabled = true;
  updateBtn.disabled = true;
  function refreshButtons() {
    if (serviceWorkerRegistration.installed) {
      console.log("registration.installed present");
    } else {
      console.log("registration.installed not present");
    }
    if (serviceWorkerRegistration.waiting) {
      console.log("registration.waiting present");
    } else {
      console.log("registration.waiting not present");
    }
    if (serviceWorkerRegistration.active) {
      console.log("registration.active present");
    } else {
      console.log("registration.active not present");
    }
  }
  Init.controller.then(controllerRPC);
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
