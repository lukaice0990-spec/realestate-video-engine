# TIREA Site

正式網站專案骨架，包含：
- `index.html` 首頁
- `survey.html` 海外置產需求分析
- `api/survey-submit.js` 收單 API
- `api/admin-leads.js` 後台列表 API
- `api/admin-update-lead.js` 後台更新名單 API
- `admin/index.html` admin dashboard 基礎版
- `docs/supabase-schema.sql` Supabase schema

## 啟動

1. 安裝依賴
   - `npm install`
2. 複製環境變數
   - 複製 `.env.example` 為 `.env.local`
3. 在 Supabase 執行 `docs/supabase-schema.sql`
4. 啟動本機
   - `npm run dev`

## API
- `POST /api/survey-submit`
- `GET /api/admin-leads?token=...`
- `POST /api/admin-update-lead?token=...`

## 注意
- `SUPABASE_SERVICE_ROLE_KEY` 只能放後端環境變數，不可暴露到前端。
- admin 頁面目前用簡易 token 驗證，正式上線可改成真正登入。
- 若設定 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`，新名單送出後會自動發 Telegram 通知。
- 若要使用 Google Maps API 版 Invest Map，需設定 `GOOGLE_MAPS_API_KEY`。
