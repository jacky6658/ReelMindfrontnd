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

  // 導出到全局（如果需要）
  window.SubscriptionAnimations = {
    init: init,
    initSubscriptionAnimations: initSubscriptionAnimations,
    initCardInteractions: initCardInteractions
  };

})();

