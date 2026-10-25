# 心肝美食帳：專案說明（給接手的 Claude 與未來的自己）

這個檔案是專案的長期記憶。開新對話維護 App 時，先讀完這份再動手；
做了重要變更或決定，請回來更新這份文件。

## 這是什麼

把 Facebook 帳號（陳心肝，vivichen7547）2020 年起的美食貼文，整理成：
1. **手機 App（PWA）**：搜尋、地圖、半星評分、新增紀錄、照片 — 已上線
2. **美食指南（雜誌模式）+ A4 印刷 PDF** — 已上線（2026-10-25）
3. **FB 新貼文持續匯入** — 尚未開始（設計見下方）

使用者是非工程背景，全部由 Claude 實作；只給自己看；iPhone 與 Android 都要能用；預算：免費。

## 已確定的需求與決定（不要推翻，除非使用者要求）

| 項目 | 決定 |
|---|---|
| 收錄範圍 | 只收 **2020-01-01 之後**的貼文（2009–2018 幾乎是遊戲動態） |
| 海外店家 | 收錄（日、韓、港、澳、上海、越南、澳洲） |
| 評分 | 1–5 星，**可給半星**；舊店一律留白，由使用者自己評 |
| 雜誌 | **全部店家都收錄**，雜誌風；印刷先給 **A4 電子檔**，頁數不限 |
| 資料庫 | Supabase 免費方案（Tokyo） |
| App | PWA，託管在 GitHub Pages（本 repo 的 `docs/`） |
| 地圖與地點 | **Google**（使用者選 A 方案：地圖、地點搜尋都用 Google，已綁卡、免費額度內） |
| 未確認的店 | 不強迫全部確認；App 裡標「未確認」，邊用邊修 |
| 公開與否 | **維持需要登入**（2026-10-25 討論過開放唯讀：貼文全文含家人隱私、照片有人臉、公開會耗 Google／Supabase 額度，使用者決定不開放）。登入狀態靠 Supabase refresh token 長期保存，不需重複登入；iPhone 要從「加入主畫面」的 App 開才不會被 Safari 7 天清除 |

## 架構

- **App 網址**：https://aronyuan-ai.github.io/food-diary/
- **Repo**：github.com/aronyuan-ai/food-diary（public；只放程式，不放個人資料）
  - `docs/`：App（index.html、app.js、style.css、sw.js、config.js、manifest、icons）
  - `supabase/01_schema.sql`：資料庫結構（使用者已在 SQL Editor 執行過）
  - `supabase/02_viewers.sql`：唯讀檢視者（見下）
  - `tools/`：資料整理用的 Python 腳本（說明見下）
  - `.github/workflows/keepalive.yml`：每 3 天 ping Supabase，避免免費專案 7 天沒用被暫停
- **Supabase**：`https://uwxxhbzxrgwvdcqmohzu.supabase.co`，publishable key 在 `docs/config.js`
  - 表：`stores`（店家）、`visits`（每次造訪，含 FB 貼文時間戳 `fb_post_ts` 防重複）、`photos`
  - Storage bucket `photos`（私人），路徑 `<user_id>/<檔名>.webp`；FB 照片檔名為 `fb_<原檔名>.webp`
  - RLS：每列只有 `user_id = auth.uid()` 可讀寫。登入方式 Email + 密碼；**註冊已請使用者關閉**
  - **唯讀檢視者**（2026-10-25）：`supabase/02_viewers.sql` 建 `viewers(owner_id, viewer_id)` 表與 `can_view()` 函式，三張表與照片檔案加「檢視者可讀」政策，寫入仍只限本人。檢視者帳號由使用者在 Supabase「Authentication → Users → Add user」建立，再執行該 SQL 檔最下面的 insert（換 Email）。登入框可只輸入帳號：`loginEmail()` 先 NFKC（全形轉半形，Android 中文輸入法會打出全形）、去空白與零寬字元、轉小寫，沒有 @ 時自動補成 `帳號@example.com`，帳號欄下方顯示實際登入的 Email（Supabase 一定要 Email；example.com 為保留網域）。這類帳號收不到信，忘記密碼要由使用者在 Supabase「Users」重設。App 啟動時查 `viewers` 決定 `S.readonly`：隱藏新增分頁、評分改為唯讀、隱藏修改資料／再訪／照片封面與刪除、更多頁只剩帳號
  - Claude **沒有**也**不應索取** secret key 或資料庫密碼。資料寫入一律透過 App 以使用者身分進行（匯入檔 → App「更多」頁匯入）
- **Google Maps Platform**（使用者的 Google Cloud 專案「心肝美食帳」）
  - App 用金鑰在 `docs/config.js`，限制：網站 `https://aronyuan-ai.github.io/*`，API：Maps JavaScript API、Places API (New)
  - 曾有一把「批次查詢用」金鑰，用完已請使用者刪除。需要再批次查詢時，請使用者另建一把只開 Places API (New) 的金鑰，用完即刪，不要寫進任何檔案或 repo
  - **Google 條款（重要）**：只能永久保存 `google_place_id`；座標最多快取 30 天（App 開啟時自動重新整理超過 25 天的，每次最多 150 家，見 `refreshGoogleCoords`）；Google 的店名、地址不寫入資料庫，App 即時讀取顯示。行政區改用 OpenStreetMap（Photon）依座標反查後保存。Google 資料必須顯示在 Google 地圖上。
  - 免費額度參考：Text Search Pro 每月 5,000 次、Place Details Essentials 每月 10,000 次、Dynamic Maps 每月 10,000 次

## App 功能現況（docs/app.js）

- 搜尋清單：關鍵字（店名、別名、地區、菜系、筆記）、菜系／地區／評分／狀態篩選、排序（最近、最常去、評分、離我最近、店名）
- 地圖：Google 地圖 + MarkerClusterer，依菜系篩選，「我的位置」
- 店家頁：封面照片、半星評分（點星星左半邊 = 半星）、在 Google 地圖開啟、修改資料（含重新指定 Google 地點）、隱藏非店家、造訪紀錄、照片牆（設為封面、刪除）
- 新增：選既有店家或從 Google 搜尋新店、日期、評分、心得、照片（壓縮成 WebP 上傳）
- 更多：統計、匯入資料（.json）、從 FB 匯出檔匯入照片（電腦 Chrome/Edge 選資料夾）、登出
- 菜系 19 類：小吃、麵食、咖啡甜點、中式料理、火鍋、燒肉燒烤、日式、港式、西式、韓式、海鮮熱炒、台菜客家、飲料、東南亞、餐酒館、牛排、自助餐、鐵板燒、其他（＋未分類）
- 部署：改 `docs/` 後 push 到 main 即上線；`docs/sw.js` 對 App 自身檔案採「網路優先」（2026-10-25 起，之前是快取優先導致使用者看到舊版），改動後仍建議把 `V='food-vN'` 加一以清掉舊快取

## 資料整理流程（tools/）

FB 匯出 JSON 的中文是 latin-1 誤編碼，`load.py` 的 `fix()` 會轉回 UTF-8。

1. `build_stores.py posts_fixed.json name_cls.json out_dir [since]`：從貼文抽出店家（hashtag + 打卡），依 `name_cls.json`（每個 hashtag 名稱的人工分類：F 店家／N 非店家／D 菜名／U 不確定）過濾，合併分店，推測菜系與國家；`cuisine_override.json`（同資料夾）覆寫菜系
   - 「X月美食解鎖」月報貼文：hashtag 後的「（地區）」是行政區；照片大致依 hashtag 順序對應（不一定準）
   - 店家 id = 正規化名稱的 md5 前 10 碼（穩定，重跑不變）
2. `geocode.py`：OpenStreetMap（Photon）候選地址（早期用，後改 Google）
3. `google_match.py`：Google Text Search 找 place_id（需批次金鑰，見上）
4. `make_seed.py`：產生店家確認頁用的資料
5. `make_import.py`：產生 App 匯入檔（stores + visits）
6. `make_photos.py`：產生照片對照檔（FB 照片路徑 → 店家）

這些中間資料（posts_fixed.json、name_cls.json、cuisine_override.json、stores.json 等）含個人資料，**不放進這個 public repo**。使用者手上有一份「專案資料備份」壓縮檔。

### 2026-10 時的資料規模
- 2,529 篇貼文 → 712 篇美食貼文 → 1,660 家店（台灣 1,537、海外 123）、1,775 筆造訪
- 確認狀態：已確認 1,216、未確認 444（含非店家已隱藏的）
- 照片：3,517 筆對應、3,388 個檔案，全部在 `your_facebook_activity/posts/media/xingdongshangchuan_426005114081028/`；FB 匯出被拆成 2 個 zip，照片匯入要對兩個資料夾各跑一次

## 店家確認頁（claude.ai artifact）

https://claude.ai/artifact/YFjiDnpwFPGTV8u8g8Dxco — 早期用來逐家確認，結果存在該 artifact 的資料庫 `reviews` 集合。
資料已匯入 Supabase；之後的修正請在 App 裡做，**這個確認頁已退役**。

## 待辦（依使用者優先順序）

1. ✅ 照片匯入完成（2026-10-25）：3,517 筆照片紀錄全部進 Supabase（兩個資料夾分兩次跑：新增 2,519、已有 998，無缺漏）
2. ✅ 美食指南上線（2026-10-25）：使用者選「依地區分章、像美食指南、有質感帶可愛風」
   - `docs/magazine.js`、`docs/magazine.css`；路由 `#/magazine`（封面＋目錄）、`#/magazine/<章>`、`#/print/all` 或 `#/print/<章>`
   - 分章：台灣依縣市（固定順序），直轄市以「區」分節、縣以「鄉鎮市」分節（`TOWN` 對照表把 OSM 誤當城市的鄉鎮歸回縣）；海外依國家；沒位置的放「地區待補」
   - 排序：評分 → 造訪次數 → 最近；「心肝推薦」= 評分 ≥ 4.5 或去過 ≥ 3 次
   - 字型：粉圓 Huninn（標題）、霞鶩文楷 LXGW WenKai TC（心得引言）；每章一個粉彩色；拍立得照片＋紙膠帶
   - 印刷：固定 A4 頁（每頁 3×3 家，區域從新的一列開始），頁尾章名＋頁碼，目錄有頁碼，每家附 Google 地圖 QR code；整本約 241 頁（mock 測試），用電腦 Chrome「另存為 PDF」，要勾「背景圖形」
   - 引言只取 App 心得或「只寫一兩家」的 FB 貼文開頭（月報貼文不取）
3. App 內匯入 FB 新貼文：使用者每隔幾個月從 FB「下載你的資訊」只選「貼文」、日期從上次之後、JSON 格式；App 解析（記得 latin-1 → UTF-8 修正）、以 `fb_post_ts` 去重、已知店名（含別名）自動歸戶、新名稱進「未確認」
3a. ✅ Google 地點補配對（2026-10-25）：FB 打卡來源的 374 家原本沒有 place_id，「在 Google 地圖開啟」只開座標。`gmapsLink` 改成沒 place_id 時用「店名＋城市行政區」搜尋；「更多」頁新增「幫沒有 Google 地點的店自動配對」（`matchGoogle`：Places JS `Place.searchByText`，有座標時 800m bias，接受「名稱相似 ≥0.6 且 1.5km 內」或「200m 內且名稱部分相同 ≥0.3」，店名含「-」時取各段最佳；沒座標時名稱需幾乎相同）。單家可在店家頁「修改資料」→「重新指定 Google 地圖上的位置」手動修。使用者實跑結果：345 家配對成功、391 家對不上（多數是完全沒有位置的店）。搜尋頁「狀態」篩選新增「沒有 Google 地點」，方便逐家手動修
4. 可考慮：列表顯示封面縮圖、店家合併功能、每季提醒匯入 FB 的排程

## 與使用者溝通

- 繁體中文（台灣用語）；使用者不寫程式，步驟要具體到按哪個按鈕
- 需要使用者在 Supabase／Google Cloud／GitHub 操作時，給逐步說明；不要索取密碼或 secret key
- GitHub 帳號 aronyuan-ai；Pages 從 main 的 /docs 發布（已設定）
