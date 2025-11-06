# CSS 分離與動畫增強指南

## 📁 新的文件結構

```
assets/css/
├── variables.css      # CSS 變數（已完成）
├── animations.css     # 動畫效果庫（已完成）
├── main.css          # 創作者資料庫樣式（已存在）
└── styles.css        # 主要樣式（需要從 index.html 提取）
```

## ✅ 已完成的工作

1. ✅ 創建了 `variables.css` - 包含所有 CSS 變數
2. ✅ 創建了 `animations.css` - 包含豐富的動畫效果庫
3. ✅ 更新了 `index.html` 引用新的 CSS 文件
4. ✅ 添加了頁面進入動畫類

## 🔄 下一步：提取 CSS

### 方法 1：手動提取（推薦）

1. 打開 `index.html`
2. 找到 `<style>` 標籤（約第 103 行）
3. 複製所有 CSS 內容（到 `</style>` 標籤前，約第 10077 行）
4. 創建 `assets/css/styles.css`
5. 將複製的內容貼上到 `styles.css`
6. 從 `index.html` 中刪除 `<style>` 標籤及其內容
7. 在 `index.html` 的 `<head>` 中添加：
   ```html
   <link rel="stylesheet" href="/assets/css/styles.css" />
   ```

### 方法 2：使用工具提取

可以使用瀏覽器開發者工具或文本編輯器的查找替換功能。

## 🎨 動畫使用指南

### 基本動畫類

```html
<!-- 淡入 -->
<div class="animate-fade-in">內容</div>

<!-- 淡入向上 -->
<div class="animate-fade-in-up">內容</div>

<!-- 縮放進入 -->
<div class="animate-scale-in">內容</div>

<!-- 彈跳進入 -->
<div class="animate-bounce-in">內容</div>
```

### 持續動畫

```html
<!-- 浮動效果 -->
<div class="animate-float">內容</div>

<!-- 脈衝效果 -->
<div class="animate-pulse">內容</div>

<!-- 發光效果 -->
<div class="animate-glow">內容</div>
```

### 延遲動畫

```html
<div class="animate-fade-in-up animate-delay-200">
  延遲 0.2 秒後淡入向上
</div>
```

### 懸停效果

```html
<!-- 懸停提升 -->
<div class="hover-lift">懸停時會向上移動</div>

<!-- 懸停發光 -->
<div class="hover-glow">懸停時會發光</div>

<!-- 懸停縮放 -->
<div class="hover-scale">懸停時會放大</div>
```

### 卡片階梯動畫

```html
<div class="mode-cards">
  <div class="mode-card card-enter">卡片 1</div>
  <div class="mode-card card-enter">卡片 2</div>
  <div class="mode-card card-enter">卡片 3</div>
</div>
```

### 消息動畫

```html
<div class="message ai message-enter">AI 消息</div>
<div class="message user message-enter">用戶消息</div>
```

## 🎯 建議的動畫應用位置

1. **頁面切換**：使用 `page-enter` 類
2. **卡片載入**：使用 `card-enter` 類
3. **按鈕點擊**：使用 `button-click` 類
4. **消息顯示**：使用 `message-enter` 類
5. **表單輸入**：使用 `animate-fade-in-up`
6. **載入狀態**：使用 `loader-spin` 或 `loader-dots`

## 📝 注意事項

1. 提取 CSS 後，確保所有樣式仍然正常運作
2. 測試深色模式是否正常
3. 檢查響應式設計是否受影響
4. 確保動畫不會影響性能（使用 `prefers-reduced-motion`）

## 🚀 性能優化

動畫文件已包含 `prefers-reduced-motion` 媒體查詢，會自動為偏好減少動畫的用戶禁用動畫。

