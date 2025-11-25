# ReelMind Logo 圖片設定說明

## 📋 需要準備的圖片文件

請將您的 ReelMind Logo 圖片（結合相機鏡頭和電路板大腦的圓形標誌）準備以下尺寸，並上傳到 `assets/images/` 目錄：

### 1. Favicon 文件（瀏覽器標籤頁圖示）

- **favicon.ico** - 16x16, 32x32, 48x48 多尺寸 ICO 文件
- **favicon-16x16.png** - 16x16 像素 PNG
- **favicon-32x32.png** - 32x32 像素 PNG

### 2. Apple Touch Icon（iOS 設備）

- **apple-touch-icon.png** - 180x180 像素 PNG

### 3. Android Chrome Icons（Android 設備）

- **android-chrome-192x192.png** - 192x192 像素 PNG
- **android-chrome-512x512.png** - 512x512 像素 PNG

### 4. Open Graph 圖片（社交媒體分享）

- **reelmind-logo-og.jpg** - 1200x630 像素 JPG（用於 Facebook、LinkedIn 等分享）

### 5. Logo 圖片（結構化數據和一般使用）

- **reelmind-logo.png** - 建議 512x512 或更大尺寸的 PNG（用於 Google 搜尋結果顯示）

## 🎨 圖片規格建議

### Favicon 規格
- **格式**：PNG（透明背景）或 ICO
- **尺寸**：16x16, 32x32（必須）
- **背景**：建議透明或單色背景
- **設計**：簡化版本，確保在小尺寸下清晰可見

### Open Graph 圖片規格
- **格式**：JPG 或 PNG
- **尺寸**：1200x630 像素（必須）
- **檔案大小**：建議 < 1MB
- **內容**：可以包含 Logo + 文字標題

### Logo 圖片規格
- **格式**：PNG（透明背景）
- **尺寸**：至少 512x512 像素
- **用途**：Google 搜尋結果、結構化數據

## 📁 文件結構

```
ReelMindfrontnd-main/
└── assets/
    └── images/
        ├── favicon.ico
        ├── favicon-16x16.png
        ├── favicon-32x32.png
        ├── apple-touch-icon.png
        ├── android-chrome-192x192.png
        ├── android-chrome-512x512.png
        ├── reelmind-logo-og.jpg
        └── reelmind-logo.png
```

## ✅ 已完成的設定

所有 HTML 文件已經更新為使用新的 Logo 路徑：

### 主要頁面
- ✅ `index.html` - 已更新 favicon、og:image 和 logo
- ✅ `guide.html` - 已更新 favicon、og:image 和 logo
- ✅ `experience.html` - 已更新 favicon、og:image 和 logo
- ✅ `contact.html` - 已更新 favicon、og:image 和 logo
- ✅ `subscription.html` - 已更新 favicon

### 功能頁面
- ✅ `mode1.html` - 已更新 favicon
- ✅ `mode2.html` - 已更新 favicon
- ✅ `mode3.html` - 已更新 favicon
- ✅ `userDB.html` - 已更新 favicon
- ✅ `checkout.html` - 已更新 favicon
- ✅ `payment-result.html` - 已更新 favicon
- ✅ `404.html` - 已更新 favicon
- ✅ `auth/popup-callback.html` - 已更新 favicon

### 文章頁面（所有 6 篇文章）
- ✅ `guide/article-1-three-steps-to-generate-30-second-script.html` - 已更新 favicon、og:image 和 logo
- ✅ `guide/article-2-ai-account-positioning-14-day-plan.html` - 已更新 favicon、og:image 和 logo
- ✅ `guide/article-3-reels-shorts-tiktok-script-differences.html` - 已更新 favicon、og:image 和 logo
- ✅ `guide/article-4-script-structure-selection-guide.html` - 已更新 favicon、og:image 和 logo
- ✅ `guide/article-5-how-to-get-llm-api-key.html` - 已更新 favicon、og:image 和 logo
- ✅ `guide/article-6-what-is-life-curve.html` - 已更新 favicon、og:image 和 logo

### 更新的內容
1. **Favicon**：所有頁面已從 SVG emoji 改為使用 PNG favicon 文件
2. **Open Graph 圖片**：所有頁面已更新為 `reelmind-logo-og.jpg`
3. **Logo（結構化數據）**：所有頁面已更新為 `reelmind-logo.png`

## 🔧 圖片生成工具建議

如果您需要將原始圖片轉換為多種尺寸，可以使用：

1. **線上工具**：
   - [Favicon Generator](https://realfavicongenerator.net/)
   - [Favicon.io](https://favicon.io/)

2. **圖片編輯軟體**：
   - Photoshop
   - GIMP（免費）
   - Figma

3. **命令列工具**（如果已安裝 ImageMagick）：
   ```bash
   # 生成不同尺寸
   convert original-logo.png -resize 16x16 favicon-16x16.png
   convert original-logo.png -resize 32x32 favicon-32x32.png
   convert original-logo.png -resize 180x180 apple-touch-icon.png
   convert original-logo.png -resize 192x192 android-chrome-192x192.png
   convert original-logo.png -resize 512x512 android-chrome-512x512.png
   convert original-logo.png -resize 1200x630 reelmind-logo-og.jpg
   ```

## 📝 注意事項

1. **檔案命名**：請確保檔案名稱完全符合上述列表（大小寫敏感）
2. **路徑**：所有圖片必須放在 `assets/images/` 目錄
3. **測試**：上傳後請測試：
   - 瀏覽器標籤頁是否顯示正確的 favicon
   - 使用 [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 測試 og:image
   - 使用 [Twitter Card Validator](https://cards-dev.twitter.com/validator) 測試 Twitter Card
4. **Google 搜尋結果**：Logo 可能需要幾天時間才會在 Google 搜尋結果中更新

## 🚀 上傳後檢查

上傳所有圖片後，請確認以下 URL 可以正常訪問：

- `https://reelmind.aijob.com.tw/assets/images/favicon.ico`
- `https://reelmind.aijob.com.tw/assets/images/favicon-32x32.png`
- `https://reelmind.aijob.com.tw/assets/images/reelmind-logo.png`
- `https://reelmind.aijob.com.tw/assets/images/reelmind-logo-og.jpg`


