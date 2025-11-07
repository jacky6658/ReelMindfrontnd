/**
 * 訂閱區塊動畫控制器
 * 使用 IntersectionObserver 來觸發動畫
 */

(function() {
  'use strict';

  /**
   * 初始化訂閱區塊動畫
   */
  function initSubscriptionAnimations() {
    const subscriptionSection = document.getElementById('subscription-cta');
    
    if (!subscriptionSection) {
      // 如果元素不存在，稍後再試（可能是因為視圖還沒顯示）
      setTimeout(initSubscriptionAnimations, 500);
      return;
    }

    // 檢查元素是否可見（不在 display: none 狀態）
    const isVisible = subscriptionSection.offsetParent !== null || 
                      subscriptionSection.style.display !== 'none';
    
    if (!isVisible) {
      // 如果元素不可見，使用 MutationObserver 監聽顯示狀態變化
      const checkVisibility = () => {
        const checkInterval = setInterval(() => {
          const section = document.getElementById('subscription-cta');
          if (section && (section.offsetParent !== null || section.style.display !== 'none')) {
            clearInterval(checkInterval);
            // 元素已顯示，延遲一點後初始化動畫
            setTimeout(() => {
              setupAnimationObserver(section);
            }, 100);
          }
        }, 200);
        
        // 10 秒後停止檢查（避免無限循環）
        setTimeout(() => clearInterval(checkInterval), 10000);
      };
      
      checkVisibility();
      return;
    }

    // 元素可見，直接設置動畫觀察器
    setupAnimationObserver(subscriptionSection);
  }

  /**
   * 設置動畫觀察器
   */
  function setupAnimationObserver(subscriptionSection) {
    // 如果已經有動畫類，就不需要再設置
    if (subscriptionSection.classList.contains('animate-in')) {
      return;
    }

    // 創建 IntersectionObserver 來監聽元素進入視窗
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 當元素進入視窗時，添加動畫類
          entry.target.classList.add('animate-in');
          
          // 觀察一次後就停止觀察（動畫只需要觸發一次）
          observer.unobserve(entry.target);
        }
      });
    }, {
      // 當元素 20% 進入視窗時觸發
      threshold: 0.2,
      // 提前 100px 開始觸發
      rootMargin: '100px'
    });

    // 開始觀察訂閱區塊
    observer.observe(subscriptionSection);

    // 如果元素已經在視窗內（例如頁面載入時就在視窗內），立即觸發動畫
    const rect = subscriptionSection.getBoundingClientRect();
    const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInViewport) {
      // 延遲一點觸發，確保頁面已經完全載入
      setTimeout(() => {
        subscriptionSection.classList.add('animate-in');
      }, 300);
    }
  }

  /**
   * 為卡片添加交互動畫
   */
  function initCardInteractions() {
    const cards = document.querySelectorAll('#subscription-cta .rm-pricing-cards > div');
    
    cards.forEach((card, index) => {
      // 添加點擊波紋效果
      card.addEventListener('click', function(e) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transform: scale(0);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
          width: 100px;
          height: 100px;
          left: ${e.offsetX - 50}px;
          top: ${e.offsetY - 50}px;
        `;
        
        card.style.position = 'relative';
        card.style.overflow = 'hidden';
        card.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });

      // 添加鼠標進入/離開效果
      card.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s ease';
      });
    });
  }

  /**
   * 添加波紋動畫到樣式表
   */
  function addRippleAnimation() {
    if (document.getElementById('ripple-animation-style')) {
      return; // 已經添加過了
    }

    const style = document.createElement('style');
    style.id = 'ripple-animation-style';
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 初始化所有動畫
   */
  function init() {
    addRippleAnimation();
    initSubscriptionAnimations();
    initCardInteractions();
  }

  // 當 DOM 載入完成時初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM 已經載入完成，立即執行
    init();
  }

  // 監聽視圖切換事件（當 homepage-unsubscribed 視圖顯示時重新初始化）
  // 使用 MutationObserver 監聽 homepage-unsubscribed 的 display 屬性變化
  const unsubscribedView = document.getElementById('homepage-unsubscribed');
  if (unsubscribedView) {
    const viewObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          const isVisible = target.style.display !== 'none' && target.offsetParent !== null;
          
          if (isVisible) {
            // 視圖已顯示，重新初始化動畫
            setTimeout(() => {
              initSubscriptionAnimations();
            }, 200);
          }
        }
      });
    });

    viewObserver.observe(unsubscribedView, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  // 也監聽全局的 updateHomepageView 函數調用（如果存在）
  if (typeof window.updateHomepageView === 'function') {
    const originalUpdateHomepageView = window.updateHomepageView;
    window.updateHomepageView = function() {
      originalUpdateHomepageView.apply(this, arguments);
      // 視圖更新後，重新初始化動畫
      setTimeout(() => {
        initSubscriptionAnimations();
      }, 300);
    };
  }

  // 導出到全局（如果需要）
  window.SubscriptionAnimations = {
    init: init,
    initSubscriptionAnimations: initSubscriptionAnimations,
    initCardInteractions: initCardInteractions
  };

})();

