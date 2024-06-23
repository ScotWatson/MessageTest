/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
import * as Interface from "https://scotwatson.github.io/WebInterface/interface.mjs";
import * as Global from "https://scotwatson.github.io/WebInterface/window-global.mjs";

const windowURL = new URL(window.location);
const subURL = "./index.html#sub";
const subFullURL = new URL(subURL, windowURL);
if (windowURL.hash === "#sub") {
  Global.untrustedOrigin.next().then(function (iterator) {
    const info = iterator.value;
    const window = info.window;
    const origin = info.origin;
    Global.addTrustedOrigin(info.origin);
    const parentSocket = Global.forWindowOrigin({
      window: info.source,
      origin: info.origin,
    });
    const parentRPS = new Global.Common.RemoteProcedureSocket({
      timeout: 500,
    });
    Global.Common.Streams.pipe(parentSocket.output, parentRPS.input);
    Global.Common.pipe(parentRPS.output, parentSocket.input);
    parentRPS.register({
      functionName: "ping",
      handlerFunc: function (args) {
        return "Hello from iframe!";
      },
    });
    Global.enqueueMessage(info);
  });
  myMessageQueue.addEventListener("message", Global.messageHandler);
  myMessageQueue.start();
} else {
  Global.addTrustedOrigin(windowURL.origin);
  const thisIframe = document.createElement("iframe");
  document.body.appendChild(thisIframe);
  thisIframe.src = subURL;
  thisIframe.style.display = "block";
  thisIframe.style.visibility = "hidden";
  const iframeSocket = Global.forWindowOrigin({
    window: thisIframe.contentWindow,
    origin: subFullURL.origin,
  });
  const iframeRPS = new Global.Common.RemoteProcedureSocket({
    timeout: 500,
  });
  Global.Common.Streams.pipe(iframeSocket.output, iframeRPS.input);
  Global.Common.Streams.pipe(iframeRPS.output, iframeSocket.input);
  Global.untrustedOrigin.next().then(function () {
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
  myMessageQueue.addEventListener("message", Global.messageHandler);
  myMessageQueue.start();
  const thisWorker = new Worker("worker.js");
  const workerSocket = Global.forWorker({
    worker: thisWorker,
  });
  const workerRPS = new Global.Common.RemoteProcedureSocket({
    timeout: 250,
  });
  Global.Common.Streams.pipe(workerSocket.output, workerRPS.input);
  Global.Common.Streams.pipe(workerRPS.output, workerSocket.input);
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
  const installingPara = document.createElement("p");
  installingPara.append("installing: ");
  const installingSpan = document.createElement("span");
  installingPara.appendChild(installingSpan);
  serviceWorkerDiv.appendChild(installingPara);
  const waitingPara = document.createElement("p");
  waitingPara.append("waiting: ");
  const waitingSpan = document.createElement("span");
  waitingPara.appendChild(waitingSpan);
  serviceWorkerDiv.appendChild(waitingPara);
  const activePara = document.createElement("p");
  activePara.append("active: ");
  const activeSpan = document.createElement("span");
  activePara.appendChild(activeSpan);
  serviceWorkerDiv.appendChild(activePara);
  const otherServiceWorkerDiv = document.createElement("div");
  serviceWorkerDiv.appendChild(otherServiceWorkerDiv);
  document.body.appendChild(serviceWorkerDiv);
  let installing = null;
  let waiting = null;
  let active = null;
  function scanForServiceWorkers() {
    console.log("scanForServiceWorkers");
    installing = null;
    waiting = null;
    active = null;
    for (const obj of serviceWorkerObjects) {
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
    if (serviceWorkerRegistration !== null) {
      if (serviceWorkerRegistration.installing && !installing) {
        installing = addServiceWorker(serviceWorkerRegistration.installing);
      }
      if (serviceWorkerRegistration.waiting && !waiting) {
        waiting = addServiceWorker(serviceWorkerRegistration.waiting);
      }
      if (serviceWorkerRegistration.active && !active) {
        active = addServiceWorker(serviceWorkerRegistration.active);
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
    }
    for (const obj of serviceWorkerObjects) {
      obj.dom.remove();
    }
    installingSpan.innerHTML = "";
    if (installing) {
      installingSpan.appendChild(installing.dom);
    } else {
      installingSpan.append("<none>");
    }
    waitingSpan.innerHTML = "";
    if (waiting) {
      waitingSpan.appendChild(waiting.dom);
    } else {
      waitingSpan.append("<none>");
    }
    activeSpan.innerHTML = "";
    if (active) {
      activeSpan.appendChild(active.dom);
    } else {
      activeSpan.append("<none>");
    }
    for (const obj of serviceWorkerObjects) {
      obj.checkController();
      if ((obj !== installing) && (obj !== waiting) && (obj !== active)) {
        const p = document.createElement("p");
        p.appendChild(obj.dom);
        otherServiceWorkerDiv.appendChild(p);
      }
    }
    if (installing) {
      installing.serviceWorker.addEventListener("statechange", update);
    }
    if (waiting) {
      waiting.serviceWorker.addEventListener("statechange", update);
    }
    if (active) {
      active.serviceWorker.addEventListener("statechange", update);
    }
  }
  function update() {
    if (installing) {
      installing.serviceWorker.removeEventListener("statechange", update);
      console.log("installing new state: ", installing.serviceWorker.state);
    }
    if (waiting) {
      waiting.serviceWorker.removeEventListener("statechange", update);
      console.log("waiting new state: ", waiting.serviceWorker.state);
    }
    if (active) {
      active.serviceWorker.removeEventListener("statechange", update);
      console.log("active new state: ", active.serviceWorker.state);
    }
    scanForServiceWorkers();
  }
  const register1Btn = document.createElement("button");
  register1Btn.innerHTML = "Register 1";
  document.body.appendChild(register1Btn);
  const register2Btn = document.createElement("button");
  register2Btn.innerHTML = "Register 2";
  document.body.appendChild(register2Btn);
  const registerParseFailBtn = document.createElement("button");
  registerParseFailBtn.innerHTML = "Register Parse Fail";
  document.body.appendChild(registerParseFailBtn);
  const registerInstallFailBtn = document.createElement("button");
  registerInstallFailBtn.innerHTML = "Register Install Fail";
  document.body.appendChild(registerInstallFailBtn);
  const registerActivateFailBtn = document.createElement("button");
  registerActivateFailBtn.innerHTML = "Register Activate Fail";
  document.body.appendChild(registerActivateFailBtn);
  const unregisterBtn = document.createElement("button");
  unregisterBtn.innerHTML = "Unregister";
  document.body.appendChild(unregisterBtn);
  const updateBtn = document.createElement("button");
  updateBtn.innerHTML = "Update";
  document.body.appendChild(updateBtn);
  function newRegistration(registration) {
    console.log("New Registration");
    if (serviceWorkerRegistration === registration) {
      console.log("Same as previous registration");
    }
    serviceWorkerRegistration = registration;
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
    scanForServiceWorkers();
  }
  self.navigator.serviceWorker.getRegistration().then(newRegistration);
  register1Btn.disabled = false;
  register1Btn.addEventListener("click", () => {
    register1Btn.disabled = true;
    Init.registerServiceWorker({
      url: serviceWorkerUrl + "?v=1",
      scope: serviceWorkerScope,
    }).then((obj) => {
      const socket = Global.forMessagePort(obj.port);
      (async () => {
        for await (const message of socket.output) {
          console.log(message);
        }
      })();
      socket.start();
      newRegistration(obj.registration);
    }, (e) => {
      console.log("register 1 error");
      console.error(e);
    }).finally(() => {
      register1Btn.disabled = false;
    });
  });
  register2Btn.disabled = false;
  register2Btn.addEventListener("click", () => {
    register2Btn.disabled = true;
    Init.registerServiceWorker({
      url: serviceWorkerUrl + "?v=2",
      scope: serviceWorkerScope,
    }).then((obj) => {
      const socket = Global.Common.MessageSocket.forMessagePort(obj.port);
      new Global.Common.Streams.Pipe(socket.output, new Global.Common.Streams.SinkNode(console.log));
      obj.port.start();
      newRegistration(obj.registration);
    }, (e) => {
      console.log("register 2 error");
      console.error(e);
    }).finally(() => {
      register2Btn.disabled = false;
    });
  });
  registerParseFailBtn.disabled = false;
  registerParseFailBtn.addEventListener("click", () => {
    registerParseFailBtn.disabled = true;
    Init.registerServiceWorker({
      url: serviceWorkerUrl + "?fail=parse",
      scope: serviceWorkerScope,
    }).then((obj) => {
      const socket = Global.Common.MessageSocket.forMessagePort(obj.port);
      new Global.Common.Streams.Pipe(socket.output, new Global.Common.Streams.SinkNode(console.log));
      obj.port.start();
      newRegistration(obj.registration);
    }, (e) => {
      console.log("register parse fail error");
      console.error(e);
    }).finally(() => {
      registerParseFailBtn.disabled = false;
    });
  });
  registerInstallFailBtn.disabled = false;
  registerInstallFailBtn.addEventListener("click", () => {
    registerInstallFailBtn.disabled = true;
    Init.registerServiceWorker({
      url: serviceWorkerUrl + "?fail=install",
      scope: serviceWorkerScope,
    }).then((obj) => {
      const socket = Global.Common.MessageSocket.forMessagePort(obj.port);
      new Global.Common.Streams.Pipe(socket.output, new Global.Common.Streams.SinkNode(console.log));
      obj.port.start();
      newRegistration(obj.registration);
    }, (e) => {
      console.log("register install fail error");
      console.error(e);
    }).finally(() => {
      registerInstallFailBtn.disabled = false;
    });
  });
  registerActivateFailBtn.disabled = false;
  registerActivateFailBtn.addEventListener("click", () => {
    registerActivateFailBtn.disabled = true;
    Init.registerServiceWorker({
      url: serviceWorkerUrl + "?fail=activate",
      scope: serviceWorkerScope,
    }).then((obj) => {
      const socket = Global.Common.MessageSocket.forMessagePort(obj.port);
      new Global.Common.Streams.Pipe(socket.output, new Global.Common.Streams.SinkNode(console.log));
      obj.port.start();
      newRegistration(obj.registration);
    }, (e) => {
      console.log("register activate fail error");
      console.error(e);
    }).finally(() => {
      registerActivateFailBtn.disabled = false;
    });
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
    /*
    Global.setServiceWorkerHeartbeat({
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
    const querySpan = document.createElement("span");
    querySpan.append((new URL(serviceWorker.scriptURL)).searchParams);
    paragraph.appendChild(querySpan);
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
        const channel = new self.MessageChannel();
        const messageSocket = Global.Common.MessageSocket.forMessagePort(channel.port1);
        obj.serviceWorker.postMessage({ action: "port", port: channel.port2 }, [ channel.port2 ] );
        messageSocket.start = () => {
          channel.port1.start();
        };
        return messageSocket;
      })();
      obj.rps = new Global.Common.RemoteProcedureSocket({
        timeout: 1000,
      });
      new Global.Common.Streams.Pipe(obj.port.output, obj.rps.input);
      new Global.Common.Streams.Pipe(obj.rps.output, obj.port.input);
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
      const serviceWorkerExistsBtn = document.createElement("button");
      serviceWorkerExistsBtn.innerHTML = "serviceWorkerExists";
      portBtnsSpan.appendChild(serviceWorkerExistsBtn);
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
      serviceWorkerExistsBtn.addEventListener("click", (evt) => {
        console.log("serviceWorkerExists");
        obj.rps.call({
          functionName: "serviceWorkerExists",
          args: {},
        }).then(console.log, console.error);
      });
    };
    return obj;
  }
  let controllerRPS = null;
  (async () => {
    for await (const controller of Global.controllerchange) {
      console.log("controllerchange");
      scanForServiceWorkers();
      controllerRPS = new Global.Common.RemoteProcedureSocket({
        timeout: 500,
      });
      new Global.Common.Streams.Pipe(controller.messageSocket.output, controllerRPS.input);
      new Global.Common.Streams.Pipe(controllerRPS.output, controller.messageSocket.input);
      controllerRPC();
    }
  })();
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
