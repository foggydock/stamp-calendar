const CACHE = 'mokuhyou-v1';
// 同じドメイン（foggydock.github.io）の他のアプリとキャッシュの置き場が共通なので、消すのはこの接頭辞の古い版だけにする
const CACHE_PREFIX = 'mokuhyou-';
const FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(CACHE_PREFIX) && k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// ネットワーク優先・失敗したらキャッシュ（オフラインでも起動できる）
self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{
        const copy = r.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
        return r;
      })
      .catch(()=>caches.match(e.request).then(r=>r || caches.match('./index.html')))
  );
});
