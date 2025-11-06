#!/usr/bin/env node

/**
 * CSS 提取腳本
 * 從 index.html 中提取 <style> 標籤內容到外部 CSS 文件
 * 
 * 使用方法：
 * node extract-css.js
 */

const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'index.html');
const stylesCssPath = path.join(__dirname, 'assets', 'css', 'styles.css');

try {
  // 讀取 index.html
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // 提取 <style> 標籤內容
  const styleStart = htmlContent.indexOf('<style>');
  const styleEnd = htmlContent.indexOf('</style>');
  
  if (styleStart === -1 || styleEnd === -1) {
    console.error('找不到 <style> 標籤');
    process.exit(1);
  }
  
  const cssContent = htmlContent.substring(styleStart + 7, styleEnd).trim();
  
  // 確保目錄存在
  const cssDir = path.dirname(stylesCssPath);
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }
  
  // 寫入 styles.css
  fs.writeFileSync(stylesCssPath, cssContent, 'utf8');
  console.log('✅ CSS 已提取到:', stylesCssPath);
  console.log('📊 CSS 大小:', (cssContent.length / 1024).toFixed(2), 'KB');
  
  // 從 index.html 中移除 <style> 標籤
  const newHtmlContent = htmlContent.substring(0, styleStart) + 
                        htmlContent.substring(styleEnd + 8);
  
  // 備份原文件
  const backupPath = indexHtmlPath + '.backup';
  fs.writeFileSync(backupPath, htmlContent, 'utf8');
  console.log('💾 已創建備份:', backupPath);
  
  // 寫入新的 index.html
  fs.writeFileSync(indexHtmlPath, newHtmlContent, 'utf8');
  console.log('✅ index.html 已更新（已移除 <style> 標籤）');
  console.log('');
  console.log('⚠️  請檢查 index.html 的 <head> 中是否已包含：');
  console.log('   <link rel="stylesheet" href="/assets/css/styles.css" />');
  
} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}


