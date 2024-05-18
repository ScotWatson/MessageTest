/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
const loadInterface = import("https://scotwatson.github.io/WebInterface/20240316/interface.mjs");
const loadMessaging = import("https://scotwatson.github.io/WebInterface/20240316/WindowMessaging.mjs");

loadInterface.then(function () {
  console.log("Interface loaded");
});
loadMessaging.then(function () {
  console.log("Messaging loaded");
});

Promise.all( [ loadInterface, loadMessaging ] ).then(start, fail);

function fail(err) {
  console.error(err);
}

function start( [ Interface, Messaging ] ) {
  console.log("start");
  const windowURL = new URL(window.location);
  const subURL = "./index.html#sub";
  const subFullURL = new URL(subURL, windowURL);
  if (windowURL.hash === "#sub") {
    Messaging.addTrustedOrigin(windowURL.origin);
    Messaging.untrustedOrigin.next().then(function (info) {
      console.log("untrustedOrigin");
      Messaging.addTrustedOrigin(info.origin);
      const parentSource = Messaging.createMessageSourceForWindow({
        window: info.source,
      });
      const parentSink = Messaging.createMessageSinkForWindowOrigin({
        window: info.source,
        origin: info.origin,
      });
      const parentRPC = Messaging.createRemoteCallManager({
        messageSource: parentSource,
        messageSink: parentSink,
      });
      parentRPC.register({
        functionName: "ping",
        handlerFunc: function (args) {
          return "Hello!";
        },
      });
      Messaging.enqueueWindowMessage(info);
    });
  } else {
    const thisIframe = document.createElement("iframe");
    document.body.appendChild(thisIframe);
    thisIframe.src = subURL;
    thisIframe.style.visibility = "none";
    console.log(thisIframe.contentWindow);
    const iframeSource = Messaging.createMessageSourceForWindowOrigin({
      window: thisIframe.contentWindow,
      origin: subFullURL.origin,
    });
    const iframeSink = Messaging.createMessageSinkForWindowOrigin({
      window: thisIframe.contentWindow,
      origin: subFullURL.origin,
    });
    const iframeRPC = Messaging.createRemoteCallManager({
      messageSource: iframeSource,
      messageSink: iframeSink,
    });
    Messaging.unregisteredSource.next().then(function () {
      throw "Received message from unrecognized source";
    });
//    thisIframe.contentWindow.addEventListener("load", function () {
    thisIframe.addEventListener("load", function () {
      console.log("iframe Loaded");
      setTimeout(RPC, 5000);
      function RPC() {
        console.log("RPC");
        iframeRPC.call({
          functionName: "ping",
          args: {},
        }).then(function (ret) {
          console.log(ret);
        }).catch(function (reason) {
          console.error(reason);
        });
      }
    });
  }
}
