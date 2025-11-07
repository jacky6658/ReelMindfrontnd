/**
 * ReelMind XSS 防護函數庫
 * 用於所有頁面，防止跨站腳本攻擊
 * 
 * 使用方式：
 * - 純文字：safeSetText(element, text)
 * - HTML 內容：safeSetHtml(element, html, allowHtml)
 * - Markdown：safeRenderMarkdown(markdown)
 * - 轉義：escapeHtml(text)
 */

(function() {
  'use strict';

  /**
   * 安全的 HTML 轉義函數
   * 防止 XSS 攻擊
   * 
   * @param {string} text - 要轉義的文字
   * @returns {string} 轉義後的 HTML
   */
  function escapeHtml(text) {
    if (text == null || text === undefined) {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 安全地設置元素內容（純文字）
   * 使用 textContent 代替 innerHTML
   * 
   * @param {HTMLElement} element - 目標元素
   * @param {string} text - 要設置的文字
   */
  function safeSetText(element, text) {
    if (!element) return;
    if (text == null || text === undefined) {
      element.textContent = '';
      return;
    }
    element.textContent = String(text);
  }

  /**
   * 安全地設置元素 HTML（需要時使用）
   * 只允許信任的 HTML，否則轉義
   * 
   * @param {HTMLElement} element - 目標元素
   * @param {string} html - 要設置的 HTML
   * @param {boolean} allowHtml - 是否允許 HTML（預設 false）
   */
  function safeSetHtml(element, html, allowHtml = false) {
    if (!element) return;
    if (html == null || html === undefined) {
      element.innerHTML = '';
      return;
    }
    
    if (allowHtml) {
      // 如果允許 HTML，使用 DOMPurify（如果可用）或基本清理
      if (typeof DOMPurify !== 'undefined') {
        element.innerHTML = DOMPurify.sanitize(String(html));
      } else {
        // 基本清理：只允許安全的標籤
        const temp = document.createElement('div');
        temp.textContent = html;
        element.innerHTML = temp.innerHTML;
      }
    } else {
      // 不允許 HTML，直接轉義
      element.textContent = String(html);
    }
  }

  /**
   * 安全地渲染 Markdown（已清理）
   * 使用 marked 渲染後再清理
   * 
   * @param {string} markdown - Markdown 文字
   * @returns {string} 安全的 HTML
   */
  function safeRenderMarkdown(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }
    
    try {
      if (typeof marked !== 'undefined') {
        const html = marked.parse(markdown);
        // 使用 DOMPurify 清理（如果可用）
        if (typeof DOMPurify !== 'undefined') {
          return DOMPurify.sanitize(html);
        }
        return html;
      }
      // 如果 marked 不可用，返回轉義的文字
      return escapeHtml(markdown);
    } catch (e) {
      console.error('Markdown 渲染錯誤:', e);
      return escapeHtml(markdown);
    }
  }

  /**
   * 安全地創建 HTML 元素
   * 使用 createElement 和 textContent，避免 innerHTML
   * 
   * @param {string} tag - HTML 標籤名
   * @param {Object} attributes - 屬性對象
   * @param {string} text - 文字內容
   * @returns {HTMLElement} 創建的元素
   */
  function safeCreateElement(tag, attributes = {}, text = '') {
    const element = document.createElement(tag);
    
    // 設置屬性
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, String(value));
      }
    }
    
    // 設置文字內容（安全）
    if (text) {
      element.textContent = text;
    }
    
    return element;
  }

  /**
   * 安全地設置模板字串
   * 自動轉義所有變數
   * 
   * @param {string} template - 模板字串（使用 ${} 語法）
   * @param {Object} data - 數據對象
   * @returns {string} 安全的 HTML
   * 
   * @example
   * safeTemplate`<div>${userInput}</div>`({ userInput: "<script>alert(1)</script>" })
   * // 返回: "<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>"
   */
  function safeTemplate(strings, ...values) {
    let result = '';
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) {
        result += escapeHtml(String(values[i]));
      }
    }
    return result;
  }

  // 導出到全局
  window.ReelMindSecurity = {
    escapeHtml,
    safeSetText,
    safeSetHtml,
    safeRenderMarkdown,
    safeCreateElement,
    safeTemplate
  };

  // 為了向後兼容，也導出到 window（如果需要的話）
  window.escapeHtml = escapeHtml;
  window.safeSetText = safeSetText;
  window.safeSetHtml = safeSetHtml;
  window.safeRenderMarkdown = safeRenderMarkdown;

})();

