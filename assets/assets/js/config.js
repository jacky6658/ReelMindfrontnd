// 全域設定（保持與現有專案一致）
// 自動偵測環境：本地開發 vs 正式部署
const isLocalDev = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname === '0.0.0.0' ||
                   window.location.hostname === '';

const API_BASE_URL = isLocalDev 
  ? 'http://127.0.0.1:8000'  // 本地測試
  : 'https://aivideobackend.zeabur.app';  // 正式版後端

window.APP_CONFIG = {
  API_BASE: API_BASE_URL,
  ACCESS_TOKEN_KEY: 'ipPlanningToken',
  ACCESS_TOKEN_UPDATED_AT: 'ipPlanningTokenUpdated',
  REFRESH_TOKEN_KEY: 'ipPlanningRefreshToken'
};


