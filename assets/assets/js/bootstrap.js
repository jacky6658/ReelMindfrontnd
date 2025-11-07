(function(){
  // 預留：若需要頁面載入後進行初始化，可在此呼叫 UI 綁定等
  function bootstrap(){
    // 若原有初始化流程散落在 index.html，後續可逐步搬移到這裡
    // 開站：僅當已有 access_token 時才呼叫 /me，避免未登入就 401
    try {
      const BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
      const hasToken = !!(window.Auth && window.Auth.getToken && window.Auth.getToken());
      if (BASE && hasToken) {
        fetch(`${BASE}/api/auth/me`, { method: 'GET' }).catch(function(_){});
      }
    } catch(_) {}
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();


