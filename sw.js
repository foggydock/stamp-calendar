const CACHE = 'mokuhyou-v2';
// 同じドメイン（foggydock.github.io）の他のアプリとキャッシュの置き場が共通なので、消すのはこの接頭辞の古い版だけにする
const CACHE_PREFIX = 'mokuhyou-';
const FILES = ['./', './index.html', './manifest.json'];
const FETCH_TIMEOUT_MS = 3000; // 回線が不安定/つながらないとき、この時間でキャッシュに切り替える

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(CACHE_PREFIX) && k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// ネットワーク優先・失敗またはタイムアウトしたらキャッシュ（オフラインや不安定な回線でも起動できる）。
self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  e.respondWith(networkFirstWithTimeout(e.request));
});

function networkFirstWithTimeout(request){
  let settled = false;
  return new Promise(resolve=>{
    const settle = res => {
      if(settled || !res) return; // すでに決着ずみ、またはキャッシュも無かった場合は何もしない
      settled = true;
      resolve(res);
    };

    // 回線が遅い/つながらないとき、ここまで待たせずにキャッシュへ切り替える
    // （タイムアウト後も キャッシュに無ければ そのまま fetch の結果を待つ）
    const timer = setTimeout(()=>{
      caches.match(request).then(settle);
    }, FETCH_TIMEOUT_MS);

    fetch(request).then(r=>{
      clearTimeout(timer);
      // 成功したレスポンス(ok)だけをキャッシュに保存する。
      // 404などのエラー応答をそのままキャッシュしてしまうと、オフライン時に
      // ずっとそのエラーページが出続けてしまうため。
      if(r && r.ok && r.type === 'basic'){
        const copy = r.clone();
        caches.open(CACHE).then(c=>c.put(request, copy)).catch(()=>{});
      }
      settle(r);
    }).catch(()=>{
      clearTimeout(timer);
      caches.match(request).then(r=> settle(r || caches.match('./index.html')));
    });
  });
}
