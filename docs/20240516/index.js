/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
import * as Interface from "https://scotwatson.github.io/WebInterface/interface.mjs";
import * as Global from "https://scotwatson.github.io/WebInterface/window-global.mjs";

const controllerSource = Global.ServiceWorkers.createControllerSource(Init.controllerMessages);
const windowURL = new URL(window.location);
const subURL = "./index.html#sub";
const subFullURL = new URL(subURL, windowURL);
if (windowURL.hash === "#sub") {
  const parentAdder = new Global.Common.Streams.SinkNode((info) => {
    const window = info.window;
    const origin = info.origin;
    Global.addTrustedOrigin(info.origin);
    const parentSocket = Global.MessageNodeforWindowOrigin({
      window: info.source,
      origin: info.origin,
    });
    const parentRPCNode = new Global.Common.RPCNode({
    });
    (new Global.Common.Streams.Pipe(parentSocket.output, parentRPCNode.input)).catch((e) => {
      console.error("inward pipe inside iframe");
      console.error(e);
    });
    (new Global.Common.Streams.Pipe(parentRPCNode.output, parentSocket.input)).catch((e) => {
      console.error("outward pipe inside iframe");
      console.error(e);
    });
    parentRPCNode.register({
      verb: "ping",
      handlerFunc: function (args) {
        return "Hello from iframe!";
      },
    });
    Global.enqueueMessage(info);
  });
  (new Global.Common.Streams.Pipe({
    source: Global.untrustedOrigin,
    sink: parentAdder,
    noCopy: true,
  })).catch((e) => {
    console.error("untrusted origin handling inside iframe");
    console.error(e);
  });
  Init.windowMessages.addEventListener("message", Global.messageHandler);
  Init.windowMessages.start();
} else {
  Global.addTrustedOrigin(windowURL.origin);
  const thisIframe = document.createElement("iframe");
  document.body.appendChild(thisIframe);
  thisIframe.src = subURL;
  thisIframe.style.display = "block";
  thisIframe.style.position = "absolute";
  thisIframe.style.visibility = "hidden";
  const iframeSocket = Global.MessageNodeforWindowOrigin({
    window: thisIframe.contentWindow,
    origin: subFullURL.origin,
  });
  const iframeRPCNode = new Global.Common.RPCNode({
  });
  (new Global.Common.Streams.Pipe(iframeSocket.output, iframeRPCNode.input)).catch((e) => {
    console.error("inward pipe inside parent window");
    console.error(e);
  });
  (new Global.Common.Streams.Pipe(iframeRPCNode.output, iframeSocket.input)).catch((e) => {
    console.error("outward pipe inside parent window");
    console.error(e);
  });
  const sourceAdder = new Global.Common.Streams.SinkNode(() => { throw "Received message from unrecognized source"; });
  (new Global.Common.Streams.Pipe({
    source: Global.untrustedOrigin,
    sink: sourceAdder,
    noCopy: true,
  })).catch((e) => {
    console.error("untrusted origin handling inside parent window");
    console.error(e);
  });
//    thisIframe.contentWindow.addEventListener("load", function () {
  thisIframe.addEventListener("load", async () => {
    try {
      console.log("try to ping iframe");
      const reply = await iframeRPCNode.call({
        verb: "ping",
        args: {},
      });
      console.log(reply);
    } catch (e) {
      console.error(e);
      console.log("iframe ping failed");
    }
  });
  Init.windowMessages.addEventListener("message", Global.messageHandler);
  Init.windowMessages.start();
  const thisWorker = new Worker("worker.js");
  const workerMessageNode = Global.Common.MessageNode.forMessagePort(thisWorker);
  const workerRPCNode = new Global.Common.RPCNode({
  });
  new Global.Common.Streams.Pipe(workerMessageNode.output, workerRPCNode.input);
  new Global.Common.Streams.Pipe(workerRPCNode.output, workerMessageNode.input);
  (async () => {
    try {
      console.log("try to ping worker");
      const reply = await workerRPCNode.call({
        verb: "ping",
        args: {},
      });
      console.log(reply);
    } catch (e) {
      console.error(e);
      console.log("worker ping failed");
    }
  })();
  const serviceWorkers = [];
  const controllerDiv = document.createElement("p");
  document.body.appendChild(controllerDiv);
  function updateController() {
    if (Global.ServiceWorkers.hasController()) {
      controllerDiv.innerHTML = "Has Controller";
    } else {
      controllerDiv.innerHTML = "No controller";
    }
  }
  const serviceWorkerDiv = document.createElement("div");
  document.body.appendChild(serviceWorkerDiv);
  function refreshServiceWorkerList() {
    console.log("refreshServiceWorkerList");
    for (const obj of serviceWorkers) {
      obj.dom.remove();
    }
    for (const obj of serviceWorkers) {
      const p = document.createElement("p");
      p.appendChild(obj.dom);
      serviceWorkerDiv.appendChild(p);
    }
  }
  (async () => {
    const initialController = await Global.ServiceWorkers.getActive();
    console.log(initialController);
    console.log(initialController.scriptURL);
    console.log(initialController.state);
    addServiceWorker(initialController);
    refreshServiceWorkerList();
    updateController();
    self.navigator.serviceWorker.addEventListener("controllerchange", updateController);
  })();
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

  register1Btn.disabled = false;
  register1Btn.addEventListener("click", () => {
    register1Btn.disabled = true;
    Global.ServiceWorkers.installNew({
      url: serviceWorkerUrl + "?v=1",
      scope: serviceWorkerScope,
    }).then((serviceWorker) => {
      addServiceWorker(serviceWorker);
      refreshServiceWorkerList();
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
    Global.ServiceWorkers.installNew({
      url: serviceWorkerUrl + "?v=2",
      scope: serviceWorkerScope,
    }).then((obj) => {
      addServiceWorker(serviceWorker);
      refreshServiceWorkerList();
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
    Global.ServiceWorkers.installNew({
      url: serviceWorkerUrl + "?fail=parse",
      scope: serviceWorkerScope,
    }).then((obj) => {
      addServiceWorker(serviceWorker);
      refreshServiceWorkerList();
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
    Global.ServiceWorkers.installNew({
      url: serviceWorkerUrl + "?fail=install",
      scope: serviceWorkerScope,
    }).then((obj) => {
      addServiceWorker(serviceWorker);
      refreshServiceWorkerList();
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
    Global.ServiceWorkers.installNew({
      url: serviceWorkerUrl + "?fail=activate",
      scope: serviceWorkerScope,
    }).then((obj) => {
      addServiceWorker(serviceWorker);
      refreshServiceWorkerList();
    }, (e) => {
      console.log("register activate fail error");
      console.error(e);
    }).finally(() => {
      registerActivateFailBtn.disabled = false;
    });
  });
  unregisterBtn.addEventListener("click", () => {
    Global.ServiceWorkers.unregister().then((success) => {
      if (success) {
        console.log("Unregistered");
        newRegistration(null);
      } else {
        console.log("Unable to unregister");
      }
    }, console.error);
  });
  updateBtn.addEventListener("click", () => {
    Global.ServiceWorkers.update().then(refreshServiceWorkerList);
  });
//    Global.setServiceWorkerHeartbeat({
//      serviceWorker,
//      interval: 5000,
//    });
  function addServiceWorker(serviceWorker) {
    const obj = {
      serviceWorker,
    }
    serviceWorkers.push(obj);
    obj.dom = document.createElement("span");
    const idSpan = document.createElement("span");
    idSpan.append(self.crypto.randomUUID());
    obj.dom.appendChild(idSpan);
    const querySpan = document.createElement("span");
    querySpan.append((new URL(serviceWorker.scriptURL)).searchParams);
    obj.dom.appendChild(querySpan);
    const stateSpan = document.createElement("span");
    obj.dom.appendChild(stateSpan);
    const heartbeatBtn = document.createElement("button");
    heartbeatBtn.innerHTML = "Heartbeat";
    obj.dom.appendChild(heartbeatBtn);
    const portBtn = document.createElement("button");
    portBtn.innerHTML = "Port";
    obj.dom.appendChild(portBtn);
    const skipWaitingBtn = document.createElement("button");
    skipWaitingBtn.innerHTML = "Skip Waiting";
    obj.dom.appendChild(skipWaitingBtn);
    const claimClientsBtn = document.createElement("button");
    claimClientsBtn.innerHTML = "Claim Clients";
    obj.dom.appendChild(claimClientsBtn);
    const portBtnsSpan = document.createElement("span");
    obj.dom.appendChild(portBtnsSpan);
    serviceWorker.installed.then(() => { stateSpan.innerHTML = "installed"; });
    serviceWorker.activating.then(() => { stateSpan.innerHTML = "activating"; });
    serviceWorker.activated.then(() => { stateSpan.innerHTML = "activated"; });
    serviceWorker.redundant.then(() => { stateSpan.innerHTML = "redundant"; });
    stateSpan.innerHTML = serviceWorker.state;
    heartbeatBtn.addEventListener("click", (evt) => {
      serviceWorker.input.callback(null);
      serviceWorker.input.unlock();
    });
    portBtn.addEventListener("click", (evt) => {
      obj.addPort();
    });
    skipWaitingBtn.addEventListener("click", (evt) => {
      serviceWorker.input.callback("skipWaiting");
      serviceWorker.input.unlock();
    });
    claimClientsBtn.addEventListener("click", (evt) => {
      serviceWorker.input.callback("claimClients");
      serviceWorker.input.unlock();
    });
    obj.addPort = () => {
      portBtnsSpan.innerHTML = "";
      if (obj.port) {
        obj.inputPipe.return();
        obj.outputPipe.return();
      }
      const messageChannel = new MessageChannel();
      obj.port = messageChannel.port1;
      obj.serviceWorker.input.callback(messageChannel.port2);
      obj.serviceWorker.input.unlock();
      obj.rpcNode = new Global.Common.RPCNode({
      });
      obj.inputPipe = new Global.Common.Streams.Pipe(obj.port.output, obj.rpcNode.input);
      obj.outputPipe = new Global.Common.Streams.Pipe(obj.rpcNode.output, obj.port.input);
      obj.rpNode.register({
        verb: "ping",
        handlerFunc: (args) => { console.log(args); },
      });
      obj.port.start();
      const unregisterBtn = document.createElement("button");
      unregisterBtn.innerHTML = "Unregister";
      portBtnsSpan.appendChild(unregisterBtn);
      const updateBtn = document.createElement("button");
      updateBtn.innerHTML = "Update";
      portBtnsSpan.appendChild(updateBtn);
      const pingBtn = document.createElement("button");
      pingBtn.innerHTML = "Ping";
      portBtnsSpan.appendChild(pingBtn);
      unregisterBtn.addEventListener("click", (evt) => {
        obj.rpcNode.call({
          verb: "unregister",
          args: {},
        }).then(console.log, console.error);
      });
      updateBtn.addEventListener("click", (evt) => {
        obj.rpcNode.call({
          verb: "update",
          args: {},
        }).then(console.log, console.error);
      });
      pingBtn.addEventListener("click", (evt) => {
        console.log("ping");
        obj.rpcNode.call({
          verb: "ping",
          args: {},
        }).then(console.log, console.error);
      });
    };
    return obj;
  }
  const controllerRPCNode = new Global.Common.RPCNode({
  });
  new Global.Common.Streams.Pipe(controllerSource, controllerRPCNode.input).catch((e) => {
    console.log("Error on controller input pipe");
    console.error(e);
  });
  new Global.Common.Streams.Pipe(controllerRPCNode.output, Global.ServiceWorkers.controllerSink).catch((e) => {
    console.log("Error on controller output pipe");
    console.error(e);
  });
  console.log("try to ping controller");
  Init.controllerMessages.start();
  const ret = controllerRPCNode.call({
    verb: "ping",
    args: {},
  });
  ret.then(console.log, (e) => {
    console.log("controller ping failed");
    console.error(e);
  });
}
