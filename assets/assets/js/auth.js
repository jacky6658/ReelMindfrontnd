(function(){
  const CFG = window.APP_CONFIG || {};
  const TOKEN_KEY = CFG.ACCESS_TOKEN_KEY || 'ipPlanningToken';
  const TOKEN_UPDATED = CFG.ACCESS_TOKEN_UPDATED_AT || 'ipPlanningTokenUpdated';
  const REFRESH_KEY = CFG.REFRESH_TOKEN_KEY || 'ipPlanningRefreshToken';

  window.Auth = {
    getToken(){
      return localStorage.getItem(TOKEN_KEY) || '';
    },
    setToken(token){
      if(!token) return;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_UPDATED, Date.now().toString());
    },
    getRefreshToken(){
      return localStorage.getItem(REFRESH_KEY) || '';
    },
    setRefreshToken(rt){
      if(!rt) return;
      localStorage.setItem(REFRESH_KEY, rt);
    }
    // 其餘登入/登出流程仍由原有代碼處理
  };
  
  // 附加 OAuth message 監聽：只接受同源，取得 token 後寫入並刷新
  (function attachOAuthMessageListener(){
    if (window.__oauthListenerInstalled) return;
    window.__oauthListenerInstalled = true;
    window.addEventListener('message', async function(e){
      try {
        if (e.origin !== window.location.origin) return;
        const data = e.data || {};
        if (data.type !== 'GOOGLE_AUTH_SUCCESS') return;
        const token = data.ipPlanningToken || data.accessToken || '';
        const refreshToken = data.refreshToken || data.refresh_token || '';
        if (token) {
          if (window.Auth && window.Auth.setToken) window.Auth.setToken(token);
          if (refreshToken && window.Auth.setRefreshToken) window.Auth.setRefreshToken(refreshToken);
          try { if (window.__loginWindow && !window.__loginWindow.closed) window.__loginWindow.close(); } catch(_) {}
          // 嘗試立即以新 token 驗證一次，失敗則嘗試以舊 access token 呼叫 refresh
          const BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
          try {
            const meRes = await fetch(`${BASE}/api/auth/me`, { method: 'GET' });
            if (!meRes.ok) throw new Error('me not ok');
            // 可在此更新 UI 狀態，如有需要
          } catch(_) {
            // 觸發一次 refresh（用舊 access token），再嘗試 me
            try {
              const oldAccess = (window.Auth && window.Auth.getToken && window.Auth.getToken()) || token || '';
              await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', headers: { 'Authorization': `Bearer ${oldAccess}` } });
              await fetch(`${BASE}/api/auth/me`, { method: 'GET' });
            } catch(__) {
              // 最終退回 reload，確保狀態同步
              window.location.reload();
              return;
            }
          }
          // 輕量刷新 UI：派發自訂事件給頁面既有邏輯（若已綁定可即時更新）
          try { window.dispatchEvent(new CustomEvent('auth:logged-in')); } catch(_) {}
        }
      } catch(_) {}
    });
  })();

  // 建立 BroadcastChannel 監聽（popup -> 主頁），與 message 機制並存
  try {
    const ch = new BroadcastChannel('auth');
    ch.onmessage = async function(ev){
      try{
        const msg = ev.data || {};
        if(msg.type !== 'login-success') return;
        if (msg.access_token && window.Auth.setToken) window.Auth.setToken(msg.access_token);
        if (msg.refresh_token && window.Auth.setRefreshToken) window.Auth.setRefreshToken(msg.refresh_token);
        window.dispatchEvent(new CustomEvent('auth:logged-in'));
        // 開始同步 me
        const BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
        if (BASE){
          try { await fetch(`${BASE}/api/auth/me`, { method: 'GET' }); } catch(_){
            const oldAccess = (window.Auth && window.Auth.getToken && window.Auth.getToken()) || '';
            if(oldAccess){ try { await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', headers: { 'Authorization': `Bearer ${oldAccess}` } }); await fetch(`${BASE}/api/auth/me`, { method:'GET' }); } catch(__){} }
          }
        }
      }catch(_){}
    };
  } catch(_) {}

  // 兼容訊息：popup 成功後通知主視窗 → 優先 getMe，同步 UI；失敗再整頁刷新
  try {
    window.addEventListener('message', async function(e){
      const data = e && e.data || {};
      if (data && data.type === 'googleAuthSuccess') {
        try {
          if (window.Api && window.Api.getMe) {
            const me = await window.Api.getMe();
            // TODO: 若有全域 store，這裡可更新使用者狀態。
            console.log('me after popup:', me);
            return;
          }
          // 若沒有 Api.getMe 可用，退回 reload
          location.reload();
        } catch (_) {
          location.reload();
        }
      }
    });
  } catch(_) {}
})();


