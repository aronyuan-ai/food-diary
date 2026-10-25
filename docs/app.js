/* 心肝美食帳 PWA */
'use strict';
const CFG = window.FOOD_CONFIG;
const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const CUISINES = ['小吃','麵食','咖啡甜點','中式料理','火鍋','燒肉燒烤','日式','港式','西式','韓式','海鮮熱炒','台菜客家','飲料','東南亞','餐酒館','牛排','自助餐','鐵板燒','其他','未分類'];
const HUE = {小吃:18,麵食:35,咖啡甜點:330,中式料理:0,火鍋:8,燒肉燒烤:24,日式:200,港式:345,西式:215,韓式:280,海鮮熱炒:190,台菜客家:140,飲料:160,東南亞:95,餐酒館:260,牛排:12,自助餐:50,鐵板燒:28,其他:150,未分類:150};
const COUNTRIES = ['台灣','日本','韓國','香港','澳門','中國','越南','澳洲','其他'];
const PAGE = 60;

const S = { readonly: false, user: null, stores: [], byId: new Map(), loaded: false, q: '', f: { cu: '', area: '', rate: '', st: '', sort: 'recent' }, limit: PAGE, here: null };
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const color = cu => `hsl(${HUE[cu] ?? 150} 42% 38%)`;
const store = id => S.byId.get(id);
const visible = s => s.status !== 'not_store' && !s.merged_into;
const areaOf = s => s.country && s.country !== '台灣' ? s.country : (s.district || s.city || '');
function toast(t, ms = 2400) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, ms); }
function setSync(t) { $('#sync').textContent = t || ''; }
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

/* ---------- 星等 ---------- */
function starSvg(fill) { // fill: 0, .5, 1
  const id = 'h' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="${fill * 100}%" stop-color="var(--star)"/><stop offset="${fill * 100}%" stop-color="transparent"/></linearGradient></defs><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="url(#${id})" stroke="var(--star)" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
}
function starsMini(r) { if (!r) return ''; const full = Math.floor(r), half = r % 1 ? 1 : 0; return `<span class="stars-mini" aria-label="${r} 星">${'★'.repeat(full)}${half ? '½' : ''}</span>`; }
function starInput(value, onChange) {
  const wrap = document.createElement('div'); wrap.className = 'rate';
  const box = document.createElement('div'); box.className = 'stars'; box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', '評分');
  const val = document.createElement('span'); val.className = 'val';
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn link'; clear.textContent = '清除';
  let v = value || 0;
  function paint() {
    box.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = starSvg(v >= i ? 1 : v >= i - .5 ? .5 : 0);
      b.setAttribute('aria-label', `${i} 星（點左半邊是 ${i - .5} 星）`);
      b.onclick = e => { const r = b.getBoundingClientRect(); const x = (e.clientX || r.left + r.width) - r.left; set(x < r.width / 2 ? i - .5 : i); };
      box.appendChild(b);
    }
    val.textContent = v ? v.toFixed(1) : '未評分'; clear.hidden = !v;
  }
  function set(n) { v = n; paint(); onChange(v || null); }
  clear.onclick = () => set(0);
  box.addEventListener('keydown', e => { if (e.key === 'ArrowRight') set(Math.min(5, v + .5)); if (e.key === 'ArrowLeft') set(Math.max(0, v - .5)); });
  paint(); wrap.append(box, val, clear); return wrap;
}

/* ---------- 登入 ---------- */
let signUpMode = false;
$('#pwEye').onclick = () => { const i = $('#authPw'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; $('#pwEye').textContent = show ? '隱藏' : '顯示'; $('#pwEye').setAttribute('aria-pressed', show); $('#pwEye').setAttribute('aria-label', show ? '隱藏密碼' : '顯示密碼'); i.focus(); };
function showAuth() { $('#auth').hidden = false; $('#shell').hidden = true; }
$('#authToggle').onclick = () => { signUpMode = !signUpMode; $('#authGo').textContent = signUpMode ? '建立帳號' : '登入'; $('#authToggle').textContent = signUpMode ? '已經有帳號？登入' : '第一次使用？建立帳號'; $('#authMsg').textContent = ''; };
$('#authForm').onsubmit = async e => {
  e.preventDefault();
  // 只輸入帳號（不含 @）時，對應到 帳號@example.com（example.com 是保留網域，不會寄信到真人）
  const id = $('#authEmail').value.trim().toLowerCase(), email = id.includes('@') ? id : id + '@example.com', password = $('#authPw').value, m = $('#authMsg');
  m.className = 'msg'; if (!email || password.length < 8) { m.textContent = '請輸入帳號（或 Email）和至少 8 個字元的密碼。'; return; }
  $('#authGo').disabled = true; m.textContent = '處理中…';
  try {
    if (signUpMode) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (!data.session) { m.className = 'msg ok'; m.textContent = '已寄出確認信。請到信箱點連結，再回來這裡登入。'; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    const t = String(err.message || err);
    m.textContent = /Invalid login/i.test(t) ? '帳號或密碼不正確。' : /not confirmed/i.test(t) ? '還沒完成 Email 確認，請先到信箱點確認連結。' : /Signups not allowed/i.test(t) ? '這個 App 已關閉註冊。' : '失敗：' + t;
  } finally { $('#authGo').disabled = false; }
};
sb.auth.onAuthStateChange((ev, session) => {
  const u = session?.user || null;
  if (u && (!S.user || S.user.id !== u.id)) { S.user = u; start(); }
  if (!u) { S.user = null; showAuth(); }
});

/* ---------- 資料 ---------- */
async function loadStores(force) {
  const cached = lsGet('stores:' + S.user.id);
  if (cached && !force) { setStores(cached); }
  setSync('同步中…');
  try {
    let all = [], from = 0;
    for (;;) {
      const { data, error } = await sb.from('stores').select('*').order('last_visit', { ascending: false, nullsFirst: false }).range(from, from + 999);
      if (error) throw error;
      all = all.concat(data); if (data.length < 1000) break; from += 1000;
    }
    setStores(all); lsSet('stores:' + S.user.id, all); setSync('');
  } catch (e) { setSync(navigator.onLine ? '同步失敗' : '離線中'); }
}
function setStores(arr) { S.stores = arr; S.byId = new Map(arr.map(s => [s.id, s])); S.loaded = true; route(); }
async function saveStore(id, patch) {
  if (S.readonly) { toast('這是唯讀帳號，不能修改'); return false; }
  const s = store(id); Object.assign(s, patch); lsSet('stores:' + S.user.id, S.stores);
  const { error } = await sb.from('stores').update(patch).eq('id', id);
  if (error) { toast('儲存失敗：' + error.message); return false; }
  return true;
}
function newId() { return 'a' + crypto.randomUUID().replace(/-/g, '').slice(0, 9); }

/* ---------- Google 地圖 ---------- */
let gReady = null;
function loadGoogle() {
  if (gReady) return gReady;
  if (!CFG.GMAPS_KEY) return gReady = Promise.reject(new Error('nokey'));
  // Google 官方的動態載入程式
  ((g) => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({ key: CFG.GMAPS_KEY, v: "weekly", language: "zh-TW", region: "TW" });
  gReady = Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('places')]).then(() => { refreshGoogleCoords(); return google; });
  return gReady;
}
// Google 條款：座標最多快取 30 天。每次開啟 App 時，重新整理超過 25 天的（每次最多 150 家）。
async function refreshGoogleCoords() {
  if (S.readonly) return;
  const old = Date.now() - 25 * 864e5;
  const due = S.stores.filter(s => s.google_place_id && (!s.google_fetched_at || new Date(s.google_fetched_at).getTime() < old)).slice(0, 150);
  if (!due.length) return;
  const { Place } = await google.maps.importLibrary('places');
  const today = new Date().toISOString().slice(0, 10);
  for (const s of due) {
    try {
      const p = new Place({ id: s.google_place_id }); await p.fetchFields({ fields: ['location'] });
      if (p.location) await saveStore(s.id, { lat: p.location.lat(), lng: p.location.lng(), google_fetched_at: today });
    } catch (e) { if (String(e).includes('NOT_FOUND')) await saveStore(s.id, { google_fetched_at: today }); }
    await new Promise(r => setTimeout(r, 250));
  }
}
function gmapsLink(s) {
  const q = encodeURIComponent(s.name);
  if (s.google_place_id) return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(s.google_place_id)}`;
  // 沒有 Google 地點時，用店名＋地區搜尋，而不是只給座標
  const area = s.country && s.country !== '台灣' ? s.country : [s.city, s.district].filter(Boolean).join('');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + (area ? ' ' + area : ''))}`;
}
async function osmDistrict(lat, lng) { // 行政區用 OpenStreetMap 反查，不存 Google 的地址
  try { const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`); const j = await r.json(); const p = j.features?.[0]?.properties || {}; return { city: p.city || p.county || p.state || null, district: p.district || p.locality || null }; }
  catch (e) { return { city: null, district: null }; }
}

/* ---------- 路由 ---------- */
window.addEventListener('hashchange', route);
function route() {
  document.querySelectorAll('.viewer').forEach(e => e.remove());
  if (!S.user || !S.loaded) return;
  const h = location.hash.slice(1) || '/';
  const [, a, b] = h.split('/');
  document.querySelectorAll('.tabbar a').forEach(x => x.toggleAttribute('aria-current', false));
  const tab = a === 'map' ? 'map' : a === 'add' ? 'add' : a === 'settings' ? 'settings' : a === 'magazine' ? 'magazine' : (a === 'store' || a === 'print') ? '' : 'list';
  if (tab) $(`.tabbar a[data-tab="${tab}"]`).setAttribute('aria-current', 'page');
  if (a === 'store' && b) return viewStore(decodeURIComponent(b));
  if (a === 'magazine') return viewMagazine(b ?? null);
  if (a === 'print') return viewPrint(b || 'all');
  if (a === 'map') return viewMap();
  if (a === 'add') { if (S.readonly) { location.hash = '#/'; return; } return viewAdd(b ? decodeURIComponent(b) : null); }
  if (a === 'settings') return viewSettings();
  viewList();
}

/* ---------- 搜尋清單 ---------- */
function dist(a, b) { const R = 6371, t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lng - a.lng) * t; const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
function filtered() {
  const q = S.q.trim().toLowerCase(), f = S.f;
  let r = S.stores.filter(s => {
    if (!visible(s)) return f.st === 'ns' && s.status === 'not_store';
    if (f.st === 'ns') return false;
    if (f.st === 'nog') { if (s.google_place_id) return false; }
    else if (f.st && s.status !== f.st) return false;
    if (f.cu && s.cuisine !== f.cu) return false;
    if (f.area && areaOf(s) !== f.area && s.city !== f.area) return false;
    if (f.rate === 'none' && s.rating) return false;
    if (f.rate && f.rate !== 'none' && !(s.rating >= +f.rate)) return false;
    if (q && !(s.name.toLowerCase().includes(q) || (s.aliases || []).some(x => x.toLowerCase().includes(q)) || (s.district || '').includes(q) || (s.city || '').includes(q) || (s.cuisine || '').includes(q) || (s.note || '').includes(q))) return false;
    return true;
  });
  const by = { recent: (a, b) => (b.last_visit || '').localeCompare(a.last_visit || ''), visits: (a, b) => b.visit_count - a.visit_count || (b.last_visit || '').localeCompare(a.last_visit || ''), rating: (a, b) => (b.rating || 0) - (a.rating || 0) || (b.last_visit || '').localeCompare(a.last_visit || ''), name: (a, b) => a.name.localeCompare(b.name, 'zh-Hant') };
  if (f.sort === 'near' && S.here) { r = r.filter(s => s.lat != null); r.forEach(s => s._d = dist(S.here, s)); r.sort((a, b) => a._d - b._d); }
  else r.sort(by[f.sort] || by.recent);
  return r;
}
function areas() {
  const c = new Map(); S.stores.filter(visible).forEach(s => { const a = areaOf(s); if (a) c.set(a, (c.get(a) || 0) + 1); });
  return [...c].sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
function rowHtml(s) {
  const meta = [s.cuisine, areaOf(s), s.visit_count > 1 ? `去過 ${s.visit_count} 次` : ''].filter(Boolean).join(' · ') + (S.f.st === 'nog' ? (s.lat != null ? '・有位置' : '・沒有位置') : '');
  const right = s._d != null && S.f.sort === 'near' ? (s._d < 1 ? Math.round(s._d * 1000) + ' m' : s._d.toFixed(1) + ' km') : (s.last_visit || '').slice(0, 7);
  return `<a class="row" href="#/store/${encodeURIComponent(s.id)}"><span class="badge" style="background:${color(s.cuisine)}">${esc((s.cuisine || '其')[0])}</span>
    <span class="main"><span class="nm">${esc(s.name)}</span><span class="meta">${starsMini(s.rating)} ${esc(meta)}${s.status === 'unconfirmed' ? ' <span class="tag amber">未確認</span>' : ''}</span></span>
    <span class="right">${esc(right)}</span></a>`;
}
function viewList() {
  $('#topTitle').textContent = '心肝美食帳';
  const v = $('#view'); const f = S.f;
  const sel = (id, label, opts, cur) => `<select id="${id}" class="${cur ? 'on' : ''}" aria-label="${label}">${opts.map(([k, t]) => `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  v.innerHTML = `<div class="wrap"><div class="search">
    <input type="search" id="q" placeholder="店名、地區、菜系…" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search">
    <div class="filters">
      ${sel('fSort', '排序', [['recent', '最近吃的'], ['visits', '最常去'], ['rating', '評分高'], ['near', '離我最近'], ['name', '店名']], f.sort === 'recent' ? '' : f.sort).replace('class=""', '')}
      ${sel('fCu', '菜系', [['', '全部菜系'], ...CUISINES.map(c => [c, c])], f.cu)}
      ${sel('fArea', '地區', [['', '全部地區'], ...areas().map(a => [a, a])], f.area)}
      ${sel('fRate', '評分', [['', '全部評分'], ['4.5', '4.5 星以上'], ['4', '4 星以上'], ['3', '3 星以上'], ['none', '還沒評分']], f.rate)}
      ${sel('fSt', '狀態', [['', '全部'], ['confirmed', '已確認'], ['unconfirmed', '未確認'], ['nog', '沒有 Google 地點'], ['ns', '已隱藏的非店家']], f.st)}
    </div></div>
    <p class="summary" id="sum"></p><ul class="list" id="list"></ul><div id="moreBox"></div></div>`;
  $('#fSort').value = f.sort;
  const draw = () => {
    const r = filtered();
    $('#sum').textContent = `${r.length} 家${f.sort === 'near' && !S.here ? '（正在取得你的位置…）' : ''}`;
    $('#list').innerHTML = r.slice(0, S.limit).map(rowHtml).join('') || '';
    $('#list').hidden = !r.length;
    $('#moreBox').innerHTML = !r.length ? '<p class="empty">沒有符合的店家。換個關鍵字，或清除篩選看看。</p>' : r.length > S.limit ? `<button class="btn more" id="more">再顯示 ${Math.min(PAGE, r.length - S.limit)} 家</button>` : '';
    if ($('#more')) $('#more').onclick = () => { S.limit += PAGE; draw(); };
  };
  let t; $('#q').oninput = e => { S.q = e.target.value; S.limit = PAGE; clearTimeout(t); t = setTimeout(draw, 120); };
  const bind = (id, key) => $('#' + id).onchange = e => { f[key] = e.target.value; S.limit = PAGE; e.target.classList.toggle('on', !!e.target.value && !(key === 'sort' && e.target.value === 'recent')); if (key === 'sort' && f.sort === 'near') locate(draw); draw(); };
  bind('fSort', 'sort'); bind('fCu', 'cu'); bind('fArea', 'area'); bind('fRate', 'rate'); bind('fSt', 'st');
  draw();
}
function locate(cb) {
  if (!navigator.geolocation) { toast('這個瀏覽器無法取得位置'); return; }
  navigator.geolocation.getCurrentPosition(p => { S.here = { lat: p.coords.latitude, lng: p.coords.longitude }; cb && cb(); }, () => toast('沒有取得位置權限，請在瀏覽器設定中允許'), { enableHighAccuracy: true, timeout: 10000 });
}

/* ---------- 地圖 ---------- */
let map = null, cluster = null, markers = new Map(), mapFilter = '';
async function viewMap() {
  $('#topTitle').textContent = '地圖';
  const v = $('#view');
  v.innerHTML = `<div class="mapwrap"><div id="map"></div>
    <div class="mapbar"><select id="mCu" aria-label="菜系"><option value="">全部菜系</option>${CUISINES.map(c => `<option ${c === mapFilter ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <button class="btn" id="mMe" type="button">我的位置</button></div>
    <div class="mapcard" id="mCard" hidden></div></div>`;
  try { await loadGoogle(); }
  catch (e) { $('#map').innerHTML = `<div class="mapnote">${e.message === 'nokey' ? '還沒設定 Google 地圖金鑰。' : '地圖載入失敗，請確認網路連線後重新整理。'}</div>`; return; }
  const { Map } = await google.maps.importLibrary('maps');
  const last = lsGet('mapView') || { lat: 25.04, lng: 121.52, z: 12 };
  map = new Map($('#map'), { center: { lat: last.lat, lng: last.lng }, zoom: last.z, clickableIcons: false, gestureHandling: 'greedy', mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
  map.addListener('idle', () => { const c = map.getCenter(); lsSet('mapView', { lat: c.lat(), lng: c.lng(), z: map.getZoom() }); });
  map.addListener('click', () => $('#mCard').hidden = true);
  drawMarkers();
  $('#mCu').onchange = e => { mapFilter = e.target.value; drawMarkers(); };
  $('#mMe').onclick = () => locate(() => { map.panTo(S.here); map.setZoom(16); new google.maps.Marker({ map, position: S.here, title: '你在這裡', icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#2b7bd6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } }); });
}
function pin(cu, rated) {
  const c = color(cu);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38"><path d="M14 37s12-12.6 12-22A12 12 0 0 0 2 15c0 9.4 12 22 12 22z" fill="${c}" stroke="#fff" stroke-width="2"/>${rated ? '<path d="M14 8.5l2 4.1 4.5.6-3.3 3.1.8 4.4-4-2.2-4 2.2.8-4.4-3.3-3.1 4.5-.6z" fill="#fff"/>' : '<circle cx="14" cy="15" r="4.5" fill="#fff"/>'}</svg>`;
  return { url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), scaledSize: new google.maps.Size(28, 38), anchor: new google.maps.Point(14, 37) };
}
function drawMarkers() {
  if (!map) return;
  if (cluster) cluster.clearMarkers(); markers.forEach(m => m.setMap(null)); markers.clear();
  const list = S.stores.filter(s => visible(s) && s.lat != null && (!mapFilter || s.cuisine === mapFilter));
  const ms = list.map(s => { const m = new google.maps.Marker({ position: { lat: s.lat, lng: s.lng }, title: s.name, icon: pin(s.cuisine, !!s.rating) }); m.addListener('click', () => showCard(s)); markers.set(s.id, m); return m; });
  cluster = new markerClusterer.MarkerClusterer({ map, markers: ms });
}
function showCard(s) {
  const c = $('#mCard'); c.hidden = false;
  c.innerHTML = `<a class="row" style="padding:0;border:0" href="#/store/${encodeURIComponent(s.id)}"><span class="badge" style="background:${color(s.cuisine)}">${esc((s.cuisine || '其')[0])}</span><span class="main"><span class="nm">${esc(s.name)}</span><span class="meta">${starsMini(s.rating)} ${esc([s.cuisine, areaOf(s), (s.last_visit || '').slice(0, 7)].filter(Boolean).join(' · '))}</span></span><span class="right">›</span></a>`;
}

/* ---------- 店家頁 ---------- */
async function viewStore(id) {
  const s = store(id); const v = $('#view');
  if (!s) { v.innerHTML = '<p class="empty">找不到這家店。</p>'; return; }
  $('#topTitle').textContent = '店家';
  const where = [s.country !== '台灣' ? s.country : '', s.city, s.district].filter(Boolean).join(' ');
  v.innerHTML = `<a class="back" href="#/" onclick="if(history.length>1){history.back();return false}">‹ 返回</a>
  <div class="hero" style="background:${color(s.cuisine)}">${s.status === 'unconfirmed' ? '<span class="stamp">未確認</span>' : ''}
    <div class="cu">${esc(s.cuisine || '')}</div><h2>${esc(s.name)}</h2><div class="where">${esc(where || '位置未填')}　${s.first_visit ? `${esc(s.first_visit)} 起・去過 ${s.visit_count} 次` : ''}</div></div>
  <div class="sec"><h3>${S.readonly ? '心肝的評分' : '我的評分'}</h3><div id="rate"></div></div>
  <div class="sec"><div class="actions">
    <a class="btn primary" href="${gmapsLink(s)}" target="_blank" rel="noopener">在 Google 地圖開啟</a>
    ${S.readonly ? '' : `<a class="btn" href="#/add/${encodeURIComponent(s.id)}">再訪一次</a>
    <button class="btn" id="bEdit" type="button">修改資料</button>`}</div>
    <dl class="kv" style="margin-top:12px" id="kv">${s.address ? `<dt>地址</dt><dd>${esc(s.address)}</dd>` : ''}${(s.aliases || []).length ? `<dt>其他寫法</dt><dd>${esc(s.aliases.join('、'))}</dd>` : ''}${s.note ? `<dt>筆記</dt><dd>${esc(s.note)}</dd>` : ''}</dl></div>
  <div class="sec" id="editSec" hidden></div>
  <div class="sec" id="phSec" hidden><h3>照片</h3><div class="photos" id="photos"></div></div>
  <div class="sec"><h3>造訪紀錄</h3><ul class="visits" id="visits"><li class="muted">載入中…</li></ul></div>`;
  if (S.readonly) $('#rate').innerHTML = s.rating ? `<span class="rate"><span class="stars">${[1, 2, 3, 4, 5].map(i => starSvg(s.rating >= i ? 1 : s.rating >= i - .5 ? .5 : 0)).join('')}</span><span class="val">${s.rating.toFixed(1)}</span></span>` : '<span class="muted">還沒評分</span>';
  else $('#rate').appendChild(starInput(s.rating, r => { saveStore(s.id, { rating: r }).then(ok => ok && toast(r ? `已評 ${r} 星` : '已清除評分')); }));
  if ($('#bEdit')) $('#bEdit').onclick = () => editStore(s);
  // Google 即時地址（不存）
  if (s.google_place_id && !s.address) loadGoogle().then(async () => {
    const { Place } = await google.maps.importLibrary('places'); const p = new Place({ id: s.google_place_id });
    await p.fetchFields({ fields: ['formattedAddress'] }); if (p.formattedAddress && $('#kv')) $('#kv').insertAdjacentHTML('afterbegin', `<dt>地址</dt><dd>${esc(p.formattedAddress)} <span class="muted" style="font-size:12px">（Google）</span></dd>`);
  }).catch(() => { });
  const [{ data: vs }, { data: ph }] = await Promise.all([
    sb.from('visits').select('*').eq('store_id', id).order('visited_on', { ascending: false }),
    sb.from('photos').select('*').eq('store_id', id).order('created_at', { ascending: false })]);
  $('#visits').innerHTML = (vs || []).map(x => `<li><span class="d">${esc(x.visited_on)}${x.source === 'fb' ? ' <span class="tag green">FB</span>' : ''}</span>${x.snippet ? `<span class="t clip">${esc(x.snippet)}</span>` : ''}</li>`).join('') || '<li class="muted">還沒有造訪紀錄。</li>';
  $('#visits').onclick = e => { const t = e.target.closest('.t'); if (t) t.classList.toggle('clip'); };
  if (ph && ph.length) {
    ph.sort((a, b) => (b.is_cover - a.is_cover) || (b.taken_on || '').localeCompare(a.taken_on || '') || a.sort - b.sort);
    const { data: urls } = await sb.storage.from('photos').createSignedUrls([...new Set(ph.map(p => p.path))], 3600);
    const url = new Map((urls || []).map(u => [u.path, u.signedUrl]));
    $('#phSec').hidden = false;
    $('#photos').innerHTML = ph.map((p, i) => url.get(p.path) ? `<button type="button" class="ph" data-i="${i}" aria-label="查看照片"><img src="${url.get(p.path)}" alt="" loading="lazy">${p.is_cover ? '<span class="tag green cov">封面</span>' : ''}</button>` : '').join('');
    const cover = ph.find(p => p.is_cover) || ph[0];
    if (url.get(cover.path)) { const h = $('.hero'); h.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.65)),url("${url.get(cover.path)}")`; h.classList.add('has-photo'); }
    $('#photos').onclick = e => { const b = e.target.closest('.ph'); if (b) viewer(s, ph, +b.dataset.i, url); };
  }
}
function viewer(s, ph, i, url) {
  const p = ph[i]; const d = document.createElement('div'); d.className = 'viewer'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', '照片');
  d.innerHTML = `<img src="${url.get(p.path)}" alt=""><div class="vbar">
    <button class="btn" type="button" data-a="prev" ${i ? '' : 'disabled'}>‹</button>
    ${S.readonly ? '' : `<button class="btn" type="button" data-a="cover" ${p.is_cover ? 'disabled' : ''}>${p.is_cover ? '目前的封面' : '設為封面'}</button>
    <button class="btn danger" type="button" data-a="del">刪除</button>`}
    <button class="btn" type="button" data-a="close">關閉</button>
    <button class="btn" type="button" data-a="next" ${i < ph.length - 1 ? '' : 'disabled'}>›</button></div>
    <p class="vnote">${esc(p.taken_on || '')}${S.readonly ? '' : '　如果這張不是這家店的，可以刪除'}</p>`;
  document.body.appendChild(d);
  const close = () => d.remove();
  d.onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a && e.target === d) return close(); if (!a) return;
    if (a === 'close') return close();
    if (a === 'prev' || a === 'next') { close(); return viewer(s, ph, i + (a === 'next' ? 1 : -1), url); }
    if (a === 'cover') {
      await sb.from('photos').update({ is_cover: false }).eq('store_id', s.id).eq('is_cover', true);
      const { error } = await sb.from('photos').update({ is_cover: true }).eq('id', p.id);
      if (error) return toast('設定失敗：' + error.message); close(); toast('已設為封面'); viewStore(s.id);
    }
    if (a === 'del') {
      const btn = e.target.closest('button'); if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = '再按一次確認刪除'; return; }
      const { error } = await sb.from('photos').delete().eq('id', p.id); if (error) return toast('刪除失敗：' + error.message);
      const { data: still } = await sb.from('photos').select('id').eq('path', p.path).limit(1);
      if (!still || !still.length) await sb.storage.from('photos').remove([p.path]);
      close(); toast('已刪除'); viewStore(s.id);
    }
  };
  const key = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', key); } }; document.addEventListener('keydown', key);
}
function editStore(s) {
  const sec = $('#editSec'); sec.hidden = !sec.hidden; if (sec.hidden) return;
  sec.innerHTML = `<h3>修改資料</h3><form id="ef" class="grid2" style="margin:0">
    <label class="field" style="grid-column:1/-1"><span>店名</span><input id="eName" value="${esc(s.name)}"></label>
    <label class="field"><span>菜系</span><select id="eCu">${CUISINES.map(c => `<option ${c === s.cuisine ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field"><span>國家</span><select id="eCo">${COUNTRIES.map(c => `<option ${c === s.country ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field"><span>城市</span><input id="eCity" value="${esc(s.city || '')}"></label>
    <label class="field"><span>行政區</span><input id="eDist" value="${esc(s.district || '')}"></label>
    <label class="field" style="grid-column:1/-1"><span>筆記</span><textarea id="eNote">${esc(s.note || '')}</textarea></label>
    <div class="field" style="grid-column:1/-1"><span>重新指定 Google 地圖上的位置</span><input id="eLoc" placeholder="輸入店名搜尋 Google 地圖" autocomplete="off"><ul class="sugg" id="eSugg"></ul><div id="ePicked"></div></div>
    <div class="actions" style="grid-column:1/-1">
      <button class="btn primary" type="submit">儲存，標為已確認</button>
      <button class="btn danger" type="button" id="eNs">${s.status === 'not_store' ? '恢復為店家' : '這不是店家，隱藏'}</button></div></form>`;
  let picked = null;
  placeSearch($('#eLoc'), $('#eSugg'), p => { picked = p; $('#ePicked').innerHTML = `<div class="picked"><span>${esc(p.label)}</span><span class="tag green">已選</span></div>`; if (p.city) $('#eCity').value = p.city; if (p.district) $('#eDist').value = p.district; });
  $('#ef').onsubmit = async e => {
    e.preventDefault();
    const patch = { name: $('#eName').value.trim() || s.name, cuisine: $('#eCu').value, country: $('#eCo').value, city: $('#eCity').value.trim() || null, district: $('#eDist').value.trim() || null, note: $('#eNote').value.trim() || null, status: 'confirmed' };
    if (picked) Object.assign(patch, { google_place_id: picked.id, lat: picked.lat, lng: picked.lng, google_fetched_at: new Date().toISOString().slice(0, 10), loc_source: 'google', address: null });
    if (await saveStore(s.id, patch)) { toast('已儲存'); viewStore(s.id); }
  };
  $('#eNs').onclick = async () => { const ns = s.status !== 'not_store'; if (await saveStore(s.id, { status: ns ? 'not_store' : 'unconfirmed' })) { toast(ns ? '已隱藏' : '已恢復'); location.hash = '#/'; } };
}
// Google 地點搜尋（Places API New）
function placeSearch(input, list, onPick) {
  let token = null, t;
  input.oninput = () => {
    clearTimeout(t); const q = input.value.trim(); if (q.length < 2) { list.innerHTML = ''; return; }
    t = setTimeout(async () => {
      try {
        await loadGoogle(); const { AutocompleteSuggestion, AutocompleteSessionToken } = await google.maps.importLibrary('places');
        token = token || new AutocompleteSessionToken();
        const opt = { input: q, sessionToken: token, language: 'zh-TW', region: 'tw' }; if (S.here) opt.origin = S.here;
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(opt);
        list.innerHTML = suggestions.slice(0, 5).map((x, i) => `<li><button type="button" data-i="${i}">${esc(x.placePrediction.mainText?.toString() || x.placePrediction.text.toString())}<div class="s2">${esc(x.placePrediction.secondaryText?.toString() || '')}</div></button></li>`).join('');
        list.onclick = async e => {
          const b = e.target.closest('button'); if (!b) return; const pr = suggestions[+b.dataset.i].placePrediction;
          const place = pr.toPlace(); await place.fetchFields({ fields: ['location'] }); token = null;
          const lat = place.location.lat(), lng = place.location.lng(); const d = await osmDistrict(lat, lng);
          list.innerHTML = ''; input.value = pr.mainText?.toString() || '';
          onPick({ id: place.id, lat, lng, label: pr.text.toString(), name: pr.mainText?.toString() || '', ...d });
        };
      } catch (e) { list.innerHTML = `<li class="muted" style="font-size:13px">${e.message === 'nokey' ? '還沒設定 Google 金鑰。' : 'Google 搜尋暫時無法使用。'}</li>`; }
    }, 300);
  };
}

/* ---------- 新增 ---------- */
function viewAdd(storeId) {
  $('#topTitle').textContent = '新增紀錄';
  const pre = storeId ? store(storeId) : null;
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  $('#view').innerHTML = `<div class="wrap page">
    <div class="card"><h3>哪一家</h3><div id="who"></div></div>
    <div class="card"><h3>這次</h3><div class="grid2">
      <label class="field"><span>日期</span><input type="date" id="aDate" value="${today}" max="${today}"></label>
      <div class="field"><span>評分（會更新這家店的評分）</span><div id="aRate"></div></div></div>
      <label class="field" style="margin-top:10px"><span>心得</span><textarea id="aNote" placeholder="點了什麼、好不好吃…"></textarea></label>
      <label class="field" style="margin-top:10px"><span>照片</span><input type="file" id="aPh" accept="image/*" multiple></label><div class="thumbs" id="aTh"></div></div>
    <button class="btn primary wide" id="aSave" type="button">儲存</button><p class="msg" id="aMsg"></p></div>`;
  let target = pre ? { kind: 'old', s: pre } : null, rating = pre?.rating || null, files = [];
  const who = $('#who');
  const drawWho = () => {
    if (target) { who.innerHTML = `<div class="picked"><span><b>${esc(target.kind === 'old' ? target.s.name : target.p.name)}</b> <span class="muted" style="font-size:13px">${target.kind === 'old' ? '已在美食帳裡' : '新的店'}</span></span><button class="btn link" id="chg" type="button">換一家</button></div>`; $('#chg').onclick = () => { target = null; drawWho(); }; return; }
    who.innerHTML = `<input id="aQ" placeholder="輸入店名" autocomplete="off"><ul class="sugg" id="aOld"></ul><p class="muted" style="font-size:12px;margin:8px 0 0">找不到的話，從 Google 地圖選：</p><ul class="sugg" id="aG"></ul>`;
    const old = $('#aOld');
    $('#aQ').addEventListener('input', e => { const q = e.target.value.trim(); const r = q ? S.stores.filter(s => visible(s) && (s.name.includes(q) || (s.aliases || []).some(a => a.includes(q)))).slice(0, 5) : []; old.innerHTML = r.map(s => `<li><button type="button" data-id="${s.id}">${esc(s.name)}<div class="s2">${esc([s.cuisine, areaOf(s), s.last_visit].filter(Boolean).join(' · '))}</div></button></li>`).join(''); });
    old.onclick = e => { const b = e.target.closest('button'); if (!b) return; target = { kind: 'old', s: store(b.dataset.id) }; rating = target.s.rating; drawWho(); drawRate(); };
    placeSearch($('#aQ'), $('#aG'), p => { const ex = S.stores.find(s => s.google_place_id === p.id); target = ex ? { kind: 'old', s: ex } : { kind: 'new', p }; drawWho(); });
  };
  const drawRate = () => { $('#aRate').innerHTML = ''; $('#aRate').appendChild(starInput(rating, r => rating = r)); };
  drawWho(); drawRate();
  $('#aPh').onchange = e => { files = [...e.target.files].slice(0, 12); $('#aTh').innerHTML = files.map(f => `<img src="${URL.createObjectURL(f)}" alt="">`).join(''); };
  $('#aSave').onclick = async () => {
    const m = $('#aMsg'); m.className = 'msg';
    if (!target) { m.textContent = '請先選擇是哪一家店。'; return; }
    const btn = $('#aSave'); btn.disabled = true; m.textContent = '儲存中…';
    try {
      const date = $('#aDate').value || today; let sid;
      if (target.kind === 'new') {
        sid = newId(); const p = target.p;
        const row = { id: sid, name: p.name || '新店家', cuisine: '未分類', country: '台灣', city: p.city, district: p.district, lat: p.lat, lng: p.lng, loc_source: 'google', google_place_id: p.id, google_fetched_at: new Date().toISOString().slice(0, 10), status: 'confirmed', rating, first_visit: date, last_visit: date, visit_count: 1 };
        const { error } = await sb.from('stores').insert(row); if (error) throw error; S.stores.unshift(row); S.byId.set(sid, row);
      } else {
        const s = target.s; sid = s.id;
        await saveStore(sid, { rating, visit_count: (s.visit_count || 0) + 1, last_visit: !s.last_visit || date > s.last_visit ? date : s.last_visit, first_visit: !s.first_visit || date < s.first_visit ? date : s.first_visit });
      }
      const { data: vrow, error: ve } = await sb.from('visits').insert({ store_id: sid, visited_on: date, source: 'app', snippet: $('#aNote').value.trim() || null }).select().single(); if (ve) throw ve;
      for (let i = 0; i < files.length; i++) {
        m.textContent = `上傳照片 ${i + 1} / ${files.length}…`;
        const blob = await shrink(files[i]); const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${S.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: ue } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type }); if (ue) throw ue;
        await sb.from('photos').insert({ store_id: sid, visit_id: vrow.id, path, taken_on: date, sort: i });
      }
      lsSet('stores:' + S.user.id, S.stores); toast('已儲存'); location.hash = '#/store/' + encodeURIComponent(sid);
    } catch (e) { m.textContent = '儲存失敗：' + (e.message || e); btn.disabled = false; }
  };
}
async function shrink(file, max = 1600) {
  const img = await createImageBitmap(file).catch(() => null); if (!img) return file;
  const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const webp = await new Promise(r => c.toBlob(r, 'image/webp', .82));
  return webp && webp.type === 'image/webp' ? webp : await new Promise(r => c.toBlob(r, 'image/jpeg', .85));
}

/* ---------- 更多 ---------- */
function viewSettings() {
  $('#topTitle').textContent = '更多';
  const vis = S.stores.filter(visible), conf = vis.filter(s => s.status === 'confirmed').length, rated = vis.filter(s => s.rating).length;
  if (S.readonly) {
    $('#view').innerHTML = `<div class="wrap page">
      <div class="card"><div class="stat"><div><b>${vis.length}</b><span>家店</span></div><div><b>${conf}</b><span>已確認</span></div><div><b>${rated}</b><span>已評分</span></div></div></div>
      <div class="card"><h3>帳號</h3><p style="margin:0 0 6px;font-size:14px">${esc(S.user.email)}</p><p class="muted" style="margin:0 0 10px;font-size:13px">這是唯讀帳號：可以瀏覽、搜尋、看地圖和美食指南，但不能新增或修改。</p><div class="actions"><button class="btn" id="reload" type="button">重新同步</button><button class="btn danger" id="out" type="button">登出</button></div></div>
      <p class="muted" style="font-size:12px;text-align:center">地圖與地點資料 © Google・行政區資料 © OpenStreetMap contributors</p></div>`;
    $('#out').onclick = () => sb.auth.signOut();
    $('#reload').onclick = () => loadStores(true).then(() => toast('已同步'));
    return;
  }
  $('#view').innerHTML = `<div class="wrap page">
    <div class="card"><div class="stat"><div><b>${vis.length}</b><span>家店</span></div><div><b>${conf}</b><span>已確認</span></div><div><b>${rated}</b><span>已評分</span></div></div></div>
    <div class="card"><h3>匯入資料</h3><p class="muted" style="margin:0 0 10px;font-size:14px">選擇 Claude 給你的匯入檔（.json）。重複匯入不會產生重複資料。</p>
      <input type="file" id="imp" accept=".json,application/json"><div class="progress" style="margin-top:10px" hidden id="impBar"><i></i></div><p class="msg" id="impMsg"></p></div>
    <div class="card"><h3>從 FB 匯出檔匯入照片</h3><p class="muted" style="margin:0 0 10px;font-size:14px">請用電腦的 Chrome 或 Edge。先選照片對照檔，再選 FB 匯出檔解壓縮後的資料夾。照片會在你的電腦上壓縮後直接上傳；已上傳的會自動跳過，中斷了可以重跑。</p>
      <label class="field"><span>1. 照片對照檔（.json）</span><input type="file" id="phMap" accept=".json,application/json"></label>
      <label class="field" style="margin-top:8px"><span>2. FB 匯出檔資料夾 <span class="muted" id="phDirHint">（先完成第 1 步才能選）</span></span><input type="file" id="phDir" webkitdirectory directory multiple disabled></label>
      <div class="progress" style="margin-top:10px" hidden id="phBar"><i></i></div><p class="msg" id="phMsg"></p></div>
    <div class="card"><h3>Google 地點配對</h3><p class="muted" style="margin:0 0 10px;font-size:14px">有 <b id="gmN">${S.stores.filter(s => visible(s) && !s.google_place_id).length}</b> 家店還沒對應到 Google 地圖上的店家，按「在 Google 地圖開啟」時只能用店名搜尋。按下面的按鈕，App 會用每家店的位置在附近找同名的店；店名對得上才會儲存，對不上的保持原樣，可以之後在店家頁「修改資料」手動指定。</p>
      <button class="btn primary" id="gmGo" type="button">幫沒有 Google 地點的店自動配對</button><div class="progress" style="margin-top:10px" hidden id="gmBar"><i></i></div><p class="msg" id="gmMsg"></p></div>
    <div class="card"><h3>帳號</h3><p style="margin:0 0 10px;font-size:14px">${esc(S.user.email)}</p><div class="actions"><button class="btn" id="reload" type="button">重新同步</button><button class="btn danger" id="out" type="button">登出</button></div></div>
    <p class="muted" style="font-size:12px;text-align:center">地圖與地點資料 © Google・行政區資料 © OpenStreetMap contributors</p></div>`;
  $('#out').onclick = () => sb.auth.signOut();
  $('#reload').onclick = () => loadStores(true).then(() => toast('已同步'));
  $('#imp').onchange = e => importFile(e.target.files[0]);
  $('#gmGo').onclick = matchGoogle;
  let phMap = null;
  if (!('webkitdirectory' in document.createElement('input')) || /iPhone|iPad|Android/i.test(navigator.userAgent)) {
    $('#phMap').disabled = true; $('#phDirHint').textContent = '';
    $('#phMsg').textContent = '這個瀏覽器不能選整個資料夾。請改用電腦的 Chrome 或 Edge 開啟 App。';
  }
  $('#phMap').onchange = async e => {
    const m = $('#phMsg'); m.className = 'msg';
    try { phMap = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(phMap.items)) throw 0; $('#phDir').disabled = false; $('#phDirHint').textContent = '（現在可以選了）'; m.className = 'msg ok'; m.textContent = `對照檔有 ${phMap.items.length} 張照片。接著選 FB 匯出檔的資料夾。`; }
    catch (err) { m.textContent = '這不是照片對照檔，請確認選的是 Claude 給你的檔案。'; }
  };
  $('#phDir').onchange = e => phMap && importPhotos(phMap, [...e.target.files]);
}
// 店名相似度：去掉空白符號後，互相包含或兩字詞重疊夠多
function nameMatch(a, b) {
  const parts = String(a || '').split(/[-－|｜\s]+/).filter(x => x.length >= 2);
  if (parts.length > 1) return Math.max(nameMatch1(a, b), ...parts.map(x => nameMatch1(x, b)));
  return nameMatch1(a, b);
}
function nameMatch1(a, b) {
  const n = x => (x || '').toLowerCase().replace(/[\s·・．.\-－_()（）【】&'’|｜]/g, '').replace(/(總店|本店|創始店|旗艦店|分店|門市)$/, '');
  a = n(a); b = n(b); if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) >= 2 ? 1 : 0;
  const bg = x => { const r = new Set(); for (let i = 0; i < x.length - 1; i++) r.add(x.slice(i, i + 2)); return r; };
  const A = bg(a), B = bg(b); let k = 0; A.forEach(x => B.has(x) && k++); return k / Math.max(1, Math.min(A.size, B.size));
}
async function matchGoogle() {
  const btn = $('#gmGo'), m = $('#gmMsg'), bar = $('#gmBar'), fill = bar.firstElementChild;
  const todo = S.stores.filter(s => visible(s) && !s.google_place_id);
  if (!todo.length) { m.className = 'msg ok'; m.textContent = '每家店都已經有 Google 地點了。'; return; }
  btn.disabled = true; bar.hidden = false; m.className = 'msg ok'; m.textContent = '載入 Google…';
  try { await loadGoogle(); } catch (e) { m.className = 'msg'; m.textContent = 'Google 地圖載入失敗，請稍後再試。'; btn.disabled = false; return; }
  const { Place } = await google.maps.importLibrary('places');
  const today = new Date().toISOString().slice(0, 10); let ok = 0, miss = 0, done = 0;
  for (const s of todo) {
    try {
      const near = s.lat != null;
      const area = s.country && s.country !== '台灣' ? s.country : [s.city, s.district].filter(Boolean).join('');
      const req = { textQuery: near ? s.name : s.name + (area ? ' ' + area : ' 台灣'), fields: ['id', 'displayName', 'location'], maxResultCount: 3, language: 'zh-TW' };
      if (near) req.locationBias = { center: { lat: s.lat, lng: s.lng }, radius: 800 };
      const { places } = await Place.searchByText(req);
      const scored = (places || []).map(p => { const nm = nameMatch(s.name, p.displayName); const d = near ? dist({ lat: s.lat, lng: s.lng }, { lat: p.location.lat(), lng: p.location.lng() }) : 0; return { p, nm, d, ok: near ? ((nm >= 0.6 && d < 1.5) || (nm >= 0.3 && d < 0.2)) : nm >= 0.95 }; });
      // 有座標：名稱夠像且 1.5 公里內，或就在 200 公尺內且名稱部分相同；沒座標：名稱幾乎一樣才接受
      const best = scored.filter(x => x.ok).sort((x, y) => (y.nm - y.d / 3) - (x.nm - x.d / 3))[0];
      if (best) {
        const patch = { google_place_id: best.p.id, lat: best.p.location.lat(), lng: best.p.location.lng(), google_fetched_at: today };
        if (!near) { Object.assign(patch, await osmDistrict(patch.lat, patch.lng)); patch.loc_source = 'google'; }
        await saveStore(s.id, patch); ok++;
      } else miss++;
    } catch (e) { miss++; }
    done++; fill.style.width = (done / todo.length * 100) + '%'; m.textContent = `配對中 ${done} / ${todo.length}：找到 ${ok} 家、對不上 ${miss} 家`;
    await new Promise(r => setTimeout(r, 120));
  }
  m.textContent = `完成：${ok} 家已對應到 Google 地點；${miss} 家對不上，維持原樣（可以在店家頁「修改資料」手動指定）。`;
  $('#gmN').textContent = S.stores.filter(s => visible(s) && !s.google_place_id).length; btn.disabled = false;
}
async function importPhotos(map, files) {
  const m = $('#phMsg'), bar = $('#phBar'), fill = bar.firstElementChild; m.className = 'msg ok'; bar.hidden = false;
  // 用路徑最後三段比對：media/<相簿>/<檔名>
  const key = p => p.split('/').slice(-3).join('/');
  const byKey = new Map(files.map(f => [key(f.webkitRelativePath || f.name), f]));
  const items = map.items.filter(it => S.byId.has(it.store_id));
  m.textContent = '讀取已上傳的照片…';
  const have = new Set(), visitOf = new Map();
  for (let from = 0; ; from += 1000) { const { data, error } = await sb.from('photos').select('store_id,path').range(from, from + 999); if (error) { m.className = 'msg'; m.textContent = '讀取失敗：' + error.message; return; } data.forEach(r => have.add(r.store_id + '|' + r.path)); if (data.length < 1000) break; }
  for (let from = 0; ; from += 1000) { const { data } = await sb.from('visits').select('id,store_id,fb_post_ts').not('fb_post_ts', 'is', null).range(from, from + 999); (data || []).forEach(v => visitOf.set(v.store_id + '|' + v.fb_post_ts, v.id)); if (!data || data.length < 1000) break; }
  const uploaded = new Map(); // 同一張照片屬於多家店時只上傳一次
  let done = 0, ok = 0, skip = 0, missing = 0, fail = 0;
  const step = () => { done++; fill.style.width = (done / items.length * 100) + '%'; m.textContent = `處理中 ${done} / ${items.length}：新增 ${ok}、已有 ${skip}、資料夾裡找不到 ${missing}、失敗 ${fail}`; };
  const queue = items.slice(); const workers = [];
  for (let w = 0; w < 3; w++) workers.push((async () => {
    while (queue.length) {
      const it = queue.shift(); const base = it.uri.split('/').pop().replace(/\.\w+$/, '');
      const path = `${S.user.id}/fb_${base}.webp`;
      if (have.has(it.store_id + '|' + path)) { skip++; step(); continue; }
      const f = byKey.get(key(it.uri)); if (!f) { missing++; step(); continue; }
      try {
        if (!uploaded.has(path)) {
          uploaded.set(path, (async () => {
            const blob = await shrink(f, 1280);
            const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type, upsert: true }); if (error) throw error;
          })());
        }
        await uploaded.get(path);
        const { error } = await sb.from('photos').insert({ store_id: it.store_id, visit_id: visitOf.get(it.store_id + '|' + it.fb_post_ts) || null, path, taken_on: it.date, sort: it.sort, is_cover: !!it.cover });
        if (error) throw error; have.add(it.store_id + '|' + path); ok++;
      } catch (err) { fail++; console.warn(it.uri, err); }
      step();
    }
  })());
  await Promise.all(workers);
  m.textContent = `完成：新增 ${ok} 張、已有 ${skip} 張${missing ? `、資料夾裡找不到 ${missing} 張（請確認選的是 FB 匯出檔的最上層資料夾）` : ''}${fail ? `、失敗 ${fail} 張（可以再選一次資料夾重試）` : ''}。`;
}
async function importFile(file) {
  const m = $('#impMsg'), bar = $('#impBar'), fill = bar.firstElementChild; m.className = 'msg';
  if (!file) return;
  let data; try { data = JSON.parse(await file.text()); } catch (e) { m.textContent = '檔案格式不對，請確認選的是 Claude 給你的 .json 匯入檔。'; return; }
  if (!Array.isArray(data.stores) || !Array.isArray(data.visits)) { m.textContent = '檔案內容不完整。'; return; }
  bar.hidden = false; const total = data.stores.length + data.visits.length; let done = 0;
  const step = n => { done += n; fill.style.width = (done / total * 100) + '%'; m.className = 'msg ok'; m.textContent = `匯入中… ${done} / ${total}`; };
  try {
    // 已在 App 裡修改過的店家（已確認或已評分）不覆蓋，只補上沒有的
    const existing = new Map(S.stores.map(s => [s.id, s]));
    for (let i = 0; i < data.stores.length; i += 300) {
      const chunk = data.stores.slice(i, i + 300).map(s => { const e = existing.get(s.id); if (!e) return s; return { ...s, ...Object.fromEntries(Object.entries(e).filter(([k, v]) => v != null && !['visit_count', 'first_visit', 'last_visit', 'aliases'].includes(k))), aliases: [...new Set([...(e.aliases || []), ...(s.aliases || [])])] }; });
      chunk.forEach(c => { delete c.user_id; delete c.created_at; delete c.updated_at; delete c._d; });
      const { error } = await sb.from('stores').upsert(chunk, { onConflict: 'id' }); if (error) throw error; step(chunk.length);
    }
    for (let i = 0; i < data.visits.length; i += 500) {
      const chunk = data.visits.slice(i, i + 500);
      const { error } = await sb.from('visits').upsert(chunk, { onConflict: 'user_id,store_id,fb_post_ts', ignoreDuplicates: true }); if (error) throw error; step(chunk.length);
    }
    m.textContent = `完成：${data.stores.length} 家店、${data.visits.length} 筆造訪紀錄。`; await loadStores(true);
  } catch (e) { m.className = 'msg'; m.textContent = `匯入停在 ${done} 筆：${e.message || e}。可以再選一次同一個檔案繼續。`; }
}

/* ---------- 啟動 ---------- */
async function start() {
  $('#auth').hidden = true; $('#shell').hidden = false;
  // 唯讀檢視者：在 viewers 名單上的帳號只能看，不能改（資料庫權限也擋住寫入）
  try { const { data, error } = await sb.from('viewers').select('owner_id').eq('viewer_id', S.user.id).limit(1); S.readonly = !error && !!(data && data.length); } catch (e) { S.readonly = false; }
  document.body.classList.toggle('readonly', S.readonly);
  await loadStores();
  if (!S.stores.length && !S.readonly) location.hash = '#/settings';
}
(async () => {
  const { data } = await sb.auth.getSession();
  if (!data.session) showAuth();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  // 保持 Supabase 免費專案活躍：每次開啟時輕量查詢一次（另有 GitHub 排程）
})();
