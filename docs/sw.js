/*
(c) 2024 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const urlSelf = new URL(self.location);
const urlTestGame = new URL("./TestGame/", urlSelf);
const urlClasses = new URL("./classes.js", urlSelf);
const pathnameSegments = urlSelf.pathname.split("/");

function project_file(filename) {
  // NOTE: This path is hardcoded, as the service worker cannot access window.location
  const pathname = "/WebInterface/";
  return pathname + filename;
}

function self_install(e) {
  console.log("sw.js: Start Installing");
  function addCaches(cache) {
    console.log("sw.js: Start Adding Caches");
    cache.addAll([
      project_file("./"),
      project_file("./index.html"),
      project_file("./index.js"),
      project_file("./worker_api.js"),
      project_file("./style.css"),
    ])
    console.log("sw.js: End Adding Caches");
  }
  e.waitUntil(caches.open("store").then(addCaches));
  console.log("sw.js: End Installing");
}

function set_as_worker_script(path) {
}

function self_fetch(e) {
  console.log("sw.js: Start Handling Fetch");
  console.log(e);
  function sendResponse(response) {
    return response || fetch(e.request);
  }
  e.respondWith(caches.match(e.request).then(sendResponse));
  console.log("sw.js: End Handling Fetch");
}

self.addEventListener("install", self_install);
self.addEventListener("fetch", self_fetch);
