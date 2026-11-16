/* Pinpoint service worker (2026-11-15): makes the game installable and playable offline.
   The page itself is fetched network-first, so a new version arrives as soon as you are online; everything else
   (the two pinned CDN libraries, fonts, icons) is cache-first. Bump CACHE to drop old caches. */
var CACHE = 'pinpoint-v1';
var CORE = ['./', './pinpoint.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
  'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method!=='GET') return;
  var url = new URL(req.url);
  var page = req.mode==='navigate' || (url.origin===location.origin && /\/(pinpoint\.html)?$/.test(url.pathname));
  if(page){
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(r){ return r || caches.match('./pinpoint.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){
    return hit || fetch(req).then(function(res){
      if(res && (res.ok || res.type==='opaque')){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
      return res;
    });
  }));
});
