// 離線快取：App 本身「先抓網路最新版、失敗才用快取」，所以更新會立刻生效；字型與程式庫用快取加速。資料（Supabase、Google）不快取
const V='food-v12';
const SHELL=['./','index.html','style.css','app.js','magazine.js','magazine.css','config.js','manifest.webmanifest','icons/icon-192.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET')return;
  const same=u.origin===location.origin, lib=/cdn\.jsdelivr\.net|unpkg\.com|fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(u.host);
  if(same){ // 網路優先
    e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(h=>h||caches.match('index.html'))));
  } else if(lib){ // 快取優先（版本固定的程式庫與字型）
    e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r}));
  }
});
