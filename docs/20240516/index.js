/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();
const loadInterface = import("https://scotwatson.github.io/WebInterface/20240316/interface.mjs");
const loadMessaging = import("https://scotwatson.github.io/WebInterface/20240316/WindowMessaging.mjs");

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
      const parentSource = {
        message: Messaging.createSignal(async function (resolve, reject) {
          for await (const info of Messaging.trustedOrigin) {
            if ((info.window === window) && (info.origin === origin)) {
              resolve(info.data);
            }
          }
        }),
      };
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
    Messaging.addTrustedOrigin(windowURL.origin);
    const thisIframe = document.createElement("iframe");
    document.body.appendChild(thisIframe);
    thisIframe.src = subURL;
    thisIframe.style.visibility = "none";
    const iframeSource = {
      message: Messaging.createSignal(async function (resolve, reject) {
        for await (const info of Messaging.trustedOrigin) {
          if ((info.window === thisIframe.contentWindow) && (info.origin === subFullURL.origin)) {
            resolve(info.data);
          }
        }
      }),
    };
    const iframeSink = Messaging.createMessageSinkForWindowOrigin({
      window: thisIframe.contentWindow,
      origin: subFullURL.origin,
    });
    const iframeRPC = Messaging.createRemoteCallManager({
      messageSource: iframeSource,
      messageSink: iframeSink,
    });
    Messaging.untrustedOrigin.next().then(function () {
      throw "Received message from unrecognized source";
    });
//    thisIframe.contentWindow.addEventListener("load", function () {
    thisIframe.addEventListener("load", function () {
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
