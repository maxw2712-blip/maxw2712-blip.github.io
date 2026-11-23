// 2026-11-23: the game moved to the site root. Phones that installed it from /pinpoint/ still run the old service
// worker; when it checks for an update it gets this file, which takes over and unregisters itself, so /pinpoint/ pages
// come from the network again (they redirect to the root). The root has its own service worker.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(self.registration.unregister().then(function(){ return self.clients.matchAll({type:'window'}); })
    .then(function(cs){ cs.forEach(function(c){ c.navigate('/pinpoint.html'); }); }));
});
