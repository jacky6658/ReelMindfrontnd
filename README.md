# ReelMind 前端應用

> AI 短影音智能體前端 - 原生 HTML/CSS/JavaScript

## 🎯 功能說明

### 核心功能

#### 1. 一鍵生成模式（Mode3）
- **帳號定位生成**：AI 分析用戶背景，生成個人品牌定位
- **選題推薦**：根據帳號定位推薦適合的短影音主題
- **短影音腳本生成**：生成完整的 30 秒短影音腳本，包含：
  - 主題設定
  - 開場鉤子
  - 核心內容
  - 行動呼籲（CTA）
  - 畫面描述
  - 發佈文案
- **階段性驗證機制**：確保每個階段完成後再進行下一步
- **腳本結構選擇**：支援 5 種不同的腳本結構（A/B/C/D/E）
- **儲存與匯出**：可將生成的腳本儲存到創作者資料庫，或匯出為 CSV 檔案

#### 2. IP 人設規劃模式（Mode1）
- **深度對話建立個人品牌檔案**：透過與 AI 深度對話，記錄人生曲線和個人特色
- **帳號定位生成**：AI 協助建立完整的 IP 人設，包含：
  - 目標受眾分析
  - 傳達目標
  - 帳號定位
  - 內容方向
  - 風格調性
  - 差異化優勢
- **選題方向（影片類型配比）**：根據帳號定位生成適合的影片類型、佔比、目的和內容方向建議
- **短影音腳本生成**：生成完整的短影音腳本（原「一週腳本」）
- **14 天規劃**：快速生成 14 天短影音內容規劃
- **今日腳本**：快速生成今日的短影音腳本
- **長期記憶整合**：AI 會記住用戶之前說過的內容，生成結果越來越精準
- **過往紀錄管理**：查看、選擇、匯出或刪除所有歷史生成記錄
  - 使用標籤式導航（帳號定位、選題方向、短影音腳本）
  - 支援標題編輯功能
  - 快速查看和展開完整內容
- **自由搭配設定**：可以從過往紀錄中選擇不同類型的設定（帳號定位、選題方向、短影音腳本），自由組合後與 AI 討論
- **標題編輯功能**：用戶可以編輯生成結果的標題
- **自動儲存**：在對話中說「儲存」即可自動保存生成內容
- **LLM 金鑰綁定限制**：必須綁定自己的 LLM API 金鑰才能與 AI 對談
- **重新定位功能**：點擊「重新定位」快速按鈕，AI 會顯示「短影音內容策略矩陣」表格，協助重新規劃帳號定位

#### 3. AI 顧問對話模式（Mode2）
- **ChatGPT 風格聊天介面**：流暢的對話體驗
- **長期記憶系統整合**：AI 記住用戶的對話歷史
- **會話管理功能**：管理多個對話主題
- **抽屜式說明欄位**：隨時查看使用說明

#### 4. 創作者資料庫（UserDB）
- **個人資料管理**：查看和編輯個人資訊
- **我的腳本管理**：
  - 查看所有已生成的腳本
  - 查看完整腳本內容
  - 下載 PDF 或 CSV 檔案
  - 刪除不需要的腳本
- **帳號定位記錄**：查看所有已保存的帳號定位記錄
- **選題記錄**：查看所有已保存的選題記錄
- **IP 人設規劃結果**：查看所有 IP 人設規劃的生成結果
- **訂閱狀態管理**：查看當前訂閱狀態、到期時間
- **取消自動續費功能**：可隨時取消自動續費
- **使用統計**：查看使用情況統計
- **訂單記錄**：查看所有訂單記錄
- **AI API Key 金鑰管理**：
  - 綁定自己的 LLM API 金鑰（支援 Gemini 和 OpenAI）
  - 測試 API 金鑰是否有效
  - 選擇使用的模型
  - 系統會優先使用用戶提供的金鑰
  - **強制綁定**：Mode1 必須綁定 LLM 金鑰才能與 AI 對談
  - 提供「如何取得」按鈕，直接導向實戰指南教學文章
- **資料匯出**：可將所有資料匯出為 Excel 檔案

#### 5. 訂閱付款
- **強制登入才能訂閱**：確保用戶已登入
- **ECPay 金流整合**：安全的付款流程
- **訂閱方案**：
  - 永久使用方案：NT$9,900（一次購買，永久使用）
  - 年費方案：NT$7,980（平均每個月 NT$690）
- **訂閱狀態顯示**：清楚顯示當前訂閱狀態
- **自動續費管理**：可設定是否自動續費
- **付款結果頁面**：顯示付款成功或失敗的詳細資訊

#### 6. 免費體驗功能
- **限時免費體驗**：未訂閱用戶可免費體驗 3 次生成
- **登入限制**：需要登入才能使用免費體驗
- **使用次數追蹤**：自動追蹤使用次數，達到上限後提示升級
- **升級提示**：使用完免費次數後，提示用戶升級訂閱

#### 7. 實戰指南（Guide）
- **基礎教學**：包含多篇實用的教學文章
  - 三步生成 30 秒短影音腳本
  - AI 帳號定位：內容支柱與 14 天計畫
  - Reels / Shorts / TikTok 腳本差異
  - 腳本結構選擇指南
  - 如何拿到自己的 LLM 金鑰
- **進階教學**：進階功能教學（規劃中）
- **動態按鈕**：根據用戶登入和訂閱狀態，動態調整按鈕文字和行為
- **影片教學**：包含 YouTube 影片教學連結

### 技術特色

- **單頁應用（SPA）**：主要功能整合在 `index.html`，提供流暢的使用體驗
- **響應式設計（RWD）**：完美支援桌面和行動裝置，包含 iOS 安全區域支援
- **原生 JavaScript**：無需框架，輕量高效
- **Server-Sent Events (SSE)**：即時 AI 回應串流，提供流暢的對話體驗
- **Google OAuth**：安全的用戶認證機制
- **LocalStorage**：本地資料暫存，提升載入速度
- **快取機制**：智能快取過往紀錄，提升載入速度
- **長期記憶系統**：AI 記住用戶的對話歷史，提供更精準的建議
- **Markdown 渲染**：支援 Markdown 格式的內容渲染，完全自然語言顯示
  - 自動檢測 HTML 和 Markdown 格式
  - 支援表格、粗體、換行、列表等格式
  - 使用 DOMPurify 進行安全清理
- **Toast 通知系統**：統一的用戶通知機制
- **CSRF 防護**：後端整合 CSRF 防護機制
- **XSS 防護**：前端整合 XSS 防護機制
- **事件委派**：使用事件委派處理動態生成的按鈕，確保所有功能正常運作

### 用戶體驗優化

- **智能載入**：使用快取機制，減少 API 請求，提升載入速度
- **平滑滾動**：支援平滑滾動，提供更好的瀏覽體驗
- **觸控優化**：手機版按鈕和觸控目標符合 iOS 標準（最小 44px）
- **鍵盤適配**：iOS Safari 鍵盤彈出時自動調整布局
- **安全區域支援**：支援 iOS 安全區域，避免內容被遮擋
- **錯誤處理**：友好的錯誤提示訊息
- **載入動畫**：動態載入動畫，提升用戶體驗

---

## 🚀 快速開始

### 本地開發

#### 方法一：使用 VS Code Live Server（推薦）

1. 在 VS Code 中打開 `index.html`
2. 右鍵選擇 "Open with Live Server"
3. 瀏覽器會自動開啟並支援熱重載

#### 方法二：使用 Python HTTP Server

```bash
# 進入前端目錄
cd ReelMindfrontnd-main

# 啟動 HTTP 伺服器
python3 -m http.server 5173

# 打開瀏覽器訪問：http://localhost:5173
```

#### 方法三：使用 Node.js http-server

```bash
# 安裝 http-server（如果尚未安裝）
npm install -g http-server

# 啟動伺服器
cd ReelMindfrontnd-main
http-server -p 5173

# 打開瀏覽器訪問：http://localhost:5173
```

### Docker 打包與部署

#### 建構 Docker 映像

```bash
# 在 ReelMindfrontnd-main 目錄下
docker build -t reelmind-frontend:latest .
```

#### 運行容器

```bash
# 基本運行
docker run -d \
  --name reelmind-frontend \
  -p 8080:8080 \
  reelmind-frontend:latest

# 訪問：http://localhost:8080
```

#### Docker Compose（推薦）

建立 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  frontend:
    build: .
    container_name: reelmind-frontend
    ports:
      - "8080:8080"
    restart: unless-stopped
```

啟動：

```bash
docker-compose up -d
```

## 🔧 配置設定

### API 端點配置

編輯 `assets/js/config.js`：

```javascript
window.APP_CONFIG = {
  API_BASE: 'https://aivideobackend.zeabur.app',  // 生產環境
  // API_BASE: 'http://127.0.0.1:8000',          // 本地開發
};
```

### 環境變數（可選）

如果需要使用環境變數，可以在部署時設定：

```bash
# 在 Dockerfile 或部署平台設定
ENV API_BASE=https://aivideobackend.zeabur.app
```

## 📁 專案結構

```
ReelMindfrontnd-main/
├── index.html                    # 主要應用程式（單頁應用）
├── subscription.html            # 訂閱頁面
├── checkout.html                # 付款資訊頁面
├── payment-result.html          # 付款結果頁面
├── userDB.html                  # 創作者資料庫頁面
├── mode1.html                   # IP 人設規劃模式（獨立頁面）
├── mode2.html                   # AI 顧問模式（獨立頁面）
├── mode3.html                   # 一鍵生成模式（獨立頁面）
├── guide.html                   # 實戰指南頁面
├── experience.html              # 免費體驗頁面
├── contact.html                 # 聯絡頁面
├── auth/
│   └── popup-callback.html      # OAuth callback 頁面（必須）
├── assets/
│   ├── css/                     # 樣式檔案
│   │   ├── main.css
│   │   ├── variables.css
│   │   ├── animations.css
│   │   └── page-transitions.css
│   └── js/                      # JavaScript 檔案
│       ├── config.js            # API 配置
│       ├── common.js             # 共享函數
│       ├── auth.js               # 認證相關
│       ├── api.js                # API 調用
│       ├── security.js           # XSS 防護
│       ├── mode1.js              # IP 人設規劃邏輯
│       ├── mode3.js              # 一鍵生成邏輯
│       ├── userDB.js             # 創作者資料庫邏輯
│       └── experience.js         # 免費體驗邏輯
├── Dockerfile                    # Docker 配置
├── CNAME                         # GitHub Pages 自訂網域
└── README.md                     # 本文件
```

## 🚢 部署

### 部署到 Zeabur

1. 將專案推送到 GitHub
2. 在 Zeabur 建立新專案
3. 連接 GitHub 倉庫
4. 選擇「Static Site」類型
5. 設定建構命令（如需要）：
   ```bash
   # 無需建構，直接部署
   ```
6. 設定輸出目錄：`.`（根目錄）
7. 部署服務

### 部署到 GitHub Pages

1. 將專案推送到 GitHub
2. 在倉庫設定中啟用 GitHub Pages
3. 選擇 `main` 分支和 `/` 根目錄
4. 設定自訂網域（可選）：在 `CNAME` 檔案中設定

### 部署到其他靜態網站託管

- **Vercel**：連接 GitHub 倉庫，自動部署
- **Netlify**：連接 GitHub 倉庫，自動部署
- **Cloudflare Pages**：連接 GitHub 倉庫，自動部署

## 🔌 API 整合

前端透過以下 API 與後端通訊：

### 認證 API

- `GET /api/auth/google` - 獲取 Google OAuth URL
- `GET /api/auth/me` - 獲取當前用戶資訊
- `POST /api/auth/refresh` - 刷新 token

### AI 功能 API

- `POST /api/chat/stream` - SSE 聊天串流
- `POST /api/generate/positioning` - 生成帳號定位
- `POST /api/generate/topics` - 生成選題推薦
- `POST /api/generate/script` - 生成短影音腳本

### IP 人設規劃 API

- `GET /api/ip-planning/my` - 獲取用戶的 IP 人設規劃結果
- `POST /api/ip-planning/save` - 儲存 IP 人設規劃結果
- `DELETE /api/ip-planning/results/{result_id}` - 刪除 IP 人設規劃結果

### 記憶管理 API

- `GET /api/user/memory/full/{user_id}` - 獲取用戶完整記憶（STM + LTM）
- `POST /api/memory/long-term` - 儲存長期記憶

### LLM Key 管理 API

- `GET /api/user/llm-keys/check` - 檢查用戶是否已綁定 LLM Key（Mode1 必須檢查）
- `GET /api/user/llm-keys/{user_id}` - 獲取用戶的 LLM Keys
- `POST /api/user/llm-keys` - 儲存 LLM Key
- `POST /api/user/llm-keys/test` - 測試 LLM Key
- `DELETE /api/user/llm-keys/{user_id}` - 刪除 LLM Key
- `GET /api/llm/models` - 獲取可用的 LLM 模型列表

### 訂閱與付款 API

- `POST /api/payment/checkout` - 建立訂單
- `GET /api/user/subscription` - 獲取訂閱狀態
- `PUT /api/user/subscription/auto-renew` - 更新自動續費狀態

### 用戶資料 API

- `GET /api/user/conversations/{user_id}` - 獲取對話記錄
- `GET /api/user/generations/{user_id}` - 獲取生成記錄
- `GET /api/user/scripts/{user_id}` - 獲取腳本記錄
- `GET /api/user/positioning/{user_id}` - 獲取帳號定位記錄
- `GET /api/user/topics/{user_id}` - 獲取選題記錄

完整 API 文檔請參考後端 `README.md`。

## 🎨 開發指南

### 本地開發

1. 使用 VS Code Live Server 開啟 `index.html`
2. 確保後端 API 可正常連線
3. 使用瀏覽器開發者工具進行調試

### 調試工具

- 使用瀏覽器開發者工具（F12）
- 檢查控制台日誌獲取詳細調試資訊
- 使用 Network 標籤檢查 API 請求

### 檔案修改注意事項

- **`index.html`**：主要應用程式，包含所有功能
- **`mode1.html`**：IP 人設規劃模式獨立頁面
- **`mode3.html`**：一鍵生成模式獨立頁面
- **`guide.html`**：實戰指南頁面
- **`userDB.html`**：創作者資料庫頁面
- **`assets/js/config.js`**：API 端點配置
- **`assets/js/common.js`**：共享函數，多個頁面共用
- **`assets/js/security.js`**：XSS 防護函數
- **`auth/popup-callback.html`**：OAuth callback 頁面，必須上傳

### CSS 架構

- **`variables.css`**：CSS 變數定義
- **`main.css`**：主要樣式
- **`animations.css`**：動畫效果
- **`page-transitions.css`**：頁面轉場效果

### JavaScript 架構

- **`config.js`**：應用程式配置
- **`security.js`**：安全相關函數（XSS 防護）
- **`common.js`**：共享函數（認證、權限檢查、Toast 通知等）
- **`auth.js`**：認證相關函數
- **`api.js`**：API 調用封裝
- **`mode1.js`**：IP 人設規劃模式邏輯
- **`mode3.js`**：一鍵生成模式邏輯
- **`userDB.js`**：創作者資料庫邏輯

## 🐛 常見問題

### Q: 登入後沒有自動更新狀態？

A: 檢查：
1. `auth/popup-callback.html` 是否已上傳
2. 瀏覽器控制台是否有錯誤訊息
3. `localStorage` 中是否有 `ipPlanningToken`

### Q: API 請求失敗？

A: 檢查：
1. `assets/js/config.js` 中的 `API_BASE` 是否正確
2. 後端服務是否正常運行
3. CORS 設定是否正確

### Q: 付款完成後沒有更新訂閱狀態？

A: 檢查：
1. ECPay Webhook 是否正常運作
2. 後端日誌是否有錯誤
3. 用戶是否已登入

### Q: 手機版顯示異常？

A: 檢查：
1. 是否使用響應式設計的 CSS
2. viewport meta 標籤是否正確設定
3. 是否有 CSS 衝突

### Q: Mode1 生成結果載入很慢？

A: 已優化：
1. 使用快取機制，30 秒內切換標籤頁幾乎即時
2. 使用 DocumentFragment 優化 DOM 渲染
3. 預載入數據，不阻塞 UI

## 🔒 安全注意事項

1. **API 端點**：確保使用 HTTPS
2. **Token 管理**：Token 存儲在 `localStorage`，注意 XSS 防護
3. **CORS**：後端需要正確設定 CORS
4. **環境變數**：不要在程式碼中硬編碼 API 端點
5. **XSS 防護**：使用 `security.js` 中的 `escapeHtml` 函數轉義用戶輸入
6. **CSRF 防護**：後端已整合 CSRF 防護機制

## 📝 重要更新記錄

### 2025-01-13 - Mode1 重大更新與知識庫優化

- ✅ **LLM 金鑰綁定限制**：Mode1 必須綁定自己的 LLM API 金鑰才能與 AI 對談
- ✅ **生成結果彈跳視窗修復**：修復按鈕無法使用問題，改用事件委派機制
- ✅ **程式碼顯示問題修復**：改進 Markdown 渲染，完全自然語言顯示（支援表格、粗體、換行等）
- ✅ **重新定位功能**：點擊「重新定位」快速按鈕，AI 會顯示「短影音內容策略矩陣」表格
- ✅ **「一週腳本」更名為「短影音腳本」**：統一命名，更符合功能描述
- ✅ **優化生成結果載入速度**：使用快取機制，30 秒內切換標籤頁幾乎即時
- ✅ **標題編輯功能**：用戶可以編輯生成結果的標題
- ✅ **刪除功能優化**：刪除後保持在當前標籤頁，不會跳轉到其他標籤

### 2025-11-17 - Mode1 功能優化

- ✅ 添加標題編輯功能
- ✅ 優化生成結果載入速度（快取機制）
- ✅ 修正手機版和電腦版滾動問題
- ✅ 修正手機版 ReelMind logo 標題置中
- ✅ 修正手機版生成結果按鈕比例
- ✅ 更新使用說明，對應最新功能

### 2025-11-13 - 實戰指南分離

- ✅ 將實戰指南分離為獨立頁面 `guide.html`
- ✅ 分為「基礎教學」和「進階教學」兩個分類
- ✅ 動態按鈕邏輯，根據用戶狀態調整行為

### 2025-11-11 - 訂閱付款流程優化

- ✅ 強制登入才能訂閱付款
- ✅ 登入成功後自動導向訂閱頁面
- ✅ 取消自動續費功能整合
- ✅ 訂閱狀態顯示優化

### 2025-10-29 - OAuth 登入流程優化

- ✅ 專用 OAuth Callback 頁面
- ✅ 三層備用登入機制
- ✅ 手機版自動跳轉
- ✅ Favicon 支援

## 📚 相關文件

- `Mode1_LLM功能報告.md` - Mode1 LLM 功能詳細報告
- `405錯誤排查指南.md` - 405 錯誤排查指南
- `CSS_EXTRACTION_GUIDE.md` - CSS 提取指南
- `doc/` - 設計文件
  - `AICoding_Prompt_IPAgent.md` - AI 編碼提示
  - `IP_ShortVideo_Agent_KnowledgeBase.md` - IP 短影音智能體知識庫
  - `頁面架構設計規劃.md` - 頁面架構設計規劃

## 📄 授權

2025 AIJob學院版權所有

---

**最後更新**：2025-01-13
