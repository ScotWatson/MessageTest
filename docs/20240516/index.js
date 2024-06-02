/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
import * as Common from "https://scotwatson.github.io/WebInterface/common.mjs";
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
  thisIframe.style.display = "block";
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
  const serviceWorkerObjects = [];
  const serviceWorkerDiv = document.createElement("div");
  document.body.appendChild(serviceWorkerDiv);
  function scanForServiceWorkers() {
    console.log("scanForServiceWorkers");
    let installing = null;
    let waiting = null;
    let active = null;
    for (const obj of serviceWorkerObjects) {
      console.log(obj.serviceWorker.state);
      switch (obj.serviceWorker.state) {
        case "installing": {
          installing = obj;
        }
          break;
        case "installed": { // waiting
          waiting = obj;
        }
          break;
        case "activating":
        case "activated": { // active
          active = obj;
        }
          break;
        default: {
          // other
        }
          break;
      }
    }
    if (serviceWorkerRegistration.installing) {
      console.log("has installing");
    } else {
      console.log("no installing");
    }
    if (serviceWorkerRegistration.waiting) {
      console.log("has waiting");
    } else {
      console.log("no waiting");
    }
    if (serviceWorkerRegistration.active) {
      console.log("has active");
    } else {
      console.log("no active");
    }
    if (serviceWorkerRegistration.installing && !installing) {
      installing = addServiceWorker(serviceWorkerRegistration.installing);
    }
    if (serviceWorkerRegistration.waiting && !waiting) {
      waiting = addServiceWorker(serviceWorkerRegistration.waiting);
    }
    if (serviceWorkerRegistration.active && !active) {
      active = addServiceWorker(serviceWorkerRegistration.active);
    }
    serviceWorkerDiv.innerHTML = "";
    const installingPara = document.createElement("p");
    serviceWorkerDiv.appendChild(installingPara);
    const waitingPara = document.createElement("p");
    serviceWorkerDiv.appendChild(waitingPara);
    const activePara = document.createElement("p");
    serviceWorkerDiv.appendChild(activePara);
    const otherServiceWorkerDiv = document.createElement("div");
    serviceWorkerDiv.appendChild(otherServiceWorkerDiv);
    installingPara.innerHTML = "";
    installingPara.append("installing: ");
    waitingPara.innerHTML = "";
    waitingPara.append("waiting: ");
    activePara.innerHTML = "";
    activePara.append("active: ");
    for (const obj of serviceWorkerObjects) {
      obj.dom.remove();
    }
    if (installing) {
      installingPara.appendChild(installing.dom);
    } else {
      installingPara.append("<none>");
    }
    if (waiting) {
      waitingPara.appendChild(waiting.dom);
    } else {
      waitingPara.append("<none>");
    }
    if (active) {
      activePara.appendChild(active.dom);
    } else {
      activePara.append("<none>");
    }
    for (const obj of serviceWorkerObjects) {
      if ((obj !== installing) && (obj !== waiting) && (obj !== active)) {
        const p = document.createElement("p");
        p.appendChild(obj.dom);
        otherServiceWorkerDiv.appendChild(p);
      }
    }
  }
  const register1Btn = document.createElement("button");
  register1Btn.innerHTML = "Register 1";
  document.body.appendChild(register1Btn);
  const register2Btn = document.createElement("button");
  register2Btn.innerHTML = "Register 2";
  document.body.appendChild(register2Btn);
  const unregisterBtn = document.createElement("button");
  unregisterBtn.innerHTML = "Unregister";
  document.body.appendChild(unregisterBtn);
  const updateBtn = document.createElement("button");
  updateBtn.innerHTML = "Update";
  document.body.appendChild(updateBtn);
    /*
    Messaging.setServiceWorkerHeartbeat({
      serviceWorker,
      interval: 5000,
    });
    */
  function addServiceWorker(serviceWorker) {
    const obj = {
      serviceWorker,
    };
    serviceWorkerObjects.push(obj);
    obj.dom = document.createElement("span");
    const paragraph = obj.dom;
    const idSpan = document.createElement("span");
    idSpan.append(self.crypto.randomUUID());
    paragraph.appendChild(idSpan);
    const stateSpan = document.createElement("span");
    paragraph.appendChild(stateSpan);
    const controllerSpan = document.createElement("span");
    paragraph.appendChild(controllerSpan);
    const heartbeatBtn = document.createElement("button");
    heartbeatBtn.innerHTML = "Heartbeat";
    paragraph.appendChild(heartbeatBtn);
    const portBtn = document.createElement("button");
    portBtn.innerHTML = "Port";
    paragraph.appendChild(portBtn);
    const portBtnsSpan = document.createElement("span");
    paragraph.appendChild(portBtnsSpan);
    serviceWorker.addEventListener("statechange", (evt) => {
      stateSpan.innerHTML = serviceWorker.state;
    });
    stateSpan.innerHTML = serviceWorker.state;
    obj.checkController = () => {
      const match = (serviceWorker === navigator.serviceWorker.controller);
      controllerSpan.innerHTML = match ? "*" : "";
      return match;
    };
    heartbeatBtn.addEventListener("click", (evt) => {
      console.log("send heartbeat");
      serviceWorker.postMessage("heartbeat");
    });
    portBtn.addEventListener("click", (evt) => {
      obj.addPort();
    });
    serviceWorker.addEventListener("error", console.error);
    obj.addPort = () => {
      portBtnsSpan.innerHTML = "";
      obj.port = (() => {
        const channel = new MessageChannel();
        const messageSource = Messaging.createMessageSourceForMessagePort(channel.port1);
        const messageSink = Messaging.createMessageSinkForMessagePort(channel.port1);
        obj.serviceWorker.postMessage({ action: "port", port: channel.port2 }, [ channel.port2 ] );
        return {
          messageSource,
          messageSink,
          start() {
            channel.port1.start();
          },
        }
      })();
      obj.rps = Messaging.createRemoteProcedureSocket({
        messageSource: obj.port.messageSource,
        messageSink: obj.port.messageSink,
        timeout: 1000,
      });
      obj.rps.register({
        functionName: "ping",
        handlerFunc: (args) => { console.log(args); },
      });
      obj.port.start();
      const skipWaitingBtn = document.createElement("button");
      skipWaitingBtn.innerHTML = "Skip Waiting";
      portBtnsSpan.appendChild(skipWaitingBtn);
      const claimClientsBtn = document.createElement("button");
      claimClientsBtn.innerHTML = "Claim Clients";
      portBtnsSpan.appendChild(claimClientsBtn);
      const unregisterBtn = document.createElement("button");
      unregisterBtn.innerHTML = "Unregister";
      portBtnsSpan.appendChild(unregisterBtn);
      const updateBtn = document.createElement("button");
      updateBtn.innerHTML = "Update";
      portBtnsSpan.appendChild(updateBtn);
      const pingBtn = document.createElement("button");
      pingBtn.innerHTML = "Ping";
      portBtnsSpan.appendChild(pingBtn);
      skipWaitingBtn.addEventListener("click", (evt) => {
        obj.rps.call({
          functionName: "skipWaiting",
          args: {},
        }).then(console.log, console.error);
      });
      claimClientsBtn.addEventListener("click", (evt) => {
        obj.rps.call({
          functionName: "claimClients",
          args: {},
        }).then(console.log, console.error);
      });
      unregisterBtn.addEventListener("click", (evt) => {
        obj.rps.call({
          functionName: "unregister",
          args: {},
        }).then(console.log, console.error);
      });
      updateBtn.addEventListener("click", (evt) => {
        obj.rps.call({
          functionName: "update",
          args: {},
        }).then(console.log, console.error);
      });
      pingBtn.addEventListener("click", (evt) => {
        console.log("ping");
        obj.rps.call({
          functionName: "ping",
          args: {},
        }).then(console.log, console.error);
      });
    };
    return obj;
  }
  let controllerRPS = null;
  (async () => {
    for await (const controller of Messaging.controllerchange) {
      console.log("controllerchange");
      scanForServiceWorkers();
      controllerRPS = Messaging.createRemoteProcedureSocket({
        messageSource: controller.messageSource,
        messageSink: controller.messageSink,
        timeout: 500,
      });
      register1Btn.disabled = true;
      register2Btn.disabled = true;
      controllerRPC();
    }
  })();
  register1Btn.disabled = false;
  register2Btn.disabled = false;
  function newRegistration(registration) {
    console.log("New Registration");
    serviceWorkerRegistration = registration;
    register1Btn.disabled = !!self.navigator.serviceWorker.controller;
    register2Btn.disabled = !!self.navigator.serviceWorker.controller;
    if (!registration) {
      unregisterBtn.disabled = true;
      updateBtn.disabled = true;
      return;
    }
    unregisterBtn.disabled = !registration;
    updateBtn.disabled = !registration;
    serviceWorkerRegistration.addEventListener("updateFound", () => {
      console.log("updateFound");
    });
    refreshButtons();
    scanForServiceWorkers();
  }
  self.navigator.serviceWorker.getRegistration().then(newRegistration);
  self.navigator.serviceWorker.ready.then(newRegistration);
  register1Btn.addEventListener("click", () => {
    Init.registerServiceWorker({
      url: serviceWorkerUrl + "?v=1",
      scope: serviceWorkerScope,
    }).then(newRegistration, console.error);
    register1Btn.disabled = true;
  });
  register2Btn.addEventListener("click", () => {
    Init.registerServiceWorker({
      url: serviceWorkerUrl + "?v=2",
      scope: serviceWorkerScope,
    }).then(newRegistration, console.error);
    register2Btn.disabled = true;
  });
  unregisterBtn.addEventListener("click", () => {
    serviceWorkerRegistration.unregister().then((success) => {
      if (success) {
        console.log("Unregistered");
        newRegistration(null);
      } else {
        console.log("Unable to unregister");
      }
    }, console.error);
  });
  updateBtn.addEventListener("click", () => {
    serviceWorkerRegistration.update().then((registration) => {
      console.log("Updated");
      newRegistration(registration);
    }, console.error);
  });
  unregisterBtn.disabled = true;
  updateBtn.disabled = true;
  function refreshButtons() {
    if (serviceWorkerRegistration.installing) {
      console.log("registration.installing present");
    } else {
      console.log("registration.installing not present");
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
