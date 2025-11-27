(function(){
  const CFG = window.APP_CONFIG || {};
  // 確保 BASE 有正確的 fallback，優先使用 window.APP_CONFIG.API_BASE，否則使用 window.API_BASE_URL，最後使用新網域
  const BASE = CFG.API_BASE || window.API_BASE_URL || 'https://api.aijob.com.tw';
  const REFRESH_KEY = CFG.REFRESH_TOKEN_KEY || 'ipPlanningRefreshToken';
  const originalFetch = window.fetch.bind(window);
  
  // 調試：確認 BASE 設定（已隱藏主控台 log）
  // if (typeof console !== 'undefined' && console.log) {
  //   console.log('[api.js] BASE:', BASE);
  //   console.log('[api.js] window.APP_CONFIG:', window.APP_CONFIG);
  //   console.log('[api.js] window.API_BASE_URL:', window.API_BASE_URL);
  // }

  // Cookie 讀取函數
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // CSRF Token 管理
  let csrfTokenCache = null;
  
  async function getCsrfToken(){
    // 優先從 Cookie 中讀取 CSRF Token（非 HttpOnly，前端可以讀取）
    const csrfTokenFromCookie = getCookie('csrf_token');
    if (csrfTokenFromCookie) {
      csrfTokenCache = csrfTokenFromCookie;
      return csrfTokenCache;
    }
    
    // 如果 Cookie 中沒有，且有緩存的 Token，直接返回
    if (csrfTokenCache) return csrfTokenCache;
    
    // 如果 Cookie 中沒有，嘗試從 API 獲取（向後兼容，但現在應該不會用到）
    try {
      // 檢查是否有 access_token（可能在 HttpOnly Cookie 中，無法讀取，但可以通過 API 調用獲取）
      const res = await originalFetch(`${BASE}/api/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include' // 重要：包含 Cookie，這樣後端可以從 HttpOnly Cookie 中讀取 access_token
      });
      
      if (res.ok) {
        const data = await res.json();
        csrfTokenCache = data.csrf_token;
        // 更新後的 CSRF Token 會自動設置到 Cookie 中
        return csrfTokenCache;
      }
    } catch (e) {
      console.warn('獲取 CSRF Token 失敗:', e);
    }
    return null;
  }
  
  function clearCsrfToken(){
    csrfTokenCache = null;
  }
  
  function authHeaders(extra){
    const tk = window.Auth && window.Auth.getToken ? window.Auth.getToken() : '';
    const headers = new Headers({ ...(extra || {}) });
    if (tk && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${tk}`);
    return headers;
  }

  async function refreshTokenIfNeeded(){
    try{
      // 現在使用 HttpOnly Cookie，不需要在 Header 中傳遞 token
      // 後端會從 Cookie 中讀取 access_token
      const res = await originalFetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include' // 重要：包含 Cookie
      });
      if(!res.ok) return false;
      const data = await res.json();
      const newToken = data && data.access_token;
      if(!newToken) return false;
      if(window.Auth && window.Auth.setToken) window.Auth.setToken(newToken);
      if(data.refresh_token && window.Auth && window.Auth.setRefreshToken) window.Auth.setRefreshToken(data.refresh_token);
      return true;
    } catch(_){
      return false;
    }
  }

  // 防止重複觸發 autoLogout 的標記
  let isLoggingOut = false;
  
  // 全域 fetch 攔截：自動帶 token、401 → refresh → 重試一次
  window.fetch = async function(input, init){
    // 如果正在登出，直接返回 401 響應，避免繼續重試
    if (isLoggingOut) {
      return new Response(JSON.stringify({detail: "Not authenticated"}), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const initObj = init || {};
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const isBackendApi = (typeof url === 'string') && (url.startsWith(`${BASE}/api`) || url.startsWith('/api/'));
    const isRefreshCall = (typeof url === 'string') && url.includes('/api/auth/refresh');
    const isOAuthStart = (typeof url === 'string') && url.includes('/api/auth/google');

    // 對 OAuth 起始端點：完全不注入任何自訂標頭，避免預檢與 CORS 問題
    if (isOAuthStart) {
      return originalFetch(input, initObj);
    }

    const mergedHeaders = new Headers(initObj.headers || (typeof input !== 'string' && input && input.headers) || {});
    if(isBackendApi && !isRefreshCall){
      // 現在使用 HttpOnly Cookie，不需要在 Header 中設置 Authorization
      // 但為了向後兼容，如果提供了 Authorization header，保留它
      // 如果沒有提供，不設置 Authorization（讓後端從 Cookie 中讀取）
      const tk = window.Auth && window.Auth.getToken ? window.Auth.getToken() : '';
      if (tk) {
        // 如果前端還有 token（向後兼容），設置 Authorization header
        mergedHeaders.set('Authorization', `Bearer ${tk}`);
      }
      // 如果沒有 token，不設置 Authorization，後端會從 HttpOnly Cookie 中讀取
      
      // 僅當呼叫者真的提供 body 時才加 Content-Type，避免 GET 觸發預檢
      const hasBody = Object.prototype.hasOwnProperty.call(initObj, 'body');
      if(hasBody && !mergedHeaders.has('Content-Type')) mergedHeaders.set('Content-Type', 'application/json');
      
      // 為 POST/PUT/DELETE/PATCH 請求添加 CSRF Token
      const method = (initObj.method || (typeof input !== 'string' && input && input.method) || 'GET').toUpperCase();
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // 檢查是否已提供 CSRF Token（允許手動覆寫）
        if (!mergedHeaders.has('X-CSRF-Token')) {
          const csrfToken = await getCsrfToken();
          if (csrfToken) {
            mergedHeaders.set('X-CSRF-Token', csrfToken);
          }
        }
      }
      
      // 重要：確保所有請求都包含 Cookie（credentials: 'include'）
      // 這樣後端才能從 HttpOnly Cookie 中讀取 access_token
      if (!initObj.credentials) {
        initObj.credentials = 'include';
      }
    }

    // 確保包含 Cookie（credentials: 'include'）
    const fetchOptions = { ...initObj, headers: mergedHeaders };
    if (isBackendApi && !fetchOptions.credentials) {
      fetchOptions.credentials = 'include';
    }
    
    const first = await originalFetch(input, fetchOptions);
    
    // 處理 403 錯誤（可能是 CSRF Token 驗證失敗）
    if(isBackendApi && first.status === 403 && !isRefreshCall){
      const responseText = await first.clone().text();
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error && (errorData.error.includes('CSRF') || errorData.error.includes('csrf'))) {
          // CSRF Token 驗證失敗，清除緩存並重新獲取
          clearCsrfToken();
          const csrfToken = await getCsrfToken();
          if (csrfToken) {
        const retryHeaders = new Headers(mergedHeaders);
        retryHeaders.set('X-CSRF-Token', csrfToken);
        const retryOptions = { ...initObj, headers: retryHeaders };
        if (isBackendApi && !retryOptions.credentials) {
          retryOptions.credentials = 'include';
        }
        return originalFetch(input, retryOptions);
          }
        }
      } catch (e) {
        // 無法解析錯誤信息，繼續返回原響應
      }
    }
    
    // 處理 401 錯誤（但排除 /api/auth/me 和 /api/auth/refresh，這些端點本身就是用來檢查登入狀態的）
    const isAuthMeCall = (typeof url === 'string') && url.includes('/api/auth/me');
    if(isBackendApi && first.status === 401 && !isRefreshCall && !isAuthMeCall){
      // 只有在非登入檢查的 API 請求收到 401 時，才嘗試刷新 token
      const ok = await refreshTokenIfNeeded();
      if(ok){
        // Token 刷新成功，清除 CSRF Token 緩存（需要重新獲取）
        clearCsrfToken();
        const retryHeaders = new Headers(initObj.headers || (typeof input !== 'string' && input && input.headers) || {});
        const tk2 = window.Auth && window.Auth.getToken ? window.Auth.getToken() : '';
        if (tk2) {
          retryHeaders.set('Authorization', `Bearer ${tk2}`);
        } else {
          retryHeaders.delete('Authorization');
        }
        if(!retryHeaders.has('Content-Type') && (!initObj || !initObj.body || typeof initObj.body === 'object')){
          retryHeaders.set('Content-Type', 'application/json');
        }
        
        // 為 POST/PUT/DELETE/PATCH 請求添加新的 CSRF Token
        const method = (initObj.method || (typeof input !== 'string' && input && input.method) || 'GET').toUpperCase();
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && tk2) {
          const csrfToken = await getCsrfToken();
          if (csrfToken) {
            retryHeaders.set('X-CSRF-Token', csrfToken);
          }
        }
        
        const retryOptions2 = { ...initObj, headers: retryHeaders };
        if (isBackendApi && !retryOptions2.credentials) {
          retryOptions2.credentials = 'include';
        }
        return originalFetch(input, retryOptions2);
      } else {
        // Token 刷新失敗，可能是 token 已過期
        // 完全移除 autoLogout 的觸發，避免無限刷新
        // 設置標記，防止後續請求繼續重試
        if (!isLoggingOut) {
          isLoggingOut = true;
          console.warn('[AUTH] Token 刷新失敗，但不觸發任何操作（避免無限刷新）');
          // 不觸發 autoLogout，不顯示提示，不執行任何操作
          // 只設置標記，讓後續請求直接返回 401
        }
        // 直接返回 401 響應，不再重試
        return new Response(JSON.stringify({detail: "Not authenticated"}), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 對於 /api/auth/me 的 401，不觸發 refresh，直接返回（這是正常的，表示用戶未登入）
    if(isBackendApi && first.status === 401 && isAuthMeCall){
      // 如果 /api/auth/me 返回 401，表示用戶未登入，這是正常情況
      // 不需要觸發 refresh 或 autoLogout，直接返回 401 響應
      return first;
    }
    return first;
  };

  // ===== 對外最小增補：依照 401/403 修復指南提供 getMe 與 refreshToken，不影響既有呼叫點 =====
  try {
    const API = {};
    API.getMe = async function(){
      const res = await originalFetch(`${BASE}/api/auth/me`, {
        method: 'GET',
        headers: authHeaders(),
        credentials: 'include' // 包含 Cookie
      });
      if(!res.ok) throw new Error(`ME_${res.status}`);
      return res.json();
    };
    API.refreshToken = async function(){
      // 現在使用 HttpOnly Cookie，不需要在 Header 中傳遞 token
      // 後端會從 Cookie 中讀取 access_token
      const res = await originalFetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include' // 重要：包含 Cookie
      });
      if(!res.ok) throw new Error(`REFRESH_${res.status}`);
      const data = await res.json();
      // 如果後端返回了新的 token（向後兼容），更新到 localStorage
      if(data.access_token && window.Auth && window.Auth.setToken) window.Auth.setToken(data.access_token);
      if(data.refresh_token && window.Auth && window.Auth.setRefreshToken) window.Auth.setRefreshToken(data.refresh_token);
      // Token 刷新後，清除 CSRF Token 緩存（需要重新獲取）
      clearCsrfToken();
      return data;
    };
    // 提供 CSRF Token 相關方法
    API.getCsrfToken = getCsrfToken;
    API.clearCsrfToken = clearCsrfToken;
    window.Api = Object.assign(window.Api || {}, API);
  } catch(_) {}
})();


