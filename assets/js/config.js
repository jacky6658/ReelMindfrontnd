// 全域設定（保持與現有專案一致）
// 自動偵測環境：本地開發 vs 正式部署
// 使用 window 檢查避免重複聲明
if (typeof window.isLocalDev === 'undefined') {
  window.isLocalDev = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '0.0.0.0' ||
                      window.location.hostname === '';
}

if (typeof window.API_BASE_URL === 'undefined') {
  window.API_BASE_URL = window.isLocalDev 
    ? 'http://127.0.0.1:8000'  // 本地測試
    : 'https://api.aijob.com.tw';  // 正式版後端
}

if (!window.APP_CONFIG) {
  window.APP_CONFIG = {
    API_BASE: window.API_BASE_URL,
    ACCESS_TOKEN_KEY: 'ipPlanningToken',
    ACCESS_TOKEN_UPDATED_AT: 'ipPlanningTokenUpdated',
    REFRESH_TOKEN_KEY: 'ipPlanningRefreshToken'
  };
}

// 調試：確認設定（已隱藏主控台 log）
// if (typeof console !== 'undefined' && console.log) {
//   console.log('[Config.js] window.API_BASE_URL:', window.API_BASE_URL);
//   console.log('[Config.js] window.APP_CONFIG.API_BASE:', window.APP_CONFIG.API_BASE);
// }


