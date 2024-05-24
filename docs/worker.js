/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

setInterval(print, 1000);

function print() {
  console.log("Worker is running.");
}

import("https://scotwatson.github.io/WebInterface/20240316/worker-messaging.mjs").then(function (Messaging) {
  console.log(Messaging.parentSource, Messaging.parentSink);
  const parentRPS = Messaging.createRemoteProcedureSocket({
    messageSource: Messaging.parentSource,
    messageSink: Messaging.parentSink,
  });
  parentRPS.register({
    functionName: "ping",
    handlerFunc: function ping() {
      return "Hello from Worker!";
    },
  });
});
