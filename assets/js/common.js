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
      
      // 記錄響應狀態以便調試
      console.log('授權驗證響應狀態:', response.status, response.statusText);
      
      if (response.ok || response.status === 302) {
        // 驗證成功
        // 等待一小段時間確保後端完成資料庫更新
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 重試檢查訂閱狀態（最多重試 3 次）
        let retryCount = 0;
        let subscriptionActive = false;
        
        while (retryCount < 3 && !subscriptionActive) {
          await checkSubscriptionStatus();
          // 檢查訂閱狀態
          const isSubscribed = document.body.dataset.subscribed === 'true' || 
                              localStorage.getItem('subscriptionStatus') === 'active';
          
          if (isSubscribed) {
            subscriptionActive = true;
            break;
          }
          
          // 如果還沒生效，等待後重試
          if (retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          retryCount++;
        }
        
        // 強制刷新用戶資訊（確保獲取最新的訂閱狀態）
        if (ipPlanningUser && ipPlanningUser.user_id) {
          try {
            const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${currentToken}`
              }
            });
            if (userResponse.ok) {
              const userInfo = await userResponse.json();
              // 更新本地用戶資訊
              if (userInfo.is_subscribed) {
                document.body.dataset.subscribed = 'true';
                localStorage.setItem('subscriptionStatus', 'active');
                // 更新 ipPlanningUser
                if (ipPlanningUser) {
                  ipPlanningUser.is_subscribed = userInfo.is_subscribed;
                  localStorage.setItem('ipPlanningUser', JSON.stringify(ipPlanningUser));
                }
              }
            }
          } catch (e) {
            console.warn('刷新用戶資訊失敗:', e);
          }
        }
        
        // 獲取方案類型（從後端響應或預設為 yearly）
        let planType = 'yearly';
        try {
          // 嘗試從後端獲取方案資訊
          const licenseResponse = await fetch(`${API_BASE_URL}/api/user/license/verify?token=${token}`, {
            headers: {
              'Authorization': `Bearer ${currentToken}`
            },
            redirect: 'manual'
          });
          if (licenseResponse.ok) {
            const licenseData = await licenseResponse.json();
            planType = licenseData.plan_type || planType;
          }
        } catch (e) {
          console.warn('無法獲取方案資訊，使用預設值');
        }
        
        const planName = planType === 'yearly' ? '年費' : '月費';
        const planDays = planType === 'yearly' ? '1年' : '1個月';
        showToast(`✅ 您已開通${planDays}授權！方案：${planName}`, 8000);
        // 清除 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // 嘗試獲取詳細錯誤訊息
        let errorMessage = '啟用失敗，請稍後再試';
        let isAlreadyActivated = false;
        try {
          const errorData = await response.json();
          
          // 檢查是否為「已經啟用」的成功訊息（同一個帳戶）
          if (errorData.status === 'already_activated' && errorData.message) {
            // 更新本地狀態
            document.body.dataset.subscribed = 'true';
            localStorage.setItem('subscriptionStatus', 'active');
            if (ipPlanningUser) {
              ipPlanningUser.is_subscribed = true;
              localStorage.setItem('ipPlanningUser', JSON.stringify(ipPlanningUser));
            }
            // 顯示友好訊息
            const activatedDate = errorData.activated_at ? 
              new Date(errorData.activated_at).toLocaleString('zh-TW') : '';
            const message = activatedDate ? 
              `✅ ${errorData.message}（啟用時間：${activatedDate}）` : 
              `✅ ${errorData.message}`;
            showToast(message, 5000);
            return; // 提前返回，不顯示錯誤訊息
          }
          
          errorMessage = errorData.error || errorData.message || errorMessage;
          
          // 如果有詳細資訊，顯示給用戶
          if (errorData.activated_at) {
            isAlreadyActivated = true;
            const activatedDate = new Date(errorData.activated_at).toLocaleString('zh-TW');
            errorMessage = `此授權連結已使用（${activatedDate}）`;
            
            // 如果連結已使用，檢查用戶當前的訂閱狀態
            // 如果用戶已經有訂閱，這可能是成功的（用戶之前已經啟用過）
            try {
              const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                  'Authorization': `Bearer ${currentToken}`
                }
              });
              if (userResponse.ok) {
                const userInfo = await userResponse.json();
                if (userInfo.is_subscribed) {
                  // 用戶已經有訂閱，這表示之前已經成功啟用過
                  // 更新本地狀態
                  document.body.dataset.subscribed = 'true';
                  localStorage.setItem('subscriptionStatus', 'active');
                  if (ipPlanningUser) {
                    ipPlanningUser.is_subscribed = userInfo.is_subscribed;
                    localStorage.setItem('ipPlanningUser', JSON.stringify(ipPlanningUser));
                  }
                  // 顯示成功訊息而不是錯誤
                  showToast(`✅ 您已擁有授權！此連結已於 ${activatedDate} 啟用`, 5000);
                  return; // 提前返回，不顯示錯誤訊息
                }
              }
            } catch (e) {
              console.warn('檢查訂閱狀態失敗:', e);
              // 如果檢查失敗，繼續顯示錯誤訊息
            }
          } else if (errorData.expired_at) {
            const expiredDate = new Date(errorData.expired_at).toLocaleString('zh-TW');
            errorMessage = `此授權連結已過期（${expiredDate}）`;
          }
        } catch (e) {
          // 如果無法解析 JSON，根據狀態碼顯示不同訊息
          if (response.status === 500) {
            errorMessage = '伺服器錯誤，請稍後再試或聯繫客服';
          } else if (response.status === 404) {
            errorMessage = '授權連結無效或不存在';
          } else if (response.status === 400) {
            errorMessage = '授權連結格式錯誤';
          } else {
            errorMessage = `啟用失敗（錯誤代碼：${response.status}）`;
          }
        }
        // 只有在確認用戶沒有訂閱時才顯示錯誤訊息
        if (!isAlreadyActivated || !document.body.dataset.subscribed) {
          showToast(`❌ ${errorMessage}`, 5000);
        }
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
   * @param {string} featureType - 功能類型：'userDB' 允許未訂閱用戶訪問（至少可查看個人資訊和登出），其他功能需要訂閱
   * 返回：true = 可以訪問，false = 需要登入/訂閱
   */
  async function checkFeatureAccess(featureType = null) {
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
    
    // 創作者資料庫允許未訂閱用戶訪問（至少可查看個人資訊和登出）
    if (featureType === 'userDB') {
      return true; // 已登入即可訪問創作者資料庫
    }
    
    if (!subscribed) {
      // 已登入但未訂閱，導向訂閱頁
      window.location.href = '/subscription.html';
      return false;
    }
    
    return true;
  }

  // ===== 性能優化工具 =====

  /**
   * 防抖函數
   * @param {Function} func - 要防抖的函數
   * @param {number} wait - 等待時間（毫秒）
   * @returns {Function} 防抖後的函數
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 節流函數
   * @param {Function} func - 要節流的函數
   * @param {number} limit - 時間限制（毫秒）
   * @returns {Function} 節流後的函數
   */
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ===== 載入狀態管理 =====

  /**
   * 統一的載入狀態管理
   * 防止多個載入動畫同時顯示
   */
  let loadingStateCount = 0;
  let globalLoadingElement = null;

  /**
   * HTML 轉義函數（用於載入訊息）
   */
  function escapeHtml(text) {
    if (text == null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * 顯示全局載入動畫
   */
  function showGlobalLoading(message = '載入中...') {
    loadingStateCount++;
    
    if (!globalLoadingElement) {
      globalLoadingElement = document.createElement('div');
      globalLoadingElement.id = 'global-loading';
      globalLoadingElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        backdrop-filter: blur(4px);
      `;
      globalLoadingElement.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
          <div style="color: #1f2937; font-size: 16px; font-weight: 500;">${escapeHtml(message)}</div>
        </div>
      `;
      // 添加動畫樣式（如果還沒有）
      if (!document.getElementById('loading-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'loading-spinner-style';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      document.body.appendChild(globalLoadingElement);
    } else {
      // 更新訊息
      const messageEl = globalLoadingElement.querySelector('div[style*="color: #1f2937"]');
      if (messageEl) {
        messageEl.textContent = message;
      }
    }
  }

  /**
   * 隱藏全局載入動畫
   */
  function hideGlobalLoading() {
    loadingStateCount = Math.max(0, loadingStateCount - 1);
    
    if (loadingStateCount === 0 && globalLoadingElement) {
      globalLoadingElement.remove();
      globalLoadingElement = null;
    }
  }

  // ===== Toast 通知 =====

  /**
   * 顯示 Toast 通知
   * 支援多行訊息（使用 \n 分隔）
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
        z-index: 99999;
        display: none;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: auto;
      `;
      document.body.appendChild(toastEl);
    }
    
    // 支援多行訊息（使用 \n 分隔）
    if (message.includes('\n')) {
      toastEl.innerHTML = message.split('\n').map(line => {
        const div = document.createElement('div');
        div.textContent = line;
        return div.outerHTML;
      }).join('');
    } else {
      toastEl.textContent = message;
    }
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
    
    // 檢查頁面權限（首頁 index.html 不需要檢查，允許未登入用戶訪問）
    const isHomePage = window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/index.html') ||
                       window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
      // 非首頁才需要檢查權限
      const hasPermission = await checkPagePermission();
      
      if (!hasPermission) {
        // 沒有權限，已經導向到其他頁面，停止執行
        return;
      }
    } else {
      // 首頁：只檢查登入和訂閱狀態（不強制要求），用於更新 UI
      await checkLoginStatus();
      await checkSubscriptionStatus();
    }
    
    // 觸發頁面載入完成事件
    window.dispatchEvent(new CustomEvent('page:ready'));
  }

  /**
   * 跳轉到登入頁面（Google OAuth）
   */
  async function goToLogin() {
    try {
      // 獲取當前頁面的 origin（用於 OAuth callback）
      const fbParam = encodeURIComponent(window.location.origin);
      
      // 從後端取得 Google 認證 URL
      let authUrl = null;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/google?fb=${fbParam}`);
        const data = await response.json();
        authUrl = data && data.auth_url;
      } catch (corsErr) {
        console.warn('Fetch auth_url failed (likely CORS). Fallback to direct navigate.', corsErr);
        // 如果 fetch 失敗（可能是 CORS），直接使用後端 URL
        authUrl = `${API_BASE_URL}/api/auth/google?fb=${fbParam}`;
      }
      
      if (authUrl) {
        // 跳轉到 Google OAuth 頁面
        window.location.href = authUrl;
      } else {
        // 如果無法獲取 auth_url，跳轉到首頁讓用戶登入
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.error('登入錯誤:', error);
      // 發生錯誤時，跳轉到首頁
      window.location.href = 'index.html';
    }
  }

  /**
   * 更新用戶資訊顯示（統一函數）
   */
  function updateUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const authButtons = document.getElementById('authButtons');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userDBTab = document.getElementById('userDBTab');
    const userDBLink = document.getElementById('userDBLink');  // mode3 右側的創作者資料庫連結
    const userDBMobileTab = document.getElementById('userDBMobileTab');
    
    if (ipPlanningUser && ipPlanningToken) {
      if (userInfo) {
        userInfo.style.display = 'flex';
        if (userAvatar && ipPlanningUser.picture) {
          userAvatar.src = ipPlanningUser.picture;
        }
        if (userName) {
          userName.textContent = ipPlanningUser.name || ipPlanningUser.email || '用戶';
        }
      }
      if (authButtons) {
        authButtons.style.display = 'none';
      }
      if (userDBTab) {
        userDBTab.style.display = 'block';
      }
      if (userDBLink) {
        userDBLink.style.display = 'block';
      }
      if (userDBMobileTab) {
        userDBMobileTab.style.display = 'block';
      }
    } else {
      if (userInfo) {
        userInfo.style.display = 'none';
      }
      if (authButtons) {
        authButtons.style.display = 'flex';
      }
      if (userDBTab) {
        userDBTab.style.display = 'none';
      }
      if (userDBLink) {
        userDBLink.style.display = 'none';
      }
      if (userDBMobileTab) {
        userDBMobileTab.style.display = 'none';
      }
    }
  }

  /**
   * 手機版抽屜切換（統一函數）
   */
  function toggleMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    
    if (drawer && overlay) {
      const isOpen = drawer.classList.contains('open');
      
      if (isOpen) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    }
  }

  /**
   * 打開手機版抽屜（統一函數）
   */
  function openMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    
    if (drawer && overlay) {
      drawer.classList.add('open');
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * 關閉手機版抽屜（統一函數）
   */
  function closeMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    
    if (drawer && overlay) {
      drawer.classList.remove('open');
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
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
    goToLogin,
    
    // 授權連結
    handleActivationToken,
    
    // Toast 通知
    showToast,
    
    // 載入狀態管理
    showGlobalLoading,
    hideGlobalLoading,
    
    // 性能優化工具
    debounce,
    throttle,
    
    // 頁面初始化
    initPage,
    
    // UI 函數（統一導出）
    updateUserInfo,
    toggleMobileDrawer,
    openMobileDrawer,
    closeMobileDrawer,
    
    // 獲取全局變數（用於調試）
    getToken: () => ipPlanningToken,
    getUser: () => ipPlanningUser
  };

  // 為了向後兼容，也直接導出到 window（供 HTML 中的 onclick 使用）
  window.goToLogin = goToLogin;
  window.updateUserInfo = updateUserInfo;
  window.toggleMobileDrawer = toggleMobileDrawer;
  window.openMobileDrawer = openMobileDrawer;
  window.closeMobileDrawer = closeMobileDrawer;

  // ===== 自動初始化（當 DOM 載入完成時） =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    // DOM 已經載入完成，立即執行
    initPage();
  }

})();

