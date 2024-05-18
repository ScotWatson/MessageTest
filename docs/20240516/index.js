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
  if (windowURL.hash === "#sub") {
    Messaging.unregisteredSource.next().then(function (evt) {
      const parentSource = Messaging.createMessageSourceForWindowOrigin({
        window: evt.source,
        origin: evt.origin,
      });
      const parentSink = Messaging.createMessageSinkForWindowOrigin({
        window: evt.source,
        origin: evt.origin,
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
    });
  } else {
    const thisIframe = document.createElement("iframe");
    document.body.apendChild(thisIframe);
    thisIframe.src = "../index.html";
    thisIframe.style.visibility = "none";
    console.log(thisIframe.contentWindow);
    const iframeSource = Messaging.createMessageSourceForWindowOrigin({
      window: thisIframe.contentWindow,
      origin: "../index.html#sub",
    });
    const iframeSink = Messaging.createMessageSinkForWindowOrigin({
      window: thisIframe.contentWindow,
      origin: "../index.html#sub",
    });
    const iframeRPC = Messaging.createRemoteCallManager({
      messageSource: iframeSource,
      messageSink: iframeSink,
    });
    Messaging.unregisteredSource.next().then(function () {
      throw "Received message from unrecognized source";
    });
    thisIframe.contentDocument.addEventListener("load", function () {
      iframeRPC.call({
        functionName: "ping",
        args: {},
      }).then(function (ret) {
        console.log(ret);
      });
    });
  }
}
