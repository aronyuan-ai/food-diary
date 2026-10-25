# 心肝美食帳

2020 年起在 Facebook 記錄的美食，整理成可以搜尋、看地圖、半星評分的手機 App（PWA）。

- App：https://aronyuan-ai.github.io/food-diary/
- `docs/`：App 本體（GitHub Pages 從這裡發布）
- `supabase/`：資料庫結構
- `.github/workflows/keepalive.yml`：每 3 天連一次資料庫，避免 Supabase 免費專案被暫停

美食資料存在 Supabase，只有登入的本人能讀寫；這個公開的資料夾只放程式。
Google 地圖金鑰限定只能在 aronyuan-ai.github.io 使用。
