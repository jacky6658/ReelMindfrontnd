/**
 * 整合伺服器：同時提供前端靜態檔案和後端 API
 * 用於 Zeabur 部署（前後端同一個服務）
 * 已加強安全防護
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { 
  auditLogger, 
  advancedRateLimiter, 
  checkIPWhitelist, 
  detectSSRF, 
  sanitizeJsonData 
} = require('./server-security');

const app = express();
const PORT = process.env.PORT || 8080;

// 明確標記這是 Node.js/Express 應用（避免 Zeabur 誤判）
console.log('🚀 啟動 Node.js/Express 伺服器...');
console.log(`📦 Node.js 版本: ${process.version}`);
console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 端口: ${PORT}`);

// 環境變數
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// 啟動時驗證必需環境變數
if (!ADMIN_SECRET || ADMIN_SECRET.trim() === '') {
  console.error('\n❌ 嚴重錯誤：ADMIN_SECRET 未設定！');
  console.error('請在 Zeabur 環境變數中設定 ADMIN_SECRET');
  console.error('應用程式將無法正常運作\n');
  if (isProduction) {
    process.exit(1);
  }
}
// 在 Zeabur 部署時，public/ 目錄的內容會被 Vite 複製到 dist/ 根目錄
// 所以 catalog.json 實際位置是 dist/catalog.json
const CATALOG_FILE_PATH = process.env.CATALOG_FILE_PATH || path.join(__dirname, 'dist/catalog.json');

// 允許的來源（從環境變數讀取，預設為當前域名）
const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS;
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV 
  ? ALLOWED_ORIGINS_ENV.split(',').map(o => o.trim())
  : [];

// 確保總是允許您的前端網域
if (!ALLOWED_ORIGINS.includes('https://aitools.aijob.com.tw')) {
  ALLOWED_ORIGINS.push('https://aitools.aijob.com.tw');
}

// IP 白名單（可選，用於限制管理員 API 訪問）
// 設定方式：在 Zeabur 環境變數中設定 IP_WHITELIST，多個 IP 用逗號分隔
// 例如：IP_WHITELIST=61.219.19.197,192.168.1.1
// 注意：此白名單只影響管理員 API（POST /api/catalog），不影響圖片載入
const IP_WHITELIST = process.env.IP_WHITELIST
  ? process.env.IP_WHITELIST.split(',').map(ip => ip.trim())
  : [];

// Rate Limiting 儲存（簡單記憶體儲存，生產環境應使用 Redis）
const rateLimitStore = new Map();

// Zeabur 區域檢測端點（必須在所有中間件之前）
app.get('/_zeabur/region', (req, res) => {
  res.json({ region: 'sjc1' }); // Zeabur 區域代碼
});

// 強制 HTTPS（生產環境）
// 注意：在 Zeabur 上已禁用，因為 Zeabur 會自動處理 HTTPS
if (false) { // 已禁用：Zeabur 會自動處理 HTTPS 重定向
  app.use((req, res, next) => {
    // 檢查 X-Forwarded-Proto（Zeabur 使用）
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https' && req.get('host')) {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
    next();
  });
}

// 中間件
app.use(express.json({ limit: '10mb' }));

// 安全標頭
app.use((req, res, next) => {
  // Content Security Policy
  // 注意：img-src 允許所有外部圖片（包括 Google favicon、blob URL 等）以支援圖片快取
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; " + // 允許 Tailwind CDN
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " + // 允許 Tailwind CDN 樣式
    "img-src 'self' data: blob: https: http: *; " + // 允許所有外部圖片（包括 Google favicon、快取圖片等）
    "font-src 'self' data: https:; " +
    "connect-src 'self' https: http:; " + // 允許外部連接（用於圖片快取）
    "frame-src 'self' https://www.youtube.com https://youtube.com; " + // 允許 YouTube iframe
    "frame-ancestors 'none'; " +
    "base-uri 'self';"
  );
  
  // 其他安全標頭
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});

// CORS 設定（加強版）
// 注意：圖片請求（GET）不受 CORS 限制，此設定主要影響 API 請求
app.use((req, res, next) => {
  // 圖片請求不需要 CORS 處理，直接通過
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) || 
      req.path.startsWith('/images/') ||
      req.path === '/sw.js' ||
      req.path === '/_zeabur/region') {
    return next(); // 圖片和 Service Worker 不需要 CORS
  }
  
  const origin = req.headers.origin;
  
  // 如果設定了允許的來源，只允許這些來源
  if (ALLOWED_ORIGINS.length > 0) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      // 如果來源不在允許列表中，檢查是否是同源請求
      const host = req.headers.host;
      if (!origin || origin.includes(host)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
      } else {
        return res.status(403).json({ error: '來源不被允許' });
      }
    }
  } else {
    // 如果沒有設定，使用原來的邏輯（允許同源或任何來源）
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 小時
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rate Limiting 中間件
// 注意：圖片請求不受 Rate Limiting 限制
function rateLimit(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    // 圖片請求不需要 Rate Limiting
    if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) || 
        req.path.startsWith('/images/') ||
        req.path === '/sw.js' ||
        req.path === '/favicon.ico' ||
        req.path === '/_zeabur/region') {
      return next();
    }
    
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({ 
        error: '請求過於頻繁，請稍後再試',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

// 清理過期的 Rate Limit 記錄（每 5 分鐘）
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// SHA-256 雜湊函數
function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// 驗證 Admin 權限（加強版）
function verifyAdmin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // 記錄安全審計日誌
  auditLogger.log('ADMIN_API_REQUEST', {
    ip,
    method: req.method,
    path: req.path,
    userAgent: userAgent.substring(0, 100)
  });
  
  // 檢查 IP 白名單（如果設定）
  if (IP_WHITELIST.length > 0 && !checkIPWhitelist(req, IP_WHITELIST)) {
    auditLogger.log('ADMIN_ACCESS_DENIED_IP', { ip, path: req.path });
    return res.status(403).json({ error: 'IP 地址不在允許列表中' });
  }
  
  // 檢查是否為可疑 IP
  if (advancedRateLimiter.isSuspicious(ip)) {
    auditLogger.log('SUSPICIOUS_IP_ATTEMPT', { ip, path: req.path });
    return res.status(429).json({ error: '請求被拒絕，請稍後再試' });
  }
  
  const authHeader = req.headers.authorization;
  
  if (!ADMIN_SECRET) {
    console.error('❌ 錯誤：ADMIN_SECRET 未設定，API 將拒絕所有請求');
    return res.status(500).json({ 
      error: '伺服器未設定管理密碼，請設定 ADMIN_SECRET 環境變數' 
    });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ 錯誤：缺少授權標頭');
    return res.status(401).json({ error: '缺少授權標頭' });
  }

  const token = authHeader.substring(7);
  
  // 驗證 token 長度（防止異常輸入）
  if (token.length > 1000) {
    console.error('❌ 錯誤：授權令牌過長');
    return res.status(400).json({ error: '無效的授權令牌' });
  }
  
  const tokenHash = sha256Hex(token);
  const secretHash = sha256Hex(ADMIN_SECRET);

  // 使用時間安全比較（防止時間攻擊）
  let result = 0;
  if (tokenHash.length !== secretHash.length) {
    result = 1;
  } else {
    for (let i = 0; i < tokenHash.length; i++) {
      result |= tokenHash.charCodeAt(i) ^ secretHash.charCodeAt(i);
    }
  }

  if (result !== 0) {
    auditLogger.log('ADMIN_AUTH_FAILED', {
      ip,
      path: req.path,
      reason: '無效的授權令牌'
    });
    // 延遲回應（防止時間攻擊分析）
    setTimeout(() => {
      res.status(403).json({ error: '無效的授權令牌' });
    }, 100 + Math.random() * 100);
    return;
  }

  auditLogger.log('ADMIN_AUTH_SUCCESS', { ip, path: req.path });
  next();
}

// 驗證 Catalog 資料
function validateCatalogData(catalog) {
  if (!catalog || typeof catalog !== 'object') {
    return { valid: false, error: '無效的 catalog 格式' };
  }

  // 清理 JSON 資料（防止深度嵌套攻擊）
  try {
    catalog = sanitizeJsonData(catalog);
  } catch (error) {
    return { valid: false, error: '資料結構無效：' + error.message };
  }

  if (!Array.isArray(catalog.categories)) {
    return { valid: false, error: 'categories 必須是陣列' };
  }

  if (!Array.isArray(catalog.apps)) {
    return { valid: false, error: 'apps 必須是陣列' };
  }

  // 限制大小
  if (catalog.categories.length > 50) {
    return { valid: false, error: '分類數量過多（最多 50 個）' };
  }

  if (catalog.apps.length > 500) {
    return { valid: false, error: '應用程式數量過多（最多 500 個）' };
  }

  // 驗證每個應用程式
  for (let i = 0; i < catalog.apps.length; i++) {
    const app = catalog.apps[i];
    if (!app.name || typeof app.name !== 'string' || app.name.length > 100) {
      return { valid: false, error: `應用程式 ${i + 1} 的名稱無效` };
    }
    if (!app.href || typeof app.href !== 'string' || app.href.length > 500) {
      return { valid: false, error: `應用程式 ${i + 1} 的連結無效` };
    }
    
    // SSRF 防護：檢查 URL
    const ssrfCheck = detectSSRF(app.href);
    if (ssrfCheck.isSSRF) {
      auditLogger.log('SSRF_ATTEMPT_DETECTED', {
        url: app.href,
        reason: ssrfCheck.reason,
        appName: app.name
      });
      return { valid: false, error: `應用程式 ${i + 1} 的連結不安全（${ssrfCheck.reason}）` };
    }
    
    // 驗證 URL
    try {
      const url = new URL(app.href.startsWith('http') ? app.href : `https://${app.href}`);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { valid: false, error: `應用程式 ${i + 1} 的連結協議無效` };
      }
    } catch {
      return { valid: false, error: `應用程式 ${i + 1} 的連結格式無效` };
    }
  }

  return { valid: true };
}

// API 路由（必須在靜態檔案之前）
// 先處理 OPTIONS 請求（CORS preflight）
app.options('/api/catalog', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.get('/api/catalog', (req, res, next) => {
  // 使用進階 Rate Limiting
  const rateLimitCheck = advancedRateLimiter.check(req, 30, 60000, '/api/catalog');
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ 
      error: rateLimitCheck.reason || '請求過於頻繁，請稍後再試',
      retryAfter: rateLimitCheck.retryAfter
    });
  }
  next();
}, async (req, res) => {
  auditLogger.log('CATALOG_READ', {
    ip: req.ip || req.connection.remoteAddress
  });
  
  try {
    // 嘗試多個可能的路徑
    const possiblePaths = [
      CATALOG_FILE_PATH,
      path.join(__dirname, 'dist/catalog.json'),
      path.join(__dirname, 'public/catalog.json'),
      path.join(process.cwd(), 'dist/catalog.json'),
      path.join(process.cwd(), 'public/catalog.json'),
    ];
    
    let catalogData = null;
    let usedPath = null;
    
    for (const filePath of possiblePaths) {
      try {
        const data = await fs.readFile(filePath, 'utf8');
        catalogData = JSON.parse(data);
        usedPath = filePath;
        break;
      } catch (err) {
        // 繼續嘗試下一個路徑
        continue;
      }
    }
    
    if (!catalogData) {
      console.error('❌ 無法找到 catalog.json，嘗試的路徑:', possiblePaths);
      auditLogger.log('CATALOG_READ_FAILED', { 
        error: '檔案不存在',
        triedPaths: possiblePaths.map(p => p.replace(__dirname, '***'))
      });
      return res.status(404).json({ 
        error: 'catalog.json 不存在',
        triedPaths: possiblePaths.length
      });
    }
    
    auditLogger.log('CATALOG_READ_SUCCESS', {
      path: usedPath?.replace(__dirname, '***'),
      categories: catalogData.categories?.length || 0,
      apps: catalogData.apps?.length || 0
    });
    
    // 強制設定不緩存標頭（特別是針對手機瀏覽器）
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(catalogData);
  } catch (error) {
    console.error('❌ 讀取 catalog 失敗:', error);
    auditLogger.log('CATALOG_READ_FAILED', { error: error.message });
    res.status(500).json({ 
      error: '讀取 catalog 失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/catalog', (req, res, next) => {
  // 使用進階 Rate Limiting
  const rateLimitCheck = advancedRateLimiter.check(req, 5, 60000, '/api/catalog');
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ 
      error: rateLimitCheck.reason || '請求過於頻繁，請稍後再試',
      retryAfter: rateLimitCheck.retryAfter
    });
  }
  next();
}, verifyAdmin, async (req, res) => {
  try {
    // 驗證請求體大小
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return res.status(413).json({ error: '請求體過大（最大 10MB）' });
    }

    // 只在非生產環境或啟用詳細日誌時記錄
    if (!isProduction || process.env.ENABLE_VERBOSE_LOGS === 'true') {
      console.log('📦 收到 catalog 資料:', {
        categories: req.body?.categories?.length || 0,
        apps: req.body?.apps?.length || 0
      });
    }

    // 驗證資料格式
    const validation = validateCatalogData(req.body);
    if (!validation.valid) {
      console.error('❌ 驗證失敗:', validation.error);
      return res.status(400).json({ 
        error: validation.error || '無效的 catalog 格式'
      });
    }

    const catalog = req.body;

    // 確保目錄存在
    const dir = path.dirname(CATALOG_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    // 只在非生產環境記錄
    if (!isProduction) {
      console.log('📁 目錄已確保存在:', dir);
    }

    // 寫入檔案（使用原子寫入）
    const catalogJson = JSON.stringify(catalog, null, 2);
    const tempPath = CATALOG_FILE_PATH + '.tmp';
    await fs.writeFile(tempPath, catalogJson, 'utf8');
    await fs.rename(tempPath, CATALOG_FILE_PATH);
    
    auditLogger.log('CATALOG_UPDATE_SUCCESS', {
      ip: req.ip || req.connection.remoteAddress,
      categories: catalog.categories.length,
      apps: catalog.apps.length
    });

    res.json({ 
      success: true, 
      message: 'Catalog 已成功更新',
      timestamp: new Date().toISOString(),
      stats: {
        categories: catalog.categories.length,
        apps: catalog.apps.length
      }
    });
  } catch (error) {
    console.error('❌ 更新 catalog 失敗:', error.message);
    res.status(500).json({ 
      error: '更新 catalog 失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    catalogPath: CATALOG_FILE_PATH.replace(/\/[^/]+$/, '/***') // 隱藏完整路徑
  });
});

// Favicon 路由（避免 404 錯誤）
app.get('/favicon.ico', (req, res) => {
  // 返回 204 No Content，避免瀏覽器重複請求
  res.status(204).end();
});

// 靜態檔案（必須在最後，作為 fallback）
app.use(express.static('dist', {
  // 排除 API 路由
  index: false,
  // 設定快取控制（避免 catalog.json 被快取，特別是手機瀏覽器）
  setHeaders: (res, path) => {
    if (path.endsWith('catalog.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', ''); // 清除 ETag，強制重新驗證
      res.setHeader('Last-Modified', ''); // 清除 Last-Modified
    }
  }
}));

// SPA fallback：所有其他 GET 請求都返回 index.html（排除 API 路由和 Service Worker）
app.get('*', (req, res, next) => {
  // 如果是 API 路由，返回 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API 路由不存在' });
  }
  // Service Worker 應該由靜態檔案服務器處理，但如果沒有找到，返回 404
  if (req.path === '/sw.js') {
    return res.status(404).json({ error: 'Service Worker not found' });
  }
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err.message);
  res.status(500).json({ 
    error: '伺服器內部錯誤',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 整合伺服器運行在 http://localhost:${PORT}`);
  console.log(`📁 Catalog 檔案路徑: ${CATALOG_FILE_PATH.replace(/\/[^/]+$/, '/***')}`);
  console.log(`🔐 Admin 驗證: ${ADMIN_SECRET ? '已設定 ✓' : '❌ 未設定（將拒絕所有請求）'}`);
  console.log(`🛡️ 安全防護: Rate Limiting, CSP, CORS 已啟用`);
  console.log(`📡 API 端點: POST /api/catalog`);
  console.log(`📡 API 端點: GET /api/catalog`);
  console.log(`🏥 健康檢查: GET /health`);
  console.log(`🌍 Zeabur 區域: GET /_zeabur/region`);
  
  // IP 白名單資訊
  if (IP_WHITELIST.length > 0) {
    console.log(`\n📋 IP 白名單（管理員 API 訪問限制）:`);
    IP_WHITELIST.forEach(ip => console.log(`   ✓ ${ip}`));
    console.log(`\n💡 提示：要添加更多 IP，請設定環境變數 IP_WHITELIST（用逗號分隔）`);
  } else {
    console.log(`\n📋 IP 白名單: 未設定（所有 IP 都可以訪問管理員 API）`);
    console.log(`💡 提示：要限制管理員 API 訪問，請設定環境變數 IP_WHITELIST`);
    console.log(`   例如：IP_WHITELIST=61.219.19.197,192.168.1.1`);
  }
  
  // 圖片快取相關資訊
  console.log(`\n🖼️  圖片快取設定:`);
  console.log(`   ✓ CSP img-src 允許所有外部圖片（包括 Google favicon）`);
  console.log(`   ✓ CORS 不限制圖片請求`);
  console.log(`   ✓ Rate Limiting 不限制圖片請求`);
  console.log(`   ✓ Service Worker 已啟用圖片快取`);
  
  console.log(`${'='.repeat(60)}\n`);
});
