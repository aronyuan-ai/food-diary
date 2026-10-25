/* 美食指南：依地區分章的雜誌模式＋A4 印刷 */
'use strict';
const TW_CITY_ORDER = ['台北市','新北市','基隆市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣'];
const ABROAD_ORDER = ['日本','韓國','香港','澳門','中國','越南','澳洲','其他'];
const TPE = '中正 大同 中山 松山 大安 萬華 信義 士林 北投 內湖 南港 文山'.split(' ');
const NTPC = '板橋 三重 中和 永和 新莊 新店 樹林 鶯歌 三峽 淡水 汐止 瑞芳 土城 蘆洲 五股 泰山 林口 深坑 石碇 坪林 三芝 石門 八里 平溪 雙溪 貢寮 金山 萬里 烏來'.split(' ');
const NICK = { 遼寧: ['台北市', '中山區'], 大直: ['台北市', '中山區'], 長安: ['台北市', '中山區'], 南京: ['台北市', '松山區'], 永康: ['台北市', '大安區'], 公館: ['台北市', '中正區'], 西門: ['台北市', '萬華區'], 東門: ['台北市', '中正區'], 龍山: ['台北市', '萬華區'] };
const TOWN = {};
'宜蘭市 羅東鎮 蘇澳鎮 頭城鎮 礁溪鄉 壯圍鄉 員山鄉 冬山鄉 五結鄉 三星鄉 大同鄉 南澳鄉'.split(' ').forEach(x => TOWN[x] = '宜蘭縣');
'花蓮市 鳳林鎮 玉里鎮 新城鄉 吉安鄉 壽豐鄉 光復鄉 豐濱鄉 瑞穗鄉 富里鄉 秀林鄉 萬榮鄉 卓溪鄉'.split(' ').forEach(x => TOWN[x] = '花蓮縣');
'台東市 臺東市 成功鎮 關山鎮 卑南鄉 鹿野鄉 池上鄉 東河鄉 長濱鄉 太麻里鄉 大武鄉 綠島鄉 海端鄉 延平鄉 金峰鄉 達仁鄉 蘭嶼鄉'.split(' ').forEach(x => TOWN[x] = '台東縣');
'南投市 埔里鎮 草屯鎮 竹山鎮 集集鎮 名間鄉 鹿谷鄉 中寮鄉 魚池鄉 國姓鄉 水里鄉 信義鄉 仁愛鄉'.split(' ').forEach(x => TOWN[x] = '南投縣');
'苗栗市 苑裡鎮 通霄鎮 竹南鎮 頭份市 後龍鎮 卓蘭鎮 大湖鄉 公館鄉 銅鑼鄉 南庄鄉 頭屋鄉 三義鄉 西湖鄉 造橋鄉 三灣鄉 獅潭鄉 泰安鄉'.split(' ').forEach(x => TOWN[x] = '苗栗縣');
'竹北市 竹東鎮 新埔鎮 關西鎮 湖口鄉 新豐鄉 芎林鄉 橫山鄉 北埔鄉 寶山鄉 峨眉鄉 尖石鄉 五峰鄉'.split(' ').forEach(x => TOWN[x] = '新竹縣');
'彰化市 鹿港鎮 和美鎮 線西鄉 伸港鄉 福興鄉 秀水鄉 花壇鄉 芬園鄉 員林市 溪湖鎮 田中鎮 大村鄉 埔鹽鄉 埔心鄉 永靖鄉 社頭鄉 二水鄉 北斗鎮 二林鎮 田尾鄉 埤頭鄉 芳苑鄉 大城鄉 竹塘鄉 溪州鄉'.split(' ').forEach(x => TOWN[x] = '彰化縣');
'斗六市 斗南鎮 虎尾鎮 西螺鎮 土庫鎮 北港鎮 古坑鄉 大埤鄉 莿桐鄉 林內鄉 二崙鄉 崙背鄉 麥寮鄉 東勢鄉 褒忠鄉 台西鄉 元長鄉 四湖鄉 口湖鄉 水林鄉'.split(' ').forEach(x => TOWN[x] = '雲林縣');
'太保市 朴子市 布袋鎮 大林鎮 民雄鄉 溪口鄉 新港鄉 六腳鄉 東石鄉 義竹鄉 鹿草鄉 水上鄉 中埔鄉 竹崎鄉 梅山鄉 番路鄉 大埔鄉 阿里山鄉'.split(' ').forEach(x => TOWN[x] = '嘉義縣');
'屏東市 潮州鎮 東港鎮 恆春鎮 萬丹鄉 長治鄉 麟洛鄉 九如鄉 里港鄉 鹽埔鄉 高樹鄉 萬巒鄉 內埔鄉 竹田鄉 新埤鄉 枋寮鄉 新園鄉 崁頂鄉 林邊鄉 南州鄉 佳冬鄉 琉球鄉 車城鄉 滿州鄉 枋山鄉 三地門鄉 霧台鄉 瑪家鄉 泰武鄉 來義鄉 春日鄉 獅子鄉 牡丹鄉'.split(' ').forEach(x => TOWN[x] = '屏東縣');
'馬公市 湖西鄉 白沙鄉 西嶼鄉 望安鄉 七美鄉'.split(' ').forEach(x => TOWN[x] = '澎湖縣');
'金城鎮 金湖鎮 金沙鎮 金寧鄉 烈嶼鄉 烏坵鄉'.split(' ').forEach(x => TOWN[x] = '金門縣');
'南竿鄉 北竿鄉 莒光鄉 東引鄉'.split(' ').forEach(x => TOWN[x] = '連江縣');
const CITY_ALIAS = { Taipei: '台北市', '西門町': '台北市', '北投士林科技園區': '台北市', 'New Taipei': '新北市', Taichung: '台中市', Tainan: '台南市', Kaohsiung: '高雄市' };
const PASTEL = ['#cfe8dc', '#f9d6c6', '#f5e6a6', '#cfe2f3', '#e3d7f0', '#f6d3de', '#d9ecc0', '#fbe0b8'];
const INK_ON = ['#2f6b52', '#a2482c', '#8a6a07', '#2f5f8a', '#6a4c93', '#a33d63', '#4f7a23', '#9a5a12'];

function normCity(c) {
  if (!c) return '';
  c = c.replace(/^臺/, '台').replace('台北縣', '新北市').trim();
  if (CITY_ALIAS[c]) return CITY_ALIAS[c];
  if (TOWN[c]) return TOWN[c];
  if (/^(台北|新北|台中|台南|高雄|桃園)$/.test(c)) c += '市';
  if (c === '基隆' || c === '新竹市' || c === '嘉義市') return c.endsWith('市') ? c : c + '市';
  if (c === '馬祖' || c === '南竿' || c === '北竿' || c === '東引') return '連江縣';
  return c;
}
function regionOf(s) {
  if (s.country && s.country !== '台灣') return { ch: s.country, sec: '', abroad: true };
  const raw = s.city || '';
  if (/서울|부산|Seoul|Busan/.test(raw)) return { ch: '韓國', sec: '', abroad: true };
  if (/香港|Hong Kong/.test(raw)) return { ch: '香港', sec: '', abroad: true };
  if (/澳門|Macau|Macao/.test(raw)) return { ch: '澳門', sec: '', abroad: true };
  if (/^(北京|上海)/.test(raw)) return { ch: '中國', sec: '', abroad: true };
  let city = normCity(s.city), d = (s.district || '').trim();
  const d2 = d.replace(/[區鄉鎮市]$/, '');
  if (NICK[d2] && !city) [city, d] = NICK[d2];
  if (!city) { if (TPE.includes(d2)) city = '台北市'; else if (NTPC.includes(d2)) city = '新北市'; }
  if (d && d.length === 2 && (TPE.includes(d) || NTPC.includes(d))) d += '區';
  if (!city) return { ch: '地區待補', sec: '', unknown: true };
  const rawTown = (s.city || '').replace(/^臺/, '台');
  if (TOWN[rawTown]) d = rawTown;              // 鄉鎮被當成城市時，用鄉鎮當區域
  const county = /縣$/.test(city);
  const ok = county ? TOWN[d] === city : /區$/.test(d);   // 縣以鄉鎮市分、直轄市以區分；村里或商圈名稱不拿來分區
  return { ch: city, sec: ok ? d : '' };
}
function chapterOrder(name) {
  let i = TW_CITY_ORDER.indexOf(name); if (i >= 0) return i;
  i = ABROAD_ORDER.indexOf(name); if (i >= 0) return 100 + i;
  if (name === '地區待補') return 999;
  return 50; // 其他台灣縣市
}
function quoteOf(s, visits) {
  // 優先：App 裡寫的心得；其次：只寫這一家的 FB 貼文開頭
  const own = visits.find(v => v.source === 'app' && v.snippet); if (own) return own.snippet;
  for (const v of visits) {
    if (!v.snippet) continue;
    const tags = (v.snippet.match(/#/g) || []).length; if (tags > 2) continue;
    const lines = v.snippet.split('\n').map(x => x.replace(/#\S+/g, '').trim()).filter(x => x.length > 3);
    if (lines.length) return lines.slice(0, 3).join(' ');
  }
  return '';
}
const clip = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;

/* ---------- 資料 ---------- */
const MG = { photos: null, visits: null, urls: new Map() };
async function mgLoad(msg) {
  if (!MG.photos) {
    msg('讀取照片清單…'); MG.photos = new Map();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('photos').select('store_id,path,is_cover,taken_on,sort').range(from, from + 999); if (error) throw error;
      data.forEach(p => { const a = MG.photos.get(p.store_id) || []; a.push(p); MG.photos.set(p.store_id, a); }); if (data.length < 1000) break;
    }
    MG.photos.forEach(a => a.sort((x, y) => (y.is_cover - x.is_cover) || (y.taken_on || '').localeCompare(x.taken_on || '') || x.sort - y.sort));
  }
  if (!MG.visits) {
    msg('讀取造訪紀錄…'); MG.visits = new Map();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('visits').select('store_id,visited_on,source,snippet').order('visited_on', { ascending: false }).range(from, from + 999); if (error) throw error;
      data.forEach(v => { const a = MG.visits.get(v.store_id) || []; a.push(v); MG.visits.set(v.store_id, a); }); if (data.length < 1000) break;
    }
  }
}
async function mgSign(paths) {
  const need = [...new Set(paths)].filter(p => p && !MG.urls.has(p));
  for (let i = 0; i < need.length; i += 400) {
    const { data } = await sb.storage.from('photos').createSignedUrls(need.slice(i, i + 400), 6 * 3600);
    (data || []).forEach(u => u.signedUrl && MG.urls.set(u.path, u.signedUrl));
  }
}
function chapters() {
  const map = new Map();
  for (const s of S.stores) {
    if (!visible(s)) continue;
    const r = regionOf(s); const c = map.get(r.ch) || { name: r.ch, abroad: !!r.abroad, unknown: !!r.unknown, secs: new Map(), n: 0 };
    const sec = c.secs.get(r.sec) || []; sec.push(s); c.secs.set(r.sec, sec); c.n++; map.set(r.ch, c);
  }
  const list = [...map.values()].sort((a, b) => chapterOrder(a.name) - chapterOrder(b.name) || b.n - a.n);
  const rank = (a, b) => (b.rating || 0) - (a.rating || 0) || b.visit_count - a.visit_count || (b.last_visit || '').localeCompare(a.last_visit || '');
  list.forEach((c, i) => {
    c.i = i; c.bg = PASTEL[i % PASTEL.length]; c.ink = INK_ON[i % INK_ON.length];
    c.sections = [...c.secs.entries()].map(([name, ss]) => ({ name: name || (c.abroad ? '' : '其他'), stores: ss.sort(rank) })).sort((a, b) => (a.name === '其他') - (b.name === '其他') || b.stores.length - a.stores.length);
    c.top = [...c.secs.values()].flat().sort((a, b) => b.visit_count - a.visit_count)[0];
  });
  return list;
}
const featured = s => (s.rating || 0) >= 4.5 || s.visit_count >= 3;

/* ---------- 畫面 ---------- */
const DOODLE = {
  bowl: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 30h48c0 14-10 22-24 22S8 44 8 30z" fill="currentColor" opacity=".18"/><path d="M8 30h48c0 14-10 22-24 22S8 44 8 30zM20 52h24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 22c0-4 4-4 4-8M34 22c0-4 4-4 4-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M40 8l14 18M46 6l12 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="currentColor"/><circle cx="12" cy="9.5" r="2.6" fill="#fff"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/></svg>',
};
function stickerStars(r) {
  if (!r) return '';
  const full = Math.floor(r), half = r % 1 !== 0;
  return `<span class="mg-stars" aria-label="${r} 星">${'<i>★</i>'.repeat(full)}${half ? '<i class="half">★<i>★</i></i>' : ''}<b>${r.toFixed(1)}</b></span>`;
}
function qrSvg(text) {
  if (typeof qrcode === 'undefined') return '';
  const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
}
function cardHtml(s, c, print) {
  const ph = (MG.photos.get(s.id) || [])[0]; const url = ph && MG.urls.get(ph.path);
  const vs = MG.visits.get(s.id) || []; const q = clip(quoteOf(s, vs), featured(s) ? 90 : 54);
  const years = s.first_visit ? (s.first_visit.slice(0, 4) === (s.last_visit || '').slice(0, 4) ? s.first_visit.slice(0, 4) : `${s.first_visit.slice(0, 4)}–${(s.last_visit || '').slice(0, 4)}`) : '';
  const tilt = ((s.id.charCodeAt(0) + s.id.charCodeAt(1)) % 5 - 2) * 0.6;
  return `<article class="mg-card ${featured(s) ? 'feat' : ''}" style="--tilt:${tilt}deg">
    <div class="mg-ph" style="background:${c.bg}">${url ? `<img src="${url}" alt=""${print ? '' : ' loading="lazy"'} decoding="async">` : `<span class="mg-ph-empty" style="color:${c.ink}">${DOODLE.bowl}</span>`}<span class="tape"></span>${featured(s) ? `<span class="mg-pick" style="background:${c.ink}">${s.visit_count >= 3 && !(s.rating >= 4.5) ? `回訪 ${s.visit_count} 次` : '心肝推薦'}</span>` : ''}</div>
    <div class="mg-body">
      <div class="mg-meta"><span class="mg-cu" style="background:${c.bg};color:${c.ink}">${esc(s.cuisine || '')}</span>${s.district && c.abroad ? '' : ''}<span>${esc(years)}${s.visit_count > 1 ? `・去過 ${s.visit_count} 次` : ''}</span></div>
      <h4 class="mg-name">${esc(s.name)}</h4>
      ${stickerStars(s.rating)}
      ${q ? `<p class="mg-quote">${esc(q)}</p>` : ''}
    </div>
    ${print ? `<a class="mg-qr" href="${gmapsLink(s)}" aria-label="Google 地圖">${qrSvg(gmapsLink(s))}</a>` : `<a class="mg-go" href="#/store/${encodeURIComponent(s.id)}" aria-label="打開 ${esc(s.name)}"></a>`}
  </article>`;
}
function openerHtml(c) {
  const total = c.n, rated = [...c.secs.values()].flat().filter(s => s.rating).length;
  return `<section class="mg-opener" style="--bg:${c.bg};--ink:${c.ink}">
    <p class="mg-kicker">${c.abroad ? 'ABROAD' : c.unknown ? 'MORE' : 'TAIWAN'}・第 ${c.i + 1} 章</p>
    <h2 class="mg-title">${esc(c.name)}</h2>
    <div class="mg-doodle">${DOODLE.bowl}</div>
    <ul class="mg-facts"><li><b>${total}</b>家吃過的店</li><li><b>${c.sections.filter(x => x.name).length || 1}</b>${c.abroad ? '個地方' : '個區域'}</li>${rated ? `<li><b>${rated}</b>家有評分</li>` : ''}</ul>
    ${c.top && c.top.visit_count > 1 ? `<p class="mg-most">${DOODLE.heart}最常去：${esc(c.top.name)}（${c.top.visit_count} 次）</p>` : ''}
    ${c.unknown ? '<p class="mg-most">這些店還沒有填地區，可以在 App 的店家頁「修改資料」補上。</p>' : ''}
  </section>`;
}
function chapterHtml(c, print) {
  return openerHtml(c) + c.sections.map(sec => `<section class="mg-sec" style="--bg:${c.bg};--ink:${c.ink}">
      ${sec.name ? `<h3 class="mg-sec-title">${DOODLE.pin}<span>${esc(sec.name)}</span><small>${sec.stores.length} 家</small></h3>` : ''}
      <div class="mg-grid">${sec.stores.map(s => cardHtml(s, c, print)).join('')}</div></section>`).join('');
}

/* ---------- 雜誌頁 ---------- */
async function viewMagazine(chIdx) {
  $('#topTitle').textContent = '美食指南';
  const v = $('#view');
  v.innerHTML = `<div class="mg"><p class="empty" id="mgMsg">準備中…</p></div>`;
  const msg = t => { const e = $('#mgMsg'); if (e) e.textContent = t; };
  try { await mgLoad(msg); } catch (e) { msg('讀取失敗：' + (e.message || e)); return; }
  const chs = chapters();
  if (chIdx == null) {
    // 封面＋目錄
    const total = chs.reduce((a, c) => a + c.n, 0), years = S.stores.map(s => s.first_visit).filter(Boolean).sort();
    v.innerHTML = `<div class="mg"><section class="mg-cover">
        <p class="mg-kicker">${esc((years[0] || '2020').slice(0, 4))} — ${new Date().getFullYear()}</p>
        <h2 class="mg-cover-title">心肝<br>美食指南</h2>
        <div class="mg-doodle big">${DOODLE.bowl}</div>
        <p class="mg-cover-sub">${total} 家吃過的店・${chs.length} 個章節</p>
      </section>
      <section class="mg-toc"><h3>目錄</h3><ol>${chs.map(c => `<li><a href="#/magazine/${c.i}" style="--bg:${c.bg};--ink:${c.ink}"><span class="dot"></span><span class="t">${esc(c.name)}</span><span class="n">${c.n} 家</span></a></li>`).join('')}</ol></section>
      <section class="mg-printbox"><h3>A4 印刷版</h3><p>用電腦的 Chrome 或 Edge 開啟，按下面的按鈕，再在列印視窗選「另存為 PDF」。全部約 ${Math.ceil(total / 6) + chs.length * 2 + 2} 頁，可以整本或單一章節輸出。每家店都附 QR code，掃描就能開 Google 地圖。</p>
        <div class="actions"><a class="btn primary" href="#/print/all">整本印刷版</a><select id="mgPrintCh" aria-label="選擇章節"><option value="">或選一個章節…</option>${chs.map(c => `<option value="${c.i}">${esc(c.name)}（${c.n} 家）</option>`).join('')}</select></div></section></div>`;
    $('#mgPrintCh').onchange = e => { if (e.target.value !== '') location.hash = '#/print/' + e.target.value; };
    return;
  }
  const c = chs[+chIdx]; if (!c) { location.hash = '#/magazine'; return; }
  v.innerHTML = `<div class="mg"><p class="empty" id="mgMsg">載入照片…</p></div>`;
  await mgSign([...c.secs.values()].flat().map(s => (MG.photos.get(s.id) || [])[0]?.path));
  const prev = chs[c.i - 1], next = chs[c.i + 1];
  v.innerHTML = `<div class="mg"><a class="back" href="#/magazine">‹ 目錄</a>${chapterHtml(c, false)}
    <nav class="mg-nav">${prev ? `<a class="btn" href="#/magazine/${prev.i}">‹ ${esc(prev.name)}</a>` : '<span></span>'}${next ? `<a class="btn primary" href="#/magazine/${next.i}">${esc(next.name)} ›</a>` : ''}</nav></div>`;
  window.scrollTo(0, 0);
}

/* ---------- 印刷版 ---------- */
async function viewPrint(which) {
  const v = $('#view'); document.body.classList.add('printing');
  v.innerHTML = `<div class="print-ui"><a class="btn" href="#/magazine">‹ 回美食指南</a><span id="pMsg">準備中…</span><button class="btn primary" id="pGo" type="button" disabled>列印／另存 PDF</button></div><div id="book"></div>`;
  const msg = t => $('#pMsg').textContent = t;
  try { await mgLoad(msg); } catch (e) { msg('讀取失敗：' + (e.message || e)); return; }
  if (typeof qrcode === 'undefined') await new Promise(r => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; sc.onload = r; sc.onerror = r; document.head.appendChild(sc); });
  const chs = chapters(), pick = which === 'all' ? chs : [chs[+which]].filter(Boolean);
  const stores = pick.flatMap(c => [...c.secs.values()].flat());
  msg(`載入 ${stores.length} 家店的照片…`);
  await mgSign(stores.map(s => (MG.photos.get(s.id) || [])[0]?.path));
  const total = chs.reduce((a, c) => a + c.n, 0);
  // 固定 A4 版面：每頁 3 列、每列 3 家；每個區域從新的一列開始
  const pages = []; const tocAt = {};
  const page = (html, cls = '', ch = null) => pages.push({ html, cls, ch });
  for (const c of pick) {
    tocAt[c.i] = pages.length + 1;
    page(openerHtml(c), 'opener', c);
    const rows = [];
    for (const sec of c.sections) for (let k = 0; k < sec.stores.length; k += 3) rows.push({ title: k === 0 ? sec.name : '', more: k > 0 ? sec.name : '', stores: sec.stores.slice(k, k + 3), total: sec.stores.length });
    for (let r = 0; r < rows.length; r += 3) {
      page(rows.slice(r, r + 3).map((row, ri) => `<div class="p-row">${row.title ? `<h3 class="mg-sec-title">${DOODLE.pin}<span>${esc(row.title)}</span><small>${row.total} 家</small></h3>` : ri > 0 ? '' : `<h3 class="mg-sec-title cont">${row.more ? `<span>${esc(row.more)}</span><small>（續）</small>` : ''}</h3>`}<div class="p-cards">${row.stores.map(s => cardHtml(s, c, true)).join('')}</div></div>`).join(''), 'content', c);
    }
  }
  const front = which === 'all' ? 2 : 0;
  const coverHtml = `<div class="mg-cover"><p class="mg-kicker">2020 — ${new Date().getFullYear()}</p><h2 class="mg-cover-title">心肝<br>美食指南</h2><div class="mg-doodle big">${DOODLE.bowl}</div><p class="mg-cover-sub">${total} 家吃過的店・${chs.length} 個章節</p></div>`;
  const tocHtml = `<div class="mg-toc"><h3>目錄</h3><ol>${chs.map(c => `<li><span style="--bg:${c.bg};--ink:${c.ink}" class="row-t"><span class="dot"></span><span class="t">${esc(c.name)}<small> ・${c.n} 家</small></span><span class="n">${tocAt[c.i] + front}</span></span></li>`).join('')}</ol><p class="mg-note">掃描每家店右下角的 QR code，可以直接在 Google 地圖打開。</p></div>`;
  const all = (front ? [{ html: coverHtml, cls: 'cover' }, { html: tocHtml, cls: 'toc' }] : []).concat(pages);
  $('#book').className = 'mg';
  $('#book').innerHTML = all.map((p, i) => `<section class="a4 ${p.cls}" ${p.ch ? `style="--bg:${p.ch.bg};--ink:${p.ch.ink}"` : ''}>${p.html}${p.cls === 'content' ? `<footer class="p-foot"><span>${esc(p.ch.name)}</span><span>${i + 1}</span></footer>` : ''}</section>`).join('');
  // 等圖片載入
  const imgs = [...$('#book').querySelectorAll('img')]; let n = 0;
  const waitAll = Promise.all(imgs.map(img => img.complete ? (n++, null) : new Promise(r => { img.onload = img.onerror = () => { n++; if (n % 20 === 0) msg(`載入照片 ${n} / ${imgs.length}`); r(); }; })));
  await Promise.race([waitAll, new Promise(r => setTimeout(r, 180000))]);
  if (n < imgs.length) msg(`有 ${imgs.length - n} 張照片還沒載入完成，可以稍等再按列印。`);
  if (n >= imgs.length) msg(`準備好了：${stores.length} 家店、${all.length} 頁。按右邊的按鈕，目的地選「另存為 PDF」，紙張 A4，勾選「背景圖形」。`);
  $('#pGo').disabled = false; $('#pGo').onclick = () => window.print();
}
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/print')) document.body.classList.remove('printing'); });
