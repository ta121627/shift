// シフト表 PWA Service Worker
// アプリ更新時はこのバージョン名を変えると古いキャッシュが破棄される
var CACHE = "shift-cache-v1";

// 確実に存在するファイルだけを事前キャッシュ（addAll は1つでも失敗すると全体が失敗するため）
var PRECACHE = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(PRECACHE); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  // ページ遷移はネット優先（更新を反映）→ オフライン時はキャッシュ
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
        return res;
      }).catch(function(){
        return caches.match("./index.html").then(function(r){
          return r || caches.match("./");
        });
      })
    );
    return;
  }

  // その他の資産はキャッシュ優先 → なければネット取得してキャッシュ
  e.respondWith(
    caches.match(req).then(function(cached){
      if (cached) return cached;
      return fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
