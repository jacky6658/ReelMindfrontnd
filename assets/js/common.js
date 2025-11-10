/**
 * ReelMind 共用 JavaScript 函數庫
 * 用於所有分離的頁面（mode1.html, mode2.html, mode3.html, userDB.html）
 * 
 * 包含：
 * - 認證檢查（登入狀態、訂閱狀態）
 * - OAuth 處理
 * - 授權連結處理
 * - 頁面權限檢查
 * - Toast 通知
 */

(function() {
  'use strict';

  // ===== 全域變數 =====
  let ipPlanningToken = null;
  let ipPlanningUser = null;
  const API_BASE_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';

  // ===== 初始化：從 localStorage 載入狀態 =====
  function initGlobalState() {
    const storedToken = localStorage.getItem('ipPlanningToken');
    const storedUserStr = localStorage.getItem('ipPlanningUser');
    
    if (storedToken) {
      ipPlanningToken = storedToken;
    }
    if (storedUserStr) {
      try {
        ipPlanningUser = JSON.parse(storedUserStr);
      } catch (e) {
        console.warn('無法解析用戶資料:', e);
        ipPlanningUser = null;
      }
    }
  }

  // ===== 認證相關函數 =====

  /**
   * 檢查是否已登入
   */
  function isLoggedIn() {
    return !!(ipPlanningToken && ipPlanningUser);
  }

  /**
   * 檢查是否已訂閱
   */
  function isSubscribed() {
    try {
      // 優先檢查 document.body.dataset.subscribed（從後端 API 獲取的狀態，最準確）
      const backendSubscribed = document.body.dataset.subscribed === 'true';
      if (backendSubscribed) {
        return true;
      }
      
      // 檢查 localStorage 中的 subscriptionStatus
      const subscriptionStatus = localStorage.getItem('subscriptionStatus');
      if (subscriptionStatus === 'active') {
        return true;
      }
      
      // 最後檢查 localStorage 中的用戶資料
      const userStr = localStorage.getItem('ipPlanningUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        const userSubscribed = !!(user && (user.is_subscribed === true || user.is_subscribed === 1 || user.is_subscribed === '1'));
        if (userSubscribed) {
          return true;
        }
      }
      
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * 檢查 token 是否過期
   */
  function isTokenExpired(token) {
    if (!token) return true;
    
    try {
      // JWT token 格式：header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      // 解碼 payload（base64url）
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // 檢查過期時間
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
      }
      
      return false;
    } catch (e) {
      console.error('檢查 token 過期時出錯:', e);
      return true; // 如果無法解析，視為過期
    }
  }

  /**
   * 自動登出（清除所有登入資訊）
   */
  function autoLogout(reason = '登入已過期，請重新登入') {
    console.log('自動登出:', reason);
    
    // 清除所有登入相關的 localStorage
    localStorage.removeItem('ipPlanningToken');
    localStorage.removeItem('ipPlanningRefreshToken');
    localStorage.removeItem('ipPlanningUser');
    localStorage.removeItem('ipPlanningTokenUpdated');
    localStorage.removeItem('subscriptionStatus');
    
    // 清除全局變數
    ipPlanningToken = null;
    ipPlanningUser = null;
    
    // 清除 CSRF Token 緩存
    if (window.Api && window.Api.clearCsrfToken) {
      window.Api.clearCsrfToken();
    }
    
    // 更新頁面狀態
    document.body.dataset.subscribed = 'false';
    
    // 觸發登出事件
    try {
      window.dispatchEvent(new CustomEvent('auth:logged-out', { detail: { reason } }));
    } catch (e) {
      console.warn('無法觸發登出事件:', e);
    }
    
    // 顯示提示（如果 showToast 可用）
    try {
      if (typeof showToast === 'function') {
        showToast('登入已過期，請重新登入', 3000);
      }
    } catch (e) {
      console.warn('無法顯示登出提示:', e);
    }
    
    // 重新載入頁面以更新 UI
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  /**
   * 檢查登入狀態（從後端 API 獲取最新狀態）
   */
  async function checkLoginStatus() {
    // 從 localStorage 獲取最新的 token 和用戶資訊
    const storedToken = localStorage.getItem('ipPlanningToken');
    const storedUserStr = localStorage.getItem('ipPlanningUser');
    
    // 更新全局變數
    if (storedToken) {
      ipPlanningToken = storedToken;
    }
    if (storedUserStr) {
      try {
        ipPlanningUser = JSON.parse(storedUserStr);
      } catch (e) {
        console.warn('無法解析用戶資料:', e);
        ipPlanningUser = null;
      }
    }

    // 檢查 token 是否過期
    if (ipPlanningToken) {
      if (isTokenExpired(ipPlanningToken)) {
        console.warn('Token 已過期，自動登出');
        autoLogout('登入已過期，請重新登入');
        return false;
      }
    }

    return isLoggedIn();
  }

  /**
   * 檢查訂閱狀態（從後端 API 獲取最新狀態）
   */
  async function checkSubscriptionStatus() {
    // 如果有登入資訊，從後端 API 獲取訂閱狀態
    if (ipPlanningToken && ipPlanningUser && ipPlanningUser.user_id) {
      try {
        let response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${ipPlanningToken}`
          }
        });
        
        // 如果收到 401，嘗試刷新 token 後重試
        if (response.status === 401) {
          // 嘗試刷新 token（如果 window.Api.refreshToken 存在）
          if (window.Api && window.Api.refreshToken) {
            try {
              await window.Api.refreshToken();
              // 重新獲取 token
              ipPlanningToken = localStorage.getItem('ipPlanningToken');
              // 重試
              response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                  'Authorization': `Bearer ${ipPlanningToken}`
                }
              });
            } catch (e) {
              console.warn('Token 刷新失敗:', e);
            }
          }
        }
        
        if (response.ok) {
          const userInfo = await response.json();
          
          // 更新訂閱狀態
          const isSubscribedValue = userInfo.is_subscribed === true || 
                                  userInfo.is_subscribed === 1 || 
                                  userInfo.is_subscribed === 'true' ||
                                  userInfo.is_subscribed === '1';
          
          if (isSubscribedValue) {
            document.body.dataset.subscribed = 'true';
            localStorage.setItem('subscriptionStatus', 'active');
          } else {
            document.body.dataset.subscribed = 'false';
            localStorage.setItem('subscriptionStatus', 'inactive');
          }
        } else {
          // API 失敗，使用本地儲存
          const localSubscriptionStatus = localStorage.getItem('subscriptionStatus');
          if (localSubscriptionStatus === 'active') {
            document.body.dataset.subscribed = 'true';
          } else {
            document.body.dataset.subscribed = 'false';
          }
        }
      } catch (error) {
        // 網路錯誤等異常，使用本地儲存
        const localSubscriptionStatus = localStorage.getItem('subscriptionStatus');
        if (localSubscriptionStatus === 'active') {
          document.body.dataset.subscribed = 'true';
        } else {
          document.body.dataset.subscribed = 'false';
        }
      }
    } else {
      // 未登入，從本地存儲檢查訂閱狀態
      const subscriptionStatus = localStorage.getItem('subscriptionStatus');
      if (subscriptionStatus === 'active') {
        document.body.dataset.subscribed = 'true';
      } else {
        document.body.dataset.subscribed = 'false';
      }
    }
  }

  /**
   * 處理授權連結驗證
   */
  async function handleActivationToken(token) {
    if (!token) return;
    
    const currentToken = localStorage.getItem('ipPlanningToken');
    
    if (!currentToken) {
      // 未登入，導向首頁登入頁（帶上 activation_token）
      window.location.href = `/?token=${token}`;
      return;
    }
    
    // 已登入，直接驗證授權
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/license/verify?token=${token}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        redirect: 'manual'
      });
      
      if (response.ok || response.status === 302) {
        // 驗證成功
        await checkSubscriptionStatus();
        showToast('✅ 訂閱啟用成功！', 5000);
        // 清除 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // 嘗試獲取詳細錯誤訊息
        let errorMessage = '啟用失敗，請稍後再試';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // 如果無法解析 JSON，使用預設錯誤訊息
        }
        showToast(errorMessage, 5000);
      }
    } catch (error) {
      console.error('啟用失敗:', error);
      showToast('⚠️ 啟用失敗，請稍後再試', 5000);
    }
  }

  /**
   * 檢查頁面權限（登入 + 訂閱）
   * 如果未登入，導向首頁
   * 如果未訂閱，導向訂閱頁
   */
  async function checkPagePermission() {
    // 先檢查登入狀態
    const loggedIn = await checkLoginStatus();
    
    if (!loggedIn) {
      // 未登入，導向首頁
      window.location.href = '/';
      return false;
    }
    
    // 檢查訂閱狀態
    await checkSubscriptionStatus();
    const subscribed = isSubscribed();
    
    if (!subscribed) {
      // 未訂閱，導向訂閱頁
      window.location.href = '/subscription.html';
      return false;
    }
    
    return true;
  }

  /**
   * 檢查並處理功能訪問（登入 + 訂閱）
   * 用於頁首按鈕和 mode-card 點擊
   * 返回：true = 可以訪問，false = 需要登入/訂閱
   */
  async function checkFeatureAccess() {
    // 先檢查登入狀態
    const loggedIn = await checkLoginStatus();
    
    if (!loggedIn) {
      // 未登入，觸發登入流程
      // 保存目標功能到 sessionStorage，登入成功後使用
      if (typeof goToLogin === 'function') {
        goToLogin();
      } else {
        // 如果 goToLogin 不存在，顯示提示
        alert('請先登入以使用此功能！');
      }
      return false;
    }
    
    // 已登入，檢查訂閱狀態
    await checkSubscriptionStatus();
    const subscribed = isSubscribed();
    
    if (!subscribed) {
      // 已登入但未訂閱，導向訂閱頁
      window.location.href = '/subscription.html';
      return false;
    }
    
    return true;
  }

  // ===== Toast 通知 =====

  /**
   * 顯示 Toast 通知
   */
  function showToast(message, duration = 3000) {
    // 創建或獲取 toast 元素
    let toastEl = document.getElementById('toast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'toast';
      toastEl.className = 'toast';
      toastEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: none;
        opacity: 0;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(toastEl);
    }
    
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    toastEl.style.opacity = '1';
    
    setTimeout(() => {
      toastEl.style.opacity = '0';
      setTimeout(() => {
        toastEl.style.display = 'none';
      }, 300);
    }, duration);
  }

  // ===== 頁面初始化 =====

  /**
   * 初始化頁面（每個功能頁面都需要調用）
   */
  async function initPage() {
    // 初始化全局狀態
    initGlobalState();
    
    // 處理授權連結（如果 URL 中有 token 參數）
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const activationToken = urlParams.get('token') || hashParams.get('token');
    
    if (activationToken) {
      // 處理授權連結
      await handleActivationToken(activationToken);
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // 處理 OAuth 回調（如果 URL 中有 token 參數）
    const oauthToken = urlParams.get('token');
    if (oauthToken && !activationToken) {
      const userId = urlParams.get('user_id');
      const email = urlParams.get('email');
      const name = urlParams.get('name');
      const picture = urlParams.get('picture');
      
      if (oauthToken && userId) {
        ipPlanningToken = oauthToken;
        ipPlanningUser = {
          user_id: userId,
          email: email || '',
          name: name || '',
          picture: picture || ''
        };
        localStorage.setItem('ipPlanningToken', ipPlanningToken);
        localStorage.setItem('ipPlanningUser', JSON.stringify(ipPlanningUser));
        
        // 清除 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 重新檢查狀態
        await checkLoginStatus();
        await checkSubscriptionStatus();
      }
    }
    
    // 檢查頁面權限
    const hasPermission = await checkPagePermission();
    
    if (!hasPermission) {
      // 沒有權限，已經導向到其他頁面，停止執行
      return;
    }
    
    // 有權限，觸發頁面載入完成事件
    window.dispatchEvent(new CustomEvent('page:ready'));
  }

  // ===== 導出到 window 對象 =====
  window.ReelMindCommon = {
    // 認證相關
    isLoggedIn,
    isSubscribed,
    checkLoginStatus,
    checkSubscriptionStatus,
    checkPagePermission,
    checkFeatureAccess,
    isTokenExpired,
    autoLogout,
    
    // 授權連結
    handleActivationToken,
    
    // Toast 通知
    showToast,
    
    // 頁面初始化
    initPage,
    
    // 獲取全局變數（用於調試）
    getToken: () => ipPlanningToken,
    getUser: () => ipPlanningUser
  };

  // ===== 自動初始化（當 DOM 載入完成時） =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    // DOM 已經載入完成，立即執行
    initPage();
  }

})();

