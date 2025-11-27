/**
 * ReelMind 主題切換系統
 * 支援深色/淺色雙模式切換
 */

(function() {
  'use strict';

  // 主題管理類
  class ThemeManager {
    constructor() {
      this.STORAGE_KEY = 'reelmind-theme';
      this.THEME_CLASS = 'theme-dark';
      this.init();
    }

    // 初始化主題
    init() {
      // 從 localStorage 讀取保存的主題偏好
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedTheme === 'dark') {
        this.setDarkMode();
      } else if (savedTheme === 'light') {
        this.setLightMode();
      } else {
        // 如果沒有保存的偏好，使用系統偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.setDarkMode();
        } else {
          this.setLightMode();
        }
      }

      // 監聽系統主題變化
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          // 只有在沒有用戶偏好時才跟隨系統
          if (!localStorage.getItem(this.STORAGE_KEY)) {
            if (e.matches) {
              this.setDarkMode();
            } else {
              this.setLightMode();
            }
          }
        });
      }
    }

    // 設置深色模式
    setDarkMode() {
      document.documentElement.classList.add(this.THEME_CLASS);
      document.body.classList.add(this.THEME_CLASS);
      localStorage.setItem(this.STORAGE_KEY, 'dark');
      this.updateToggleButton('dark');
    }

    // 設置淺色模式
    setLightMode() {
      document.documentElement.classList.remove(this.THEME_CLASS);
      document.body.classList.remove(this.THEME_CLASS);
      localStorage.setItem(this.STORAGE_KEY, 'light');
      this.updateToggleButton('light');
    }

    // 切換主題
    toggle() {
      if (document.documentElement.classList.contains(this.THEME_CLASS)) {
        this.setLightMode();
      } else {
        this.setDarkMode();
      }
    }

    // 更新切換按鈕圖標
    updateToggleButton(theme) {
      const toggleBtn = document.querySelector('.theme-toggle-btn');
      if (!toggleBtn) return;

      const icon = toggleBtn.querySelector('svg');
      if (!icon) return;

      if (theme === 'dark') {
        // 深色模式顯示太陽圖標（提示切換到淺色）
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        `;
        toggleBtn.setAttribute('aria-label', '切換到淺色模式');
        toggleBtn.setAttribute('title', '切換到淺色模式');
      } else {
        // 淺色模式顯示月亮圖標（提示切換到深色）
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        `;
        toggleBtn.setAttribute('aria-label', '切換到深色模式');
        toggleBtn.setAttribute('title', '切換到深色模式');
      }
    }

    // 獲取當前主題
    getCurrentTheme() {
      return document.documentElement.classList.contains(this.THEME_CLASS) ? 'dark' : 'light';
    }
  }

  // 創建全局實例
  window.themeManager = new ThemeManager();

  // 等待 DOM 載入完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
  } else {
    initThemeToggle();
  }

  // 初始化主題切換按鈕
  function initThemeToggle() {
    const toggleBtn = document.querySelector('.theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        window.themeManager.toggle();
      });
    }
  }
})();
