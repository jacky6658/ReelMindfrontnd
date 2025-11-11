# ReelMind 前端應用

> AI 短影音智能體前端 - 原生 HTML/CSS/JavaScript

## 📋 專案簡介

ReelMind 前端提供完整的 AI 短影音創作介面，包括：
- 🎯 一鍵生成模式（帳號定位、選題、腳本）
- 💬 AI 顧問對話模式
- 🎭 IP 人設規劃模式
- 👤 創作者資料庫（個人資料、腳本管理、訂閱管理）
- 💳 訂閱付款流程

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
├── mode1.html                   # 一鍵生成模式（獨立頁面）
├── mode2.html                   # AI 顧問模式（獨立頁面）
├── mode3.html                   # IP 人設規劃模式（獨立頁面）
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
│       ├── userDB.js             # 創作者資料庫
│       └── ...
├── Dockerfile                    # Docker 配置
├── CNAME                         # GitHub Pages 自訂網域
└── README.md                     # 本文件
```

## 🎯 功能說明

### 核心功能

1. **一鍵生成模式**
   - 帳號定位生成
   - 選題推薦
   - 短影音腳本生成
   - 階段性驗證機制

2. **AI 顧問對話模式**
   - ChatGPT 風格聊天介面
   - 長期記憶系統整合
   - 會話管理功能
   - 抽屜式說明欄位

3. **IP 人設規劃模式**
   - 深度對話建立個人品牌檔案
   - 14 天短影音規劃
   - 今日 3 支腳本生成
   - 長期記憶整合

4. **創作者資料庫**
   - 個人資料管理
   - 我的腳本管理
   - 帳號定位記錄
   - 選題記錄
   - 訂閱狀態管理
   - 取消自動續費功能

5. **訂閱付款**
   - 強制登入才能訂閱
   - ECPay 金流整合
   - 訂閱狀態顯示
   - 自動續費管理

### 技術特色

- **單頁應用（SPA）**：所有功能整合在 `index.html`
- **響應式設計**：完美支援桌面和行動裝置
- **原生 JavaScript**：無需框架，輕量高效
- **Server-Sent Events (SSE)**：即時 AI 回應串流
- **Google OAuth**：安全的用戶認證
- **LocalStorage**：本地資料暫存

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

### 訂閱與付款 API

- `POST /api/payment/checkout` - 建立訂單
- `GET /api/user/subscription` - 獲取訂閱狀態
- `PUT /api/user/subscription/auto-renew` - 更新自動續費狀態

### 用戶資料 API

- `GET /api/user/conversations/{user_id}` - 獲取對話記錄
- `GET /api/user/generations/{user_id}` - 獲取生成記錄
- `GET /api/user/scripts/{user_id}` - 獲取腳本記錄
- `GET /api/user/memory/{user_id}` - 獲取用戶記憶

完整 API 文檔請參考後端 `README.md`。

## 📝 重要更新記錄

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

詳細記錄請參考 `README.md` 中的更新日誌區段。

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

## 🔒 安全注意事項

1. **API 端點**：確保使用 HTTPS
2. **Token 管理**：Token 存儲在 `localStorage`，注意 XSS 防護
3. **CORS**：後端需要正確設定 CORS
4. **環境變數**：不要在程式碼中硬編碼 API 端點

## 📚 相關文件

- `完整功能指南.md` - 完整功能說明
- `ECPay固定連結限制說明.md` - ECPay 整合說明
- `doc/` - 設計文件

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
- **`assets/js/config.js`**：API 端點配置
- **`assets/js/common.js`**：共享函數，多個頁面共用
- **`auth/popup-callback.html`**：OAuth callback 頁面，必須上傳

## 📄 授權

2025 AIJob學院版權所有

---

**最後更新**：2025-11-11
