// mode1.js - IP人設規劃模式專用函數
// 從 mode1.html 提取的所有 JavaScript 代碼

// API_BASE_URL 已在 config.js 中定義為全局變數
// 這裡直接使用 window.APP_CONFIG，避免重複聲明
const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
let ipPlanningToken = localStorage.getItem('ipPlanningToken') || '';
let ipPlanningUser = JSON.parse(localStorage.getItem('ipPlanningUser') || 'null');
let isMode1Sending = false;
let mode1ChatInitialized = false;
let currentMode1ConversationType = 'ip_planning';

// iOS Safari 視窗高度處理（解決 100vh 問題）
function setIOSViewportHeight() {
  // 設置 CSS 變數來處理 iOS Safari 的動態視窗高度
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // 為 Modal 設置動態高度
  const modalOverlay = document.getElementById('mode1OneClickModalOverlay');
  if (modalOverlay) {
    modalOverlay.style.height = `${window.innerHeight}px`;
  }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 ========== Mode1 (IP人設規劃) 頁面初始化 ==========');
  
  // iOS Safari 視窗高度處理
  setIOSViewportHeight();
  window.addEventListener('resize', setIOSViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setIOSViewportHeight, 100); // 延遲執行以確保方向改變完成
  });
  
  // 載入用戶資訊
  if (window.Auth && window.Auth.getToken()) {
    ipPlanningToken = window.Auth.getToken();
  }
  // 從 localStorage 或 common.js 獲取用戶資訊
  if (window.ReelMindCommon && window.ReelMindCommon.getUser) {
    ipPlanningUser = window.ReelMindCommon.getUser();
  } else {
    const userStr = localStorage.getItem('ipPlanningUser');
    ipPlanningUser = userStr ? JSON.parse(userStr) : null;
  }
  
  // 檢查並顯示用戶狀態
  const isLoggedIn = !!(ipPlanningToken && ipPlanningUser);
  console.log('🔐 登入狀態:', isLoggedIn ? '✅ 已登入' : '❌ 未登入');
  
  if (isLoggedIn) {
    console.log('👤 用戶資訊:', {
      user_id: ipPlanningUser?.user_id || 'N/A',
      name: ipPlanningUser?.name || ipPlanningUser?.displayName || 'N/A',
      email: ipPlanningUser?.email || 'N/A',
      picture: ipPlanningUser?.picture || ipPlanningUser?.avatar || 'N/A'
    });
    
    // 檢查訂閱狀態
    let isSubscribed = false;
    if (window.ReelMindCommon && typeof window.ReelMindCommon.isSubscribed === 'function') {
      isSubscribed = window.ReelMindCommon.isSubscribed();
    } else {
      // 降級處理：檢查多個來源
      const backendSubscribed = document.body.dataset.subscribed === 'true';
      const localSubscriptionStatus = localStorage.getItem('subscriptionStatus');
      const localSubscribed = localSubscriptionStatus === 'active';
      const userSubscribed = !!(ipPlanningUser && (
        ipPlanningUser.is_subscribed === true || 
        ipPlanningUser.is_subscribed === 1 || 
        ipPlanningUser.is_subscribed === '1' ||
        ipPlanningUser.is_subscribed === 'true'
      ));
      isSubscribed = backendSubscribed || localSubscribed || userSubscribed;
    }
    
    console.log('💳 訂閱狀態:', isSubscribed ? '✅ 已訂閱' : '❌ 未訂閱');
    console.log('📊 訂閱狀態詳情:', {
      'document.body.dataset.subscribed': document.body.dataset.subscribed,
      'localStorage.subscriptionStatus': localStorage.getItem('subscriptionStatus'),
      'user.is_subscribed': ipPlanningUser?.is_subscribed
    });
  }
  
  // 檢查權限（需要登入和訂閱）- 使用 checkPagePermission 會直接重定向
  if (window.ReelMindCommon && typeof window.ReelMindCommon.checkPagePermission === 'function') {
    const hasPermission = await window.ReelMindCommon.checkPagePermission();
    if (!hasPermission) {
      // checkPagePermission 會自動重定向，這裡不需要額外處理
      return;
    }
    console.log('✅ 權限檢查通過，可以訪問此功能');
  } else {
    // 降級處理：如果 common.js 未載入，手動檢查
    if (!isLoggedIn) {
      console.warn('⚠️ 未登入，導向首頁');
      window.location.href = '/';
      return;
    }
    // 檢查訂閱狀態
    let isSubscribed = false;
    if (window.ReelMindCommon && typeof window.ReelMindCommon.isSubscribed === 'function') {
      isSubscribed = window.ReelMindCommon.isSubscribed();
    } else {
      const backendSubscribed = document.body.dataset.subscribed === 'true';
      const localSubscriptionStatus = localStorage.getItem('subscriptionStatus');
      const localSubscribed = localSubscriptionStatus === 'active';
      const userSubscribed = !!(ipPlanningUser && (
        ipPlanningUser.is_subscribed === true || 
        ipPlanningUser.is_subscribed === 1 || 
        ipPlanningUser.is_subscribed === '1' ||
        ipPlanningUser.is_subscribed === 'true'
      ));
      isSubscribed = backendSubscribed || localSubscribed || userSubscribed;
    }
    if (!isSubscribed) {
      console.warn('⚠️ 未訂閱，導向訂閱頁');
      window.location.href = '/subscription.html';
      return;
    }
  }

  // 更新用戶資訊顯示
  updateUserInfo();
  
  // 載入用戶記憶（長期記憶和短期記憶）
  if (isLoggedIn && ipPlanningUser?.user_id) {
    await loadUserMemory();
  }
  
  // 初始化聊天功能
  initMode1Chat();
  
  console.log('✅ ========== Mode1 頁面初始化完成 ==========');
});

// 檢查是否有已保存的 IP 規劃結果
async function checkSavedIpPlanningResult(resultType, forceRegenerate = false) {
  // forceRegenerate: true 表示強制重新生成（用於重新定位或重新生成按鈕）
  if (forceRegenerate || !ipPlanningUser?.user_id || !ipPlanningToken) {
    return null;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
    const response = await fetch(`${API_URL}/api/ip-planning/my?result_type=${resultType}`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results && data.results.length > 0) {
        // 返回最新的結果（第一個，因為後端按 created_at DESC 排序）
        return data.results[0];
      }
    }
    return null;
  } catch (error) {
    console.error('檢查已保存的 IP 規劃結果失敗:', error);
    return null;
  }
}

// 顯示已保存的 IP 規劃結果
function displaySavedIpPlanningResult(resultBlock, result, resultType) {
  if (!resultBlock || !result || !result.content) {
    return false;
  }
  
  // 隱藏 placeholder
  const placeholder = resultBlock.querySelector('.mode1-result-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  
  // 創建或獲取內容容器
  let contentDiv = resultBlock.querySelector('.mode1-result-content');
  if (!contentDiv) {
    contentDiv = document.createElement('div');
    contentDiv.className = 'mode1-result-content';
    resultBlock.appendChild(contentDiv);
  }
  
  // 渲染 Markdown 內容
  contentDiv.innerHTML = renderMode1Markdown(result.content);
  
  // 更新按鈕
  const button = resultBlock.querySelector('.mode1-generate-btn');
  if (button) {
    button.innerHTML = '<span>重新生成</span>';
    button.disabled = false;
  }
  
  // 顯示通知
  const typeNames = {
    'profile': '帳號定位',
    'plan': '選題方向',
    'scripts': '一週腳本'
  };
  const typeName = typeNames[resultType] || '內容';
  
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast(`已載入之前的${typeName}記錄`, 2000);
  }
  
  return true;
}

// 載入用戶記憶（長期記憶和短期記憶）
async function loadUserMemory() {
  if (!ipPlanningUser?.user_id || !ipPlanningToken) {
    console.warn('⚠️ 無法載入記憶：缺少用戶ID或Token');
    return;
  }
  
  try {
    console.log('🧠 ========== 開始載入用戶記憶 ==========');
    console.log('👤 用戶ID:', ipPlanningUser.user_id);
    console.log('💬 對話類型: ip_planning');
    
    // 使用完整記憶端點（包含 STM + LTM），指定 conversation_type 為 ip_planning
    const memoryResponse = await fetch(`${API_URL}/api/user/memory/full/${ipPlanningUser.user_id}?conversation_type=ip_planning`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`
      }
    });
    
    console.log('🧠 記憶響應狀態:', memoryResponse.status);
    
    if (memoryResponse.ok) {
      const memoryData = await memoryResponse.json();
      console.log('✅ 用戶記憶數據:', memoryData);
      
      // 顯示短期記憶（STM）
      if (memoryData.stm) {
        console.log('📝 短期記憶 (STM):', {
          '最近對話輪數': memoryData.stm.recent_turns_count || 0,
          '有摘要': memoryData.stm.has_summary ? '是' : '否',
          '更新時間': memoryData.stm.updated_at ? new Date(memoryData.stm.updated_at * 1000).toLocaleString('zh-TW') : 'N/A'
        });
      }
      
      // 顯示長期記憶（LTM）
      if (memoryData.ltm && memoryData.ltm.memory_text) {
        const ltmPreview = memoryData.ltm.memory_text.length > 200 
          ? memoryData.ltm.memory_text.substring(0, 200) + '...' 
          : memoryData.ltm.memory_text;
        console.log('📚 長期記憶 (LTM) 預覽:', ltmPreview);
      }
      
      // 顯示記憶摘要
      if (memoryData.summary) {
        console.log('📋 記憶摘要:', memoryData.summary);
      }
      
      console.log('✅ ========== 用戶記憶載入完成 ==========');
    } else {
      const errorText = await memoryResponse.text();
      console.error('❌ 載入用戶記憶失敗:', memoryResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ 載入用戶記憶時出錯:', error);
  }
}

// 更新用戶資訊顯示
// 使用 common.js 中的統一函數
function updateUserInfo() {
  // 直接調用 common.js 中的函數，避免無限遞迴
  if (window.ReelMindCommon && window.ReelMindCommon.updateUserInfo) {
    window.ReelMindCommon.updateUserInfo();
  }
  // 不再調用 window.updateUserInfo()，因為它可能指向自己，導致無限遞迴
}

// 初始化 Mode1 聊天功能
function initMode1Chat() {
  const messageInput = document.getElementById('mode1-messageInput');
  const sendBtn = document.getElementById('mode1-sendBtn');
  const quickButtons = document.getElementById('mode1-quickButtons');
  
  if (!messageInput || !sendBtn || !quickButtons) return;
  
  if (mode1ChatInitialized) {
    sendBtn.disabled = !messageInput.value.trim();
    return;
  }
  mode1ChatInitialized = true;
  
  // 輸入框自動調整高度
  messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    sendBtn.disabled = !this.value.trim();
  });
  
  // iOS Safari 鍵盤處理：當輸入框獲得焦點時，確保輸入框可見並避免下方空白
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    const inputRow = messageInput.closest('.input-row');
    const chatMessages = document.getElementById('mode1-chatMessages');
    const body = document.body;
    const html = document.documentElement;
    
    messageInput.addEventListener('focus', function() {
      // 延遲執行，等待鍵盤彈出
      setTimeout(() => {
        if (inputRow) {
          // 移除 body 的固定定位，避免下方空白
          if (body.style.position === 'fixed') {
            body.style.position = 'relative';
            body.style.height = 'auto';
            body.style.overflow = 'visible';
          }
          
          // 計算輸入框的位置
          const inputRect = inputRow.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const keyboardHeight = viewportHeight - inputRect.bottom;
          
          // 如果輸入框被鍵盤遮擋，滾動聊天訊息區域
          if (keyboardHeight < 0 || inputRect.bottom > viewportHeight - 100) {
            // 滾動聊天訊息區域，確保輸入框可見
            if (chatMessages) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }
        }
      }, 300); // 等待鍵盤動畫完成
    });
    
    messageInput.addEventListener('blur', function() {
      // 鍵盤收起時，恢復 body 的固定定位
      setTimeout(() => {
        if (body) {
          body.style.position = 'fixed';
          body.style.height = '100dvh';
          body.style.overflow = 'hidden';
        }
        
        // 恢復正常滾動
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }, 300);
    });
    
    // 監聽視窗大小變化（鍵盤彈出/收起會觸發）
    let lastViewportHeight = window.innerHeight;
    window.addEventListener('resize', function() {
      const currentHeight = window.innerHeight;
      // 如果視窗高度減少（鍵盤彈出），移除 body 固定定位
      if (currentHeight < lastViewportHeight - 150) {
        if (body && body.style.position === 'fixed') {
          body.style.position = 'relative';
          body.style.height = 'auto';
          body.style.overflow = 'visible';
        }
        setTimeout(() => {
          if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        }, 100);
      } else if (currentHeight > lastViewportHeight + 50) {
        // 鍵盤收起，恢復 body 固定定位
        if (body) {
          body.style.position = 'fixed';
          body.style.height = '100dvh';
          body.style.overflow = 'hidden';
        }
      }
      lastViewportHeight = currentHeight;
    });
  }
  
  // 發送按鈕
  sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
      sendMode1Message(message);
    }
  });
  
  // Enter 發送
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = messageInput.value.trim();
      if (message) {
        sendMode1Message(message);
      }
    }
  });
  
  // 快速按鈕事件處理（保留作為備用，主要使用 onclick）
  quickButtons.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('.quick-btn');
    if (btn && btn.closest('.mode1-page') && quickButtons.id === 'mode1-quickButtons') {
      e.preventDefault();
      // 如果按鈕有 onclick，不處理（由 onclick 處理）
      if (btn.onclick) {
        return;
      }
      // 降級處理：如果有 data-text，使用舊方式
      const text = btn.getAttribute('data-text');
      if (text) {
        sendMode1Message(text, 'ip_planning');
      }
    }
  });
}

// 解析 429 配額錯誤並提取重試時間
function parseQuotaError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return null;
  }
  
  // 檢查是否為 429 錯誤
  if (!errorMessage.includes('429') && !errorMessage.includes('quota') && !errorMessage.includes('exceeded')) {
    return null;
  }
  
  // 提取 retry_delay 資訊
  let retrySeconds = null;
  
  // 方法1: 從 "Please retry in X.XXs" 提取
  const retryMatch = errorMessage.match(/Please retry in ([\d.]+)s/i);
  if (retryMatch) {
    retrySeconds = Math.ceil(parseFloat(retryMatch[1]));
  }
  
  // 方法2: 從 "retry_delay { seconds: X }" 提取
  if (!retrySeconds) {
    const delayMatch = errorMessage.match(/retry_delay\s*\{[^}]*seconds:\s*(\d+)/i);
    if (delayMatch) {
      retrySeconds = parseInt(delayMatch[1], 10);
    }
  }
  
  // 方法3: 從 "seconds: X" 提取（更寬鬆的匹配）
  if (!retrySeconds) {
    const secondsMatch = errorMessage.match(/seconds:\s*(\d+)/i);
    if (secondsMatch) {
      retrySeconds = parseInt(secondsMatch[1], 10);
    }
  }
  
  return retrySeconds ? {
    isQuotaError: true,
    retrySeconds: retrySeconds,
    retryMinutes: Math.ceil(retrySeconds / 60),
    message: `API 配額已用盡，請等待約 ${retrySeconds} 秒（約 ${Math.ceil(retrySeconds / 60)} 分鐘）後再試。`
  } : {
    isQuotaError: true,
    retrySeconds: null,
    message: 'API 配額已用盡，請稍後再試。'
  };
}

// 處理快速按鈕點擊
async function handleQuickButton(type) {
  const chatMessages = document.getElementById('mode1-chatMessages');
  if (!chatMessages) return;
  
  switch(type) {
    case 'ip-profile':
      // 先檢查是否有已保存的結果
      const savedProfile = await checkSavedIpPlanningResult('profile', false);
      if (savedProfile && savedProfile.content) {
        // 如果有已保存的結果，直接在對話框中顯示
        const userMessage = createMode1Message('user', '請告知我目前的 IP Profile');
        chatMessages.appendChild(userMessage);
        
        const aiMessage = createMode1Message('assistant', '');
        const contentDiv = aiMessage.querySelector('.message-content');
        contentDiv.innerHTML = renderMode1Markdown(savedProfile.content);
        chatMessages.appendChild(aiMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 記錄到長期記憶
        try {
          await recordMode1ConversationMessage('ip_planning', 'user', '請告知我目前的 IP Profile', ipPlanningToken, ipPlanningUser);
          await recordMode1ConversationMessage('ip_planning', 'assistant', savedProfile.content, ipPlanningToken, ipPlanningUser);
        } catch (error) {
          console.error('記錄長期記憶錯誤:', error);
        }
      } else {
        // 如果沒有已保存的結果，發送訊息給 LLM 生成
        sendMode1Message('請告知我目前的 IP Profile，基於我們之前的對話內容。', 'ip_planning');
      }
      break;
    case '14day-plan':
      // 先檢查是否有已保存的結果
      const savedPlan = await checkSavedIpPlanningResult('plan', false);
      // 同時檢查是否有最新的 IP Profile，用於驗證14天規劃是否匹配
      const currentProfile = await checkSavedIpPlanningResult('profile', false);
      
      // 如果14天規劃存在，但IP Profile已更新，則應該重新生成14天規劃
      // 簡單判斷：如果14天規劃的創建時間早於IP Profile，則不匹配
      let shouldRegenerate = false;
      if (savedPlan && currentProfile) {
        const planTime = new Date(savedPlan.created_at || 0).getTime();
        const profileTime = new Date(currentProfile.created_at || 0).getTime();
        // 如果IP Profile比14天規劃新，則應該重新生成
        if (profileTime > planTime) {
          shouldRegenerate = true;
        }
      }
      
      if (savedPlan && savedPlan.content && !shouldRegenerate) {
        // 如果有已保存的結果且與當前IP Profile匹配，直接在對話框中顯示
        const userMessage = createMode1Message('user', '請告知我的14天規劃');
        chatMessages.appendChild(userMessage);
        
        const aiMessage = createMode1Message('assistant', '');
        const contentDiv = aiMessage.querySelector('.message-content');
        contentDiv.innerHTML = renderMode1Markdown(savedPlan.content);
        chatMessages.appendChild(aiMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 記錄到長期記憶
        try {
          await recordMode1ConversationMessage('ip_planning', 'user', '請告知我的14天規劃', ipPlanningToken, ipPlanningUser);
          await recordMode1ConversationMessage('ip_planning', 'assistant', savedPlan.content, ipPlanningToken, ipPlanningUser);
        } catch (error) {
          console.error('記錄長期記憶錯誤:', error);
        }
      } else {
        // 如果沒有已保存的結果，或結果與當前IP Profile不匹配，發送訊息給 LLM 重新生成
        sendMode1Message('請根據我們目前最新的帳號定位和對話內容，重新生成我的14天規劃。', 'ip_planning');
      }
      break;
    case 'today-script':
      // 今日腳本需要 LLM 詢問用戶選擇腳本結構，所以直接發送
      sendMode1Message('請根據目前資料庫的5個腳本結構（A/B/C/D/E），詢問我要使用哪一個腳本結構來產出今日的腳本。', 'ip_planning');
      break;
    case 'change-script-structure':
      // 換腳本結構：讓 LLM 列出腳本結構讓用戶選擇
      sendMode1Message('請列出目前資料庫中的所有腳本結構（A/B/C/D/E），並說明每個結構的特點，讓我選擇要使用哪一個腳本結構。', 'ip_planning');
      break;
    case 'reposition':
      // 重新定位：完全重新開始，不要參考之前的對話內容
      // 使用明確的指示，告訴 LLM 要忽略所有之前的對話和記憶
      sendMode1Message('【重要：完全重新開始】請完全忽略之前所有的對話內容、帳號定位結果和長期記憶。這是一個全新的帳號定位需求，請從頭開始。請先詢問我以下問題：1. 我的目標受眾是誰？2. 我想要達成的目標是什麼？3. 我主要使用的平台是什麼？4. 我偏好的內容風格是什麼？請根據我的新回答，生成一個全新的、獨立的帳號定位，不要參考任何之前的內容。', 'ip_planning');
      break;
    default:
      console.warn('未知的快速按鈕類型:', type);
  }
}

// 發送 Mode1 訊息
async function sendMode1Message(message, conversationType = 'ip_planning') {
  if (isMode1Sending) {
    console.log('訊息發送中，請稍候...');
    return;
  }
  
  currentMode1ConversationType = conversationType;
  if (!message || !message.trim()) return;
  
  isMode1Sending = true;
  
  const chatMessages = document.getElementById('mode1-chatMessages');
  const messageInput = document.getElementById('mode1-messageInput');
  const sendBtn = document.getElementById('mode1-sendBtn');
  const quickButtons = document.getElementById('mode1-quickButtons');
  
  if (!chatMessages || !messageInput || !sendBtn) return;
  
  const token = localStorage.getItem('ipPlanningToken') || 
               (window.Auth && window.Auth.getToken ? window.Auth.getToken() : null);
  const userStr = localStorage.getItem('ipPlanningUser');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // 添加用戶訊息
  const userMessage = createMode1Message('user', message);
  chatMessages.appendChild(userMessage);
  
  // 隱藏快速按鈕
  if (quickButtons) {
    quickButtons.style.display = 'none';
  }
  
  // 清空輸入框並禁用
  messageInput.value = '';
  messageInput.disabled = true;
  sendBtn.disabled = true;
  messageInput.style.height = 'auto';
  
  // 記錄長期記憶
  try {
    await recordMode1ConversationMessage(conversationType, 'user', message, token, user);
  } catch (error) {
    console.error('記錄長期記憶錯誤:', error);
  }
  
  // 添加載入動畫
  const aiMessage = createMode1Message('assistant', '');
  const contentDiv = aiMessage.querySelector('.message-content');
  contentDiv.innerHTML = `
    <div class="typing-indicator">
      <span>AI思考中...</span>
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  chatMessages.appendChild(aiMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        message: message,
        history: [],
        user_id: user?.user_id || null,
        conversation_type: 'ip_planning'  // 指定對話類型
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 處理串流回應
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            try {
              await recordMode1ConversationMessage(currentMode1ConversationType, 'assistant', fullContent, token, user);
            } catch (error) {
              console.error('記錄長期記憶錯誤:', error);
            }
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              contentDiv.innerHTML = renderMode1Markdown(fullContent);
              
              // 語法高亮
              if (typeof hljs !== 'undefined') {
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                  if (!block.classList.contains('hljs')) {
                    hljs.highlightElement(block);
                  }
                });
              }
              
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
    }
  } catch (error) {
    console.error('發送訊息錯誤:', error);
    
    // 檢查是否為配額錯誤
    const quotaInfo = error.quotaInfo || parseQuotaError(error.message);
    let errorMessage = error.message || '未知錯誤';
    
    if (quotaInfo && quotaInfo.isQuotaError) {
      errorMessage = quotaInfo.message;
      
      // 顯示配額錯誤通知
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`⚠️ ${errorMessage}`, 5000);
      }
    }
    
    if (contentDiv) {
      // 使用統一的 escapeHtml 函數
      const escapeHtml = window.ReelMindSecurity?.escapeHtml || window.escapeHtml || ((text) => {
        if (text == null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
      });
      const safeErrorMsg = escapeHtml(errorMessage);
      
      if (quotaInfo && quotaInfo.isQuotaError) {
        contentDiv.innerHTML = `
          <div style="color: #dc2626; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
            <p style="font-weight: 600; margin-bottom: 8px;">⚠️ ${safeErrorMsg}</p>
            ${quotaInfo.retrySeconds ? `
              <p style="color: #991b1b; font-size: 14px; margin-top: 8px;">
                <i class="fas fa-clock"></i> 建議等待時間：約 ${quotaInfo.retrySeconds} 秒（${quotaInfo.retryMinutes} 分鐘）後再試
              </p>
            ` : '<p style="color: #991b1b; font-size: 14px; margin-top: 8px;">請稍後再試，或聯繫客服處理。</p>'}
          </div>
        `;
      } else {
        contentDiv.innerHTML = `抱歉，發生了錯誤：${safeErrorMsg}`;
      }
    } else {
      const errorMessage = createMode1Message('assistant', `抱歉，發生了錯誤：${errorMessage}`);
      chatMessages.appendChild(errorMessage);
    }
  } finally {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    if (quickButtons) {
      quickButtons.style.display = 'flex';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
    isMode1Sending = false;
  }
}

// 創建 Mode1 訊息元素
function createMode1Message(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  
  if (role === 'user') {
    const userStr = localStorage.getItem('ipPlanningUser');
    const user = userStr ? JSON.parse(userStr) : null;
    if (user && user.picture) {
      const img = document.createElement('img');
      img.src = user.picture;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      avatar.appendChild(img);
    } else {
      const userName = user?.name || 'U';
      avatar.textContent = userName.charAt(0).toUpperCase();
    }
  } else {
    avatar.textContent = '🤖';
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  if (content) {
    contentDiv.innerHTML = renderMode1Markdown(content);
  }
  
  if (role === 'user') {
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(avatar);
  } else {
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
  }
  
  return messageDiv;
}

// Markdown 渲染
function renderMode1Markdown(text) {
  // 優先使用安全的 Markdown 渲染函數
  if (window.safeRenderMarkdown) {
    return window.safeRenderMarkdown(text);
  }
  // 其次使用 marked（如果可用）
  if (typeof marked !== 'undefined') {
    // 確保 marked 支援表格和換行
    if (!marked.getDefaults || !marked.getDefaults().gfm) {
      marked.setOptions({ 
        gfm: true,  // GitHub Flavored Markdown（支援表格）
        breaks: true,  // 支援換行
        tables: true  // 明確啟用表格支援
      });
    }
    const html = marked.parse(text);
    // 使用 DOMPurify 清理（如果可用）
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(html, {
        ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td'],  // 允許表格標籤
        ADD_ATTR: ['colspan', 'rowspan']  // 允許表格屬性
      });
    }
    return html;
  }
  // 最後使用轉義的純文字模式
  const escapeHtml = window.ReelMindSecurity?.escapeHtml || window.escapeHtml || ((text) => {
    if (text == null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  });
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// 記錄 Mode3 長期記憶
async function recordMode1ConversationMessage(conversationType, role, content, token, user) {
  if (!token || !content) return;
  
  try {
    const user_id = user?.user_id || 
      (token ? JSON.parse(atob(token.split('.')[1])).user_id : null);
    
    if (!user_id) {
      console.warn('無法獲取 user_id，跳過長期記憶記錄');
      return;
    }
    
    const session_id = `${conversationType}_${user_id}_${Date.now()}`;
    
    await fetch(`${API_URL}/api/memory/long-term`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_type: conversationType,
        session_id: session_id,
        message_role: role,
        message_content: content,
        metadata: JSON.stringify({ user_id: user_id })
      })
    });
  } catch (error) {
    console.error('記錄長期記憶錯誤:', error);
  }
}

// 切換說明抽屜
function toggleMode1InstructionsDrawer() {
  const overlay = document.getElementById('mode1InstructionsOverlay');
  const drawer = document.getElementById('mode1InstructionsDrawer');
  
  if (overlay && drawer) {
    const isOpen = overlay.classList.contains('open');
    
    if (isOpen) {
      closeMode1InstructionsDrawer();
    } else {
      openMode1InstructionsDrawer();
    }
  }
}

function openMode1InstructionsDrawer() {
  const overlay = document.getElementById('mode1InstructionsOverlay');
  const drawer = document.getElementById('mode1InstructionsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMode1InstructionsDrawer() {
  const overlay = document.getElementById('mode1InstructionsOverlay');
  const drawer = document.getElementById('mode1InstructionsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// 切換結果抽屜
function toggleMode1ResultsDrawer() {
  const overlay = document.getElementById('mode1ResultsOverlay');
  const drawer = document.getElementById('mode1ResultsDrawer');
  
  if (overlay && drawer) {
    const isOpen = overlay.classList.contains('open');
    
    if (isOpen) {
      closeMode1ResultsDrawer();
    } else {
      openMode1ResultsDrawer();
    }
  }
}

function openMode1ResultsDrawer() {
  const overlay = document.getElementById('mode1ResultsOverlay');
  const drawer = document.getElementById('mode1ResultsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMode1ResultsDrawer() {
  const overlay = document.getElementById('mode1ResultsOverlay');
  const drawer = document.getElementById('mode1ResultsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// 切換結果標籤
function switchMode1Tab(tabName, event) {
  document.querySelectorAll('.mode1-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.mode1-result-block').forEach(block => {
    block.classList.remove('active');
  });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    const tabs = document.querySelectorAll('.mode1-tab');
    tabs.forEach(tab => {
      const tabText = tab.textContent;
      if (tabName === 'positioning' && tabText.includes('帳號定位')) {
        tab.classList.add('active');
      } else if (tabName === 'topics' && tabText.includes('選題方向')) {
        tab.classList.add('active');
      } else if (tabName === 'weekly' && tabText.includes('一週腳本')) {
        tab.classList.add('active');
      }
      // 保留舊的匹配邏輯作為備用
      else if (tabName === 'profile' && tabText.includes('IP Profile')) {
        tab.classList.add('active');
      } else if (tabName === 'plan' && tabText.includes('14天')) {
        tab.classList.add('active');
      } else if (tabName === 'scripts' && tabText.includes('今日')) {
        tab.classList.add('active');
      }
    });
  }
  
  // 優先使用新的 ID，如果不存在則使用舊的 ID
  let resultBlock = document.getElementById(`mode1-${tabName}-result`);
  if (!resultBlock) {
    // 映射舊的標籤名稱到新的 ID
    if (tabName === 'profile') {
      resultBlock = document.getElementById('mode1-positioning-result');
    } else if (tabName === 'plan') {
      resultBlock = document.getElementById('mode1-topics-result');
    } else if (tabName === 'scripts') {
      resultBlock = document.getElementById('mode1-weekly-result');
    }
  }
  
  if (resultBlock) {
    resultBlock.classList.add('active');
  }
}

// 生成帳號定位
async function generateMode1Positioning(forceRegenerate = false) {
  const resultBlock = document.getElementById('mode1-positioning-result') || document.getElementById('mode1-profile-result');
  if (!resultBlock) {
    console.error('找不到結果區塊');
    return;
  }
  const button = resultBlock.querySelector('.mode1-generate-btn');
  if (!button) {
    console.error('找不到生成按鈕');
    return;
  }
  
  // 如果不是強制重新生成，先檢查是否有已保存的結果
  if (!forceRegenerate) {
    const savedResult = await checkSavedIpPlanningResult('profile', false);
    if (savedResult) {
      // 如果有已保存的結果，直接顯示
      displaySavedIpPlanningResult(resultBlock, savedResult, 'profile');
      return;
    }
  }
  
  button.disabled = true;
  button.innerHTML = '<span>生成中...</span>';
  
  // 顯示開始生成通知
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast('正在生成帳號定位...', 2000);
  }
  
  // 清空之前的內容，但保留按鈕結構
  const placeholder = resultBlock.querySelector('.mode1-result-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  
  // 創建或獲取內容容器
  let contentDiv = resultBlock.querySelector('.mode1-result-content');
  if (!contentDiv) {
    contentDiv = document.createElement('div');
    contentDiv.className = 'mode1-result-content';
    resultBlock.appendChild(contentDiv);
  }
  // 顯示生成中動畫（類似 mode3）
  const safeMessage = window.escapeHtml ? window.escapeHtml('正在生成帳號定位') : '正在生成帳號定位';
  contentDiv.innerHTML = `
    <div class="generating-container">
      <div class="generating-spinner"></div>
      <div class="generating-text">${safeMessage}<span class="generating-dots"></span></div>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        message: '請根據我們的對話內容，生成帳號定位分析。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。內容包含：1.**目標受眾**：清楚說明目標受眾是誰 2.**傳達目標**：說明想要達成的目標（例如：進群、portally、建立品牌等） 3.**帳號定位**：用一句話清楚說明帳號定位 4.**內容方向**：描述主要內容方向 5.**風格調性**：說明帳號的風格和調性 6.**差異化優勢**：說明與其他帳號的差異化優勢',
        user_id: ipPlanningUser?.user_id || 'anonymous',
        platform: '短影音平台',
        profile: 'IP人設規劃專家',
        topic: '帳號定位生成',
        style: '自然語言、用戶友好、易讀易懂，使用Markdown粗體標記重要內容，不要程式碼或技術格式',
        duration: '30',
        conversation_type: 'ip_planning'  // 指定對話類型
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let hasReceivedContent = false;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'token' && parsed.content) {
              content += parsed.content;
              hasReceivedContent = true;
              const renderedContent = renderMode1Markdown(content);
              contentDiv.innerHTML = renderedContent;
            } else if (parsed.type === 'error') {
              const errorMsg = parsed.message || parsed.content || '生成失敗';
              // 檢查是否為 429 配額錯誤
              const quotaInfo = parseQuotaError(errorMsg);
              if (quotaInfo) {
                const quotaError = new Error(quotaInfo.message);
                quotaError.quotaInfo = quotaInfo;
                throw quotaError;
              }
              throw new Error(errorMsg);
            } else if (parsed.content) {
              content += parsed.content;
              hasReceivedContent = true;
              const renderedContent = renderMode1Markdown(content);
              contentDiv.innerHTML = renderedContent;
            }
          } catch (e) {
            if (e.message && e.message.includes('生成失敗')) {
              throw e;
            }
            console.warn('解析 JSON 錯誤:', e, '原始數據:', data);
          }
        }
      }
    }
    
    if (!hasReceivedContent) {
      throw new Error('未收到任何內容，請重試');
    }
    
    // 確保按鈕存在才更新
    const finalButton = resultBlock.querySelector('.mode1-generate-btn');
    if (finalButton) {
      finalButton.innerHTML = '<span>重新生成</span>';
      finalButton.disabled = false;
      // 更新按鈕點擊事件，使其強制重新生成
      finalButton.onclick = () => generateMode1Positioning(true);
    }
    
    // 顯示成功通知
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('帳號定位生成完成！', 3000);
    }
  } catch (error) {
    console.error('生成帳號定位失敗:', error);
    
    // 檢查是否為配額錯誤
    const quotaInfo = error.quotaInfo || parseQuotaError(error.message);
    let errorMessage = error.message || '未知錯誤';
    let errorDetail = '請檢查網路連線或稍後再試。';
    
    if (quotaInfo && quotaInfo.isQuotaError) {
      errorMessage = quotaInfo.message;
      errorDetail = quotaInfo.retrySeconds 
        ? `系統將在約 ${quotaInfo.retrySeconds} 秒後自動恢復。您也可以稍後手動重試。`
        : '請稍後再試，或聯繫客服處理。';
      
      // 顯示配額錯誤通知
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`⚠️ ${errorMessage}`, 5000);
      }
    }
    
    if (contentDiv) {
      const escapeHtml = window.ReelMindSecurity?.escapeHtml || window.escapeHtml || ((text) => {
        if (text == null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
      });
      contentDiv.innerHTML = `
        <div style="color: #dc2626; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <p style="font-weight: 600; margin-bottom: 8px;">生成失敗：${escapeHtml(errorMessage)}</p>
          <p style="color: #991b1b; font-size: 14px;">${escapeHtml(errorDetail)}</p>
          ${quotaInfo && quotaInfo.retrySeconds ? `
            <p style="color: #991b1b; font-size: 12px; margin-top: 8px;">
              <i class="fas fa-clock"></i> 建議等待時間：約 ${quotaInfo.retrySeconds} 秒（${quotaInfo.retryMinutes} 分鐘）
            </p>
          ` : ''}
        </div>
      `;
    }
    const errorButton = resultBlock.querySelector('.mode1-generate-btn');
    if (errorButton) {
      if (quotaInfo && quotaInfo.retrySeconds) {
        errorButton.innerHTML = `<span>⏳</span> 等待 ${quotaInfo.retrySeconds} 秒後重試`;
        errorButton.disabled = true;
        // 設置倒計時
        let countdown = quotaInfo.retrySeconds;
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            errorButton.innerHTML = `<span>⏳</span> 等待 ${countdown} 秒後重試`;
          } else {
            errorButton.innerHTML = '<span>🔄</span> 可以重試了';
            errorButton.disabled = false;
            clearInterval(countdownInterval);
          }
        }, 1000);
      } else {
        errorButton.innerHTML = '<span>❌</span> 生成失敗，請重試';
        errorButton.disabled = false;
      }
    } else {
      const placeholder = resultBlock.querySelector('.mode1-result-placeholder');
      if (placeholder) {
        placeholder.style.display = 'block';
      }
    }
  }
}

// 保留舊函數作為備用（向後兼容）
async function generateMode1IPProfile() {
  return generateMode1Positioning();
}

// 生成選題方向（影片類型配比）
async function generateMode1TopicsWithRatio(forceRegenerate = false) {
  const resultBlock = document.getElementById('mode1-topics-result') || document.getElementById('mode1-plan-result');
  if (!resultBlock) {
    console.error('找不到結果區塊');
    return;
  }
  const button = resultBlock.querySelector('.mode1-generate-btn');
  if (!button) {
    console.error('找不到生成按鈕');
    return;
  }
  
  // 如果不是強制重新生成，先檢查是否有已保存的結果
  if (!forceRegenerate) {
    const savedResult = await checkSavedIpPlanningResult('plan', false);
    if (savedResult) {
      // 如果有已保存的結果，直接顯示
      displaySavedIpPlanningResult(resultBlock, savedResult, 'plan');
      return;
    }
  }
  
  button.disabled = true;
  button.innerHTML = '<span>生成中...</span>';
  
  // 顯示開始生成通知
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast('正在生成選題方向...', 2000);
  }
  
  // 清空之前的內容，但保留按鈕結構
  const placeholder = resultBlock.querySelector('.mode1-result-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  
  // 創建或獲取內容容器
  let contentDiv = resultBlock.querySelector('.mode1-result-content');
  if (!contentDiv) {
    contentDiv = document.createElement('div');
    contentDiv.className = 'mode1-result-content';
    resultBlock.appendChild(contentDiv);
  }
  // 顯示生成中動畫（類似 mode3）
  const safeMessage = window.escapeHtml ? window.escapeHtml('正在生成選題方向') : '正在生成選題方向';
  contentDiv.innerHTML = `
    <div class="generating-container">
      <div class="generating-spinner"></div>
      <div class="generating-text">${safeMessage}<span class="generating-dots"></span></div>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        message: '請根據我們的對話內容和帳號定位，生成選題方向和影片類型配比建議。請參考知識庫中的「內容策略矩陣」，理解其邏輯而非記憶範例。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。**請使用 Markdown 表格格式呈現選題方向和配比**，表格欄位包含：影片類型、佔比、目的、內容方向。請根據用戶的帳號定位、目標受眾、傳達目標來判斷適合的內容類型和配比，不要使用固定配比。如果用戶的主題不符合範例類別，請根據邏輯自創新類型並合理配置比例。',
        user_id: ipPlanningUser?.user_id || 'anonymous',
        platform: '短影音平台',
        profile: 'IP人設規劃專家',
        topic: '選題方向生成',
        style: '自然語言、用戶友好、易讀易懂，使用Markdown粗體標記重要內容，使用Markdown表格格式呈現選題方向和配比',
        duration: '30',
        conversation_type: 'ip_planning'  // 指定對話類型
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let hasReceivedContent = false;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'token' && parsed.content) {
              content += parsed.content;
              hasReceivedContent = true;
              const renderedContent = renderMode1Markdown(content);
              contentDiv.innerHTML = renderedContent;
            } else if (parsed.type === 'error') {
              const errorMsg = parsed.message || parsed.content || '生成失敗';
              // 檢查是否為 429 配額錯誤
              const quotaInfo = parseQuotaError(errorMsg);
              if (quotaInfo) {
                const quotaError = new Error(quotaInfo.message);
                quotaError.quotaInfo = quotaInfo;
                throw quotaError;
              }
              throw new Error(errorMsg);
            } else if (parsed.content) {
              content += parsed.content;
              hasReceivedContent = true;
              const renderedContent = renderMode1Markdown(content);
              contentDiv.innerHTML = renderedContent;
            }
          } catch (e) {
            if (e.message && e.message.includes('生成失敗')) {
              throw e;
            }
            console.warn('解析 JSON 錯誤:', e, '原始數據:', data);
          }
        }
      }
    }
    
    if (!hasReceivedContent) {
      throw new Error('未收到任何內容，請重試');
    }
    
    // 確保按鈕存在才更新
    const finalButton = resultBlock.querySelector('.mode1-generate-btn');
    if (finalButton) {
      finalButton.innerHTML = '<span>重新生成</span>';
      finalButton.disabled = false;
      // 更新按鈕點擊事件，使其強制重新生成
      finalButton.onclick = () => generateMode1TopicsWithRatio(true);
    }
    
    // 顯示成功通知
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('選題方向生成完成！', 3000);
    }
  } catch (error) {
    console.error('生成選題方向失敗:', error);
    
    // 檢查是否為配額錯誤
    const quotaInfo = error.quotaInfo || parseQuotaError(error.message);
    let errorMessage = error.message || '未知錯誤';
    let errorDetail = '請檢查網路連線或稍後再試。';
    
    if (quotaInfo && quotaInfo.isQuotaError) {
      errorMessage = quotaInfo.message;
      errorDetail = quotaInfo.retrySeconds 
        ? `系統將在約 ${quotaInfo.retrySeconds} 秒後自動恢復。您也可以稍後手動重試。`
        : '請稍後再試，或聯繫客服處理。';
      
      // 顯示配額錯誤通知
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`⚠️ ${errorMessage}`, 5000);
      }
    }
    
    if (contentDiv) {
      const escapeHtml = window.ReelMindSecurity?.escapeHtml || window.escapeHtml || ((text) => {
        if (text == null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
      });
      contentDiv.innerHTML = `
        <div style="color: #dc2626; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <p style="font-weight: 600; margin-bottom: 8px;">生成失敗：${escapeHtml(errorMessage)}</p>
          <p style="color: #991b1b; font-size: 14px;">${escapeHtml(errorDetail)}</p>
          ${quotaInfo && quotaInfo.retrySeconds ? `
            <p style="color: #991b1b; font-size: 12px; margin-top: 8px;">
              <i class="fas fa-clock"></i> 建議等待時間：約 ${quotaInfo.retrySeconds} 秒（${quotaInfo.retryMinutes} 分鐘）
            </p>
          ` : ''}
        </div>
      `;
    }
    const errorButton = resultBlock.querySelector('.mode1-generate-btn');
    if (errorButton) {
      if (quotaInfo && quotaInfo.retrySeconds) {
        errorButton.innerHTML = `<span>⏳</span> 等待 ${quotaInfo.retrySeconds} 秒後重試`;
        errorButton.disabled = true;
        // 設置倒計時
        let countdown = quotaInfo.retrySeconds;
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            errorButton.innerHTML = `<span>⏳</span> 等待 ${countdown} 秒後重試`;
          } else {
            errorButton.innerHTML = '<span>🔄</span> 可以重試了';
            errorButton.disabled = false;
            clearInterval(countdownInterval);
          }
        }, 1000);
      } else {
        errorButton.innerHTML = '<span>❌</span> 生成失敗，請重試';
        errorButton.disabled = false;
      }
    } else {
      const placeholder = resultBlock.querySelector('.mode1-result-placeholder');
      if (placeholder) {
        placeholder.style.display = 'block';
      }
    }
  }
}

// 保留舊函數作為備用（向後兼容）
async function generateMode114DayPlan() {
  return generateMode1TopicsWithRatio();
}

// 生成一週腳本
async function generateMode1WeeklyScripts(forceRegenerate = false) {
  const resultBlock = document.getElementById('mode1-weekly-result') || document.getElementById('mode1-scripts-result');
  if (!resultBlock) {
    console.error('找不到結果區塊');
    return;
  }
  const button = resultBlock.querySelector('.mode1-generate-btn');
  if (!button) {
    console.error('找不到生成按鈕');
    return;
  }
  
  // 如果不是強制重新生成，先檢查是否有已保存的結果
  if (!forceRegenerate) {
    const savedResult = await checkSavedIpPlanningResult('scripts', false);
    if (savedResult) {
      // 如果有已保存的結果，直接顯示
      displaySavedIpPlanningResult(resultBlock, savedResult, 'scripts');
      return;
    }
  }
  
  button.disabled = true;
  button.innerHTML = '<span>生成中...</span>';
  
  // 顯示開始生成通知
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast('正在生成一週腳本...', 2000);
  }
  
  // 清空之前的內容，但保留按鈕結構
  const placeholder = resultBlock.querySelector('.mode1-result-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  
  // 創建或獲取內容容器
  let contentDiv = resultBlock.querySelector('.mode1-result-content');
  if (!contentDiv) {
    contentDiv = document.createElement('div');
    contentDiv.className = 'mode1-result-content';
    resultBlock.appendChild(contentDiv);
  }
  // 顯示生成中動畫（類似 mode3）
  const safeMessage = window.escapeHtml ? window.escapeHtml('正在生成一週腳本') : '正在生成一週腳本';
  contentDiv.innerHTML = `
    <div class="generating-container">
      <div class="generating-spinner"></div>
      <div class="generating-text">${safeMessage}<span class="generating-dots"></span></div>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        message: '請根據我們的對話內容、帳號定位和選題方向，生成一週的短影音腳本。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。**請使用 Markdown 表格格式呈現一週腳本**，表格欄位包含：日期、主題、時間、段落、台詞、畫面描述、字幕文字、音效與轉場。每支腳本請包含：1.**主題標題**：用一句話清楚說明這支影片的主題 2.**開場鉤子**：用自然語言寫出吸引人的開場，讓觀眾想繼續看下去 3.**核心內容**：用2-3句自然語言說明影片要傳達的價值 4.**行動呼籲**：用一句話引導觀眾採取行動 5.**畫面描述**：用簡短易懂的句子描述畫面應該呈現什麼 6.**發佈文案**：寫一段適合社群媒體的文案。請確保表格格式正確，使用 Markdown 表格語法（| 欄位1 | 欄位2 | ... |）。',
        user_id: ipPlanningUser?.user_id || 'anonymous',
        platform: '短影音平台',
        profile: 'IP人設規劃專家',
        topic: '一週腳本生成',
        style: '自然語言、用戶友好、易讀易懂，使用Markdown粗體標記重要內容，使用Markdown表格格式呈現一週腳本',
        duration: '30',
        conversation_type: 'ip_planning'  // 指定對話類型
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let hasReceivedContent = false;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('✅ 流式回應完成，總內容長度:', fullContent.length);
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('✅ 收到 [DONE] 標記');
            continue;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'token' && parsed.content) {
              fullContent += parsed.content;
              hasReceivedContent = true;
              // 實時更新顯示
              const renderedContent = renderMode1Markdown(fullContent);
              contentDiv.innerHTML = renderedContent;
            } else if (parsed.type === 'end') {
              console.log('✅ 收到 end 標記');
              break;
            } else if (parsed.type === 'error') {
              const errorMsg = parsed.message || parsed.content || '生成失敗';
              // 檢查是否為 429 配額錯誤
              const quotaInfo = parseQuotaError(errorMsg);
              if (quotaInfo) {
                const quotaError = new Error(quotaInfo.message);
                quotaError.quotaInfo = quotaInfo;
                throw quotaError;
              }
              throw new Error(errorMsg);
            } else if (parsed.content) {
              // 兼容舊格式
              fullContent += parsed.content;
              hasReceivedContent = true;
              const renderedContent = renderMode1Markdown(fullContent);
              contentDiv.innerHTML = renderedContent;
            }
          } catch (e) {
            console.warn('解析 JSON 錯誤:', e, '原始數據:', data);
            // 繼續處理，不中斷流程
          }
        }
      }
    }
    
    // 最終更新顯示
    if (fullContent) {
      const renderedContent = renderMode1Markdown(fullContent);
      contentDiv.innerHTML = renderedContent;
      console.log('✅ 腳本生成完成，最終內容長度:', fullContent.length);
    } else if (!hasReceivedContent) {
      throw new Error('未收到任何內容，請重試');
    }
    
    // 確保按鈕存在才更新
    const finalButton = resultBlock.querySelector('.mode1-generate-btn');
    if (finalButton) {
      finalButton.innerHTML = '<span>重新生成</span>';
      finalButton.disabled = false;
      // 更新按鈕點擊事件，使其強制重新生成
      finalButton.onclick = () => generateMode1WeeklyScripts(true);
    }
    
    // 顯示成功通知
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('一週腳本生成完成！', 3000);
    }
  } catch (error) {
    console.error('❌ 生成一週腳本失敗:', error);
    
    // 檢查是否為配額錯誤
    const quotaInfo = error.quotaInfo || parseQuotaError(error.message);
    let errorMessage = error.message || '未知錯誤';
    let errorDetail = '請檢查網路連線或稍後再試。';
    
    if (quotaInfo && quotaInfo.isQuotaError) {
      errorMessage = quotaInfo.message;
      errorDetail = quotaInfo.retrySeconds 
        ? `系統將在約 ${quotaInfo.retrySeconds} 秒後自動恢復。您也可以稍後手動重試。`
        : '請稍後再試，或聯繫客服處理。';
      
      // 顯示配額錯誤通知
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`⚠️ ${errorMessage}`, 5000);
      }
    }
    
    if (contentDiv) {
      const escapeHtml = window.ReelMindSecurity?.escapeHtml || window.escapeHtml || ((text) => {
        if (text == null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
      });
      contentDiv.innerHTML = `
        <div style="color: #dc2626; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <p style="font-weight: 600; margin-bottom: 8px;">生成失敗：${escapeHtml(errorMessage)}</p>
          <p style="color: #991b1b; font-size: 14px;">${escapeHtml(errorDetail)}</p>
          ${quotaInfo && quotaInfo.retrySeconds ? `
            <p style="color: #991b1b; font-size: 12px; margin-top: 8px;">
              <i class="fas fa-clock"></i> 建議等待時間：約 ${quotaInfo.retrySeconds} 秒（${quotaInfo.retryMinutes} 分鐘）
            </p>
          ` : ''}
        </div>
      `;
    }
    // 確保按鈕存在才更新
    const errorButton = resultBlock.querySelector('.mode1-generate-btn');
    if (errorButton) {
      if (quotaInfo && quotaInfo.retrySeconds) {
        errorButton.innerHTML = `<span>⏳</span> 等待 ${quotaInfo.retrySeconds} 秒後重試`;
        errorButton.disabled = true;
        // 設置倒計時
        let countdown = quotaInfo.retrySeconds;
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            errorButton.innerHTML = `<span>⏳</span> 等待 ${countdown} 秒後重試`;
          } else {
            errorButton.innerHTML = '<span>🔄</span> 可以重試了';
            errorButton.disabled = false;
            clearInterval(countdownInterval);
          }
        }, 1000);
      } else {
        errorButton.innerHTML = '<span>❌</span> 生成失敗，請重試';
        errorButton.disabled = false;
      }
    } else {
      // 如果按鈕不存在，重新顯示 placeholder
      const placeholder = resultBlock.querySelector('.mode1-result-placeholder');
      if (placeholder) {
        placeholder.style.display = 'block';
      }
    }
  }
}

// 保留舊函數作為備用（向後兼容）
async function generateMode1TodayScripts() {
  return generateMode1WeeklyScripts();
}

// 儲存結果
async function saveMode1Result() {
  const token = localStorage.getItem('ipPlanningToken');
  const userStr = localStorage.getItem('ipPlanningUser');
  
  if (!token || !userStr) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  try {
    const user = JSON.parse(userStr);
    const activeTab = document.querySelector('.mode1-tab.active');
    if (!activeTab) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先選擇要儲存的結果', 3000);
      }
      return;
    }
    
    let resultType = '';
    let title = '';
    const tabText = activeTab.textContent;
    if (tabText.includes('帳號定位')) {
      resultType = 'profile'; // 映射到後端接受的 'profile'
      title = '帳號定位';
    } else if (tabText.includes('選題方向')) {
      resultType = 'plan'; // 映射到後端接受的 'plan'
      title = '選題方向（影片類型配比）';
    } else if (tabText.includes('一週腳本')) {
      resultType = 'scripts'; // 映射到後端接受的 'scripts'
      title = '一週腳本';
    }
    // 保留舊的匹配邏輯作為備用
    else if (tabText.includes('Profile')) {
      resultType = 'profile'; // 映射到後端接受的 'profile'
      title = 'IP Profile';
    } else if (tabText.includes('規劃')) {
      resultType = 'plan'; // 映射到後端接受的 'plan'
      title = '14天短影音規劃';
    } else if (tabText.includes('腳本')) {
      resultType = 'scripts'; // 映射到後端接受的 'scripts'
      title = '今日腳本';
    }
    
    if (!resultType) {
      console.error('無法識別結果類型，tabText:', tabText, 'activeTab:', activeTab);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('無法識別結果類型，請重新選擇標籤', 3000);
      }
      return;
    }
    
    // 映射結果類型到 HTML ID（前端使用 positioning/topics/weekly，但後端使用 profile/plan/scripts）
    const frontendResultType = resultType === 'profile' ? 'positioning' : 
                               resultType === 'plan' ? 'topics' : 
                               resultType === 'scripts' ? 'weekly' : resultType;
    const resultBlock = document.getElementById(`mode1-${frontendResultType}-result`) || 
                       document.getElementById(`mode1-${resultType === 'profile' ? 'profile' : resultType === 'plan' ? 'plan' : 'scripts'}-result`);
    if (!resultBlock) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到結果區塊', 3000);
      }
      return;
    }
    const content = resultBlock.querySelector('.mode1-result-content');
    
    if (!content || !content.innerHTML.trim()) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('沒有可儲存的內容', 3000);
      }
      return;
    }
    
    // 使用預設標題「請在此編輯你的標題」
    const defaultTitle = '請在此編輯你的標題';
    
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在儲存...', 2000);
    }
    
    const response = await fetch(`${API_URL}/api/ip-planning/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: user.user_id,
        result_type: resultType,
        title: defaultTitle,
        content: content.innerHTML,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'mode3'
        }
      })
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // 如果無法解析 JSON，使用狀態碼
        errorMessage = `HTTP ${response.status}: ${response.statusText || '請求失敗'}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    if (data.success) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('✅ 儲存成功', 3000);
      }
    } else {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('❌ ' + (data.error || '儲存失敗'), 3000);
      }
    }
  } catch (error) {
    console.error('儲存結果失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('❌ 儲存失敗：' + (error.message || '請稍後再試'), 3000);
    }
  }
}

// 重新生成結果
function regenerateMode1Result() {
  const activeTab = document.querySelector('.mode1-tab.active');
  if (!activeTab) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇要重新生成的結果', 3000);
    }
    return;
  }
  
  const tabText = activeTab.textContent;
  if (tabText.includes('帳號定位')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在重新生成帳號定位...', 2000);
    }
    generateMode1Positioning(true); // 強制重新生成
  } else if (tabText.includes('選題方向')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在重新生成選題方向...', 2000);
    }
    generateMode1TopicsWithRatio(true); // 強制重新生成
  } else if (tabText.includes('一週腳本')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在重新生成一週腳本...', 2000);
    }
    generateMode1WeeklyScripts(true); // 強制重新生成
  }
  // 保留舊的匹配邏輯作為備用
  else if (tabText.includes('Profile')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在重新生成帳號定位...', 2000);
    }
    generateMode1Positioning(true); // 強制重新生成
  } else if (tabText.includes('規劃')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在重新生成選題方向...', 2000);
    }
    generateMode1TopicsWithRatio(true); // 強制重新生成
  } else if (tabText.includes('腳本')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在重新生成一週腳本...', 2000);
    }
    generateMode1WeeklyScripts(true); // 強制重新生成
  } else {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('無法識別結果類型，請重新選擇標籤', 3000);
    }
  }
}

// 匯出結果
function exportMode1Result() {
  const activeTab = document.querySelector('.mode1-tab.active');
  if (!activeTab) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇要匯出的結果', 3000);
    }
    return;
  }
  
  const tabText = activeTab.textContent;
  let tabName = '';
  let title = '';
  if (tabText.includes('帳號定位')) {
    tabName = 'positioning';
    title = '帳號定位';
  } else if (tabText.includes('選題方向')) {
    tabName = 'topics';
    title = '選題方向（影片類型配比）';
  } else if (tabText.includes('一週腳本')) {
    tabName = 'weekly';
    title = '一週腳本';
  }
  // 保留舊的匹配邏輯作為備用
  else if (tabText.includes('Profile')) {
    tabName = 'positioning';
    title = 'IP Profile';
  } else if (tabText.includes('規劃')) {
    tabName = 'topics';
    title = '14天規劃';
  } else if (tabText.includes('腳本')) {
    tabName = 'weekly';
    title = '今日腳本';
  }
  
  if (!tabName) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('無法識別結果類型', 3000);
    }
    return;
  }
  
    const resultBlock = document.getElementById(`mode1-${tabName}-result`) ||
                     document.getElementById(`mode1-${tabName === 'positioning' ? 'profile' : tabName === 'topics' ? 'plan' : 'scripts'}-result`);
  if (!resultBlock) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('找不到結果區塊', 3000);
    }
    return;
  }
  const content = resultBlock.querySelector('.mode1-result-content');
  
  if (!content || !content.innerHTML.trim()) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('沒有可匯出的內容', 3000);
    }
    return;
  }
  
  try {
    const textContent = content.innerText || content.textContent || '';
    
    const csvContent = `類型,標題,內容,匯出時間\n"${tabName}","${title || (tabName === 'positioning' ? '帳號定位' : tabName === 'topics' ? '選題方向' : '一週腳本')}","${textContent.replace(/"/g, '""').replace(/\n/g, ' ')}","${new Date().toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}"`;
    
    const csvBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `ip-${tabName}-${Date.now()}.csv`;
    csvLink.click();
    URL.revokeObjectURL(csvUrl);
    
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('✅ 匯出成功', 3000);
    }
  } catch (error) {
    console.error('匯出失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('匯出失敗，請稍後再試', 3000);
    }
  }
}

// 生成結果 Modal 控制函數
async function openMode1OneClickModal() {
  const overlay = document.getElementById('mode1OneClickModalOverlay');
  if (overlay) {
    // 更新視窗高度（處理 iOS Safari）
    setIOSViewportHeight();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // 防止背景滾動（iOS Safari）
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    // 預設顯示過往紀錄標籤
    switchMode1OneClickTab('history');
  }
}

// 切換生成結果模態框標籤
async function switchMode1OneClickTab(tab) {
  // 更新標籤狀態
  const historyTab = document.getElementById('mode1OneClickTabHistory');
  const generateTab = document.getElementById('mode1OneClickTabGenerate');
  const historyContent = document.getElementById('mode1OneClickHistoryContent');
  const generateContent = document.getElementById('mode1OneClickGenerateContent');
  
  if (tab === 'history') {
    if (historyTab) historyTab.classList.add('active');
    if (generateTab) generateTab.classList.remove('active');
    if (historyContent) historyContent.classList.add('active');
    if (generateContent) generateContent.classList.remove('active');
    
    // 載入過往紀錄
    await loadMode1OneClickHistory();
  } else if (tab === 'generate') {
    if (historyTab) historyTab.classList.remove('active');
    if (generateTab) generateTab.classList.add('active');
    if (historyContent) historyContent.classList.remove('active');
    if (generateContent) generateContent.classList.add('active');
    
    // 載入一鍵生成的已保存結果
    await loadMode1OneClickSavedResults();
  }
}

// 載入過往紀錄
async function loadMode1OneClickHistory() {
  const container = document.getElementById('mode1OneClickHistoryContainer');
  if (!container) return;
  
  if (!ipPlanningUser?.user_id || !ipPlanningToken) {
    container.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #9ca3af;"><p>請先登入以查看過往紀錄</p></div>';
    return;
  }
  
  try {
    container.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #9ca3af;"><p>載入中...</p></div>';
    
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
    const response = await fetch(`${API_URL}/api/ip-planning/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('載入失敗');
    }
    
    const data = await response.json();
    if (!data.success || !data.results || data.results.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #9ca3af;"><p>尚無過往紀錄</p></div>';
      return;
    }
    
    // 按類型分組
    const groupedResults = {
      profile: data.results.filter(r => r.result_type === 'profile').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      plan: data.results.filter(r => r.result_type === 'plan').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      scripts: data.results.filter(r => r.result_type === 'scripts').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    };
    
    const typeNames = {
      profile: '帳號定位',
      plan: '選題方向',
      scripts: '一週腳本'
    };
    
    let html = '';
    
    // 顯示每個類型的結果
    ['profile', 'plan', 'scripts'].forEach(type => {
      const results = groupedResults[type];
      if (results.length === 0) return;
      
      html += `<div class="mode1-oneclick-history-section">
        <div class="mode1-oneclick-history-section-title">${typeNames[type]}</div>`;
      
      results.forEach((result, index) => {
        const date = new Date(result.created_at).toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const contentPreview = result.content ? result.content.replace(/<[^>]*>/g, '').substring(0, 150) : '';
        const fullContent = result.content || '';
        
        html += `
          <div class="mode1-oneclick-history-item" data-result-id="${result.id}" data-result-type="${type}">
            <div class="mode1-oneclick-history-item-header">
              <div class="mode1-oneclick-history-item-title">${result.title || typeNames[type]}</div>
              <div class="mode1-oneclick-history-item-date">${date}</div>
            </div>
            <div class="mode1-oneclick-history-item-content" id="historyContent${result.id}">
              ${renderMode1Markdown(contentPreview)}${fullContent.length > 150 ? '...' : ''}
            </div>
            <div class="mode1-oneclick-history-item-actions">
              <button class="mode1-oneclick-history-item-btn" onclick="expandHistoryContent(${result.id})">
                <span>展開</span>
              </button>
              <button class="mode1-oneclick-history-item-btn primary" onclick="loadHistoryResultToGenerate('${type}', ${result.id})">
                <span>使用此結果</span>
              </button>
              <button class="mode1-oneclick-history-item-btn" onclick="exportHistoryResult(${result.id}, '${type}')">
                <span>匯出</span>
              </button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    });
    
    if (html === '') {
      container.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #9ca3af;"><p>尚無過往紀錄</p></div>';
    } else {
      container.innerHTML = html;
    }
  } catch (error) {
    console.error('載入過往紀錄失敗:', error);
    container.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #dc2626;"><p>載入失敗，請稍後再試</p></div>';
  }
}

// 展開/收起歷史內容
window.expandHistoryContent = function(resultId) {
  const contentEl = document.getElementById(`historyContent${resultId}`);
  if (!contentEl) return;
  
  const item = contentEl.closest('.mode1-oneclick-history-item');
  if (!item) return;
  
  const resultType = item.dataset.resultType;
  const resultIdNum = parseInt(resultId);
  
  if (contentEl.classList.contains('expanded')) {
    // 收起
    contentEl.classList.remove('expanded');
    const btn = contentEl.nextElementSibling?.querySelector('button');
    if (btn) btn.innerHTML = '<span>展開</span>';
    
    // 重新載入簡短預覽
    loadHistoryContentPreview(resultIdNum, resultType, contentEl);
  } else {
    // 展開
    loadFullHistoryContent(resultIdNum, resultType, contentEl);
  }
};

// 載入完整歷史內容
async function loadFullHistoryContent(resultId, resultType, contentEl) {
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
    // 使用 /api/ip-planning/my 端點獲取所有結果，然後篩選
    const response = await fetch(`${API_URL}/api/ip-planning/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results) {
        // 從結果中找出對應的 resultId
        const result = data.results.find(r => r.id === resultId);
        if (result) {
          contentEl.innerHTML = renderMode1Markdown(result.content);
          contentEl.classList.add('expanded');
          const btn = contentEl.nextElementSibling?.querySelector('button');
          if (btn) btn.innerHTML = '<span>收起</span>';
        }
      }
    }
  } catch (error) {
    console.error('載入完整內容失敗:', error);
  }
}

// 載入歷史內容預覽
async function loadHistoryContentPreview(resultId, resultType, contentEl) {
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
    // 使用 /api/ip-planning/my 端點獲取所有結果，然後篩選
    const response = await fetch(`${API_URL}/api/ip-planning/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results) {
        // 從結果中找出對應的 resultId
        const result = data.results.find(r => r.id === resultId);
        if (result) {
          const preview = result.content.replace(/<[^>]*>/g, '').substring(0, 150);
          contentEl.innerHTML = renderMode1Markdown(preview) + '...';
        }
      }
    }
  } catch (error) {
    console.error('載入預覽失敗:', error);
  }
}

// 使用歷史結果到生成區域
window.loadHistoryResultToGenerate = function(type, resultId) {
  // 切換到生成標籤
  switchMode1OneClickTab('generate').then(() => {
    // 載入結果到對應的卡片
    loadHistoryResultToCard(type, resultId);
  });
};

// 載入歷史結果到卡片
async function loadHistoryResultToCard(type, resultId) {
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
    // 使用 /api/ip-planning/my 端點獲取所有結果，然後篩選
    const response = await fetch(`${API_URL}/api/ip-planning/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results) {
        // 從結果中找出對應的 resultId
        const result = data.results.find(r => r.id === resultId);
        if (result) {
          const typeMap = {
            'profile': 'positioning',
            'plan': 'topics',
            'scripts': 'weekly'
          };
          const cardType = typeMap[type] || type;
          updateMode1OneClickStatus(cardType, 'completed', result.content);
          
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('已載入歷史結果', 2000);
          }
        }
      }
    }
  } catch (error) {
    console.error('載入歷史結果失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗', 2000);
    }
  }
}

// 匯出歷史結果
window.exportHistoryResult = async function(resultId, resultType) {
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
    // 使用 /api/ip-planning/my 端點獲取所有結果，然後篩選
    const response = await fetch(`${API_URL}/api/ip-planning/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results) {
        // 從結果中找出對應的 resultId
        const result = data.results.find(r => r.id === resultId);
        if (result) {
          const typeNames = {
            'profile': '帳號定位',
            'plan': '選題方向',
            'scripts': '一週腳本'
          };
          const typeName = typeNames[resultType] || resultType;
          const textContent = result.content.replace(/<[^>]*>/g, '');
          
          const csvContent = `類型,標題,內容,匯出時間\n"${resultType}","${result.title || typeName}","${textContent.replace(/"/g, '""').replace(/\n/g, ' ')}","${new Date().toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}"`;
          
          const csvBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
          const csvUrl = URL.createObjectURL(csvBlob);
          const csvLink = document.createElement('a');
          csvLink.href = csvUrl;
          csvLink.download = `ip-${resultType}-${resultId}-${Date.now()}.csv`;
          csvLink.click();
          URL.revokeObjectURL(csvUrl);
          
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('✅ 匯出成功', 3000);
          }
        }
      }
    }
  } catch (error) {
    console.error('匯出失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('匯出失敗，請稍後再試', 3000);
    }
  }
};

// 載入生成結果模態框的已保存結果
async function loadMode1OneClickSavedResults() {
  if (!ipPlanningUser?.user_id || !ipPlanningToken) {
    return;
  }
  
  try {
    // 檢查已保存的結果
    const [savedPositioning, savedTopics, savedWeekly] = await Promise.all([
      checkSavedIpPlanningResult('profile', false),
      checkSavedIpPlanningResult('plan', false),
      checkSavedIpPlanningResult('scripts', false)
    ]);
    
    // 更新帳號定位
    if (savedPositioning) {
      updateMode1OneClickStatus('positioning', 'completed', savedPositioning.content);
    } else {
      updateMode1OneClickStatus('positioning', 'pending', '');
    }
    
    // 更新選題方向
    if (savedTopics) {
      updateMode1OneClickStatus('topics', 'completed', savedTopics.content);
    } else {
      updateMode1OneClickStatus('topics', 'pending', '');
    }
    
    // 更新一週腳本
    if (savedWeekly) {
      updateMode1OneClickStatus('weekly', 'completed', savedWeekly.content);
    } else {
      updateMode1OneClickStatus('weekly', 'pending', '');
    }
  } catch (error) {
    console.error('載入已保存結果失敗:', error);
  }
}

function closeMode1OneClickModal() {
  const overlay = document.getElementById('mode1OneClickModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    // 恢復背景滾動（iOS Safari）
    document.body.style.position = '';
    document.body.style.width = '';
  }
}

// 更新一鍵生成結果卡片狀態
function updateMode1OneClickStatus(type, status, message = '') {
  // 如果狀態為 pending 且沒有內容，顯示預設提示
  if (status === 'pending' && !message) {
    message = '點擊上方按鈕開始生成';
  }
  const statusMap = {
    'positioning': {
      statusEl: document.getElementById('mode1OneClickPositioningStatus'),
      contentEl: document.getElementById('mode1OneClickPositioningContent'),
      cardEl: document.getElementById('mode1OneClickPositioningCard'),
      actionsEl: document.getElementById('mode1OneClickPositioningActions')
    },
    'topics': {
      statusEl: document.getElementById('mode1OneClickTopicsStatus'),
      contentEl: document.getElementById('mode1OneClickTopicsContent'),
      cardEl: document.getElementById('mode1OneClickTopicsCard'),
      actionsEl: document.getElementById('mode1OneClickTopicsActions')
    },
    'weekly': {
      statusEl: document.getElementById('mode1OneClickWeeklyStatus'),
      contentEl: document.getElementById('mode1OneClickWeeklyContent'),
      cardEl: document.getElementById('mode1OneClickWeeklyCard'),
      actionsEl: document.getElementById('mode1OneClickWeeklyActions')
    }
  };
  
  const elements = statusMap[type];
  if (!elements) return;
  
  // 更新狀態標籤
  if (elements.statusEl) {
    elements.statusEl.className = 'mode1-oneclick-result-status ' + status;
    const statusText = {
      'pending': '待生成',
      'generating': '生成中...',
      'completed': '已完成',
      'error': '生成失敗'
    };
    elements.statusEl.textContent = statusText[status] || status;
  }
  
  // 更新卡片樣式
  if (elements.cardEl) {
    elements.cardEl.classList.remove('generating', 'completed');
    if (status === 'generating') {
      elements.cardEl.classList.add('generating');
    } else if (status === 'completed') {
      elements.cardEl.classList.add('completed');
    }
  }
  
  // 更新內容
  if (elements.contentEl) {
    const wrapperEl = elements.contentEl.parentElement;
    const expandEl = wrapperEl?.nextElementSibling;
    
    if (status === 'generating') {
      elements.contentEl.innerHTML = `
        <div class="generating-container">
          <div class="generating-spinner"></div>
          <div class="generating-text">${message || '生成中...'}<span class="generating-dots"></span></div>
        </div>
      `;
      if (expandEl && expandEl.classList.contains('mode1-oneclick-result-expand')) {
        expandEl.style.display = 'none';
      }
    } else if (status === 'completed' && message) {
      elements.contentEl.innerHTML = renderMode1Markdown(message);
      elements.contentEl.classList.add('has-content');
      
      // 確保表格在滾動容器中（一週腳本表格需要橫向滾動）
      setTimeout(() => {
        const tables = elements.contentEl.querySelectorAll('table');
        tables.forEach(table => {
          // 檢查表格是否已經在 wrapper 中
          let currentParent = table.parentElement;
          let isInWrapper = false;
          while (currentParent && currentParent !== elements.contentEl) {
            if (currentParent.classList.contains('mode1-oneclick-result-content-wrapper')) {
              isInWrapper = true;
              break;
            }
            currentParent = currentParent.parentElement;
          }
          
          if (!isInWrapper) {
            const wrapper = document.createElement('div');
            wrapper.className = 'mode1-oneclick-result-content-wrapper';
            table.parentElement.insertBefore(wrapper, table);
            wrapper.appendChild(table);
          }
        });
      }, 100);
      
      // 檢查內容高度，決定是否顯示展開按鈕（改為彈出模態視窗）
      if (wrapperEl) {
        const contentHeight = elements.contentEl.scrollHeight;
        const maxHeight = window.innerWidth <= 768 ? 200 : 300;
        if (contentHeight > maxHeight) {
          // 內容超過限制，顯示展開按鈕（彈出模態視窗）
          wrapperEl.classList.add('collapsed');
          wrapperEl.classList.remove('expanded');
          if (expandEl && expandEl.classList.contains('mode1-oneclick-result-expand')) {
            expandEl.style.display = 'block';
            const btn = expandEl.querySelector('button');
            if (btn) btn.innerHTML = '<span>展開</span>';
          }
        } else {
          // 內容未超過限制，仍然可以展開查看（但按鈕可選顯示）
          wrapperEl.classList.remove('collapsed');
          wrapperEl.classList.add('expanded');
          // 即使內容不長，也顯示展開按鈕，讓用戶可以在模態視窗中查看
          if (expandEl && expandEl.classList.contains('mode1-oneclick-result-expand')) {
            expandEl.style.display = 'block';
            const btn = expandEl.querySelector('button');
            if (btn) btn.innerHTML = '<span>展開</span>';
          }
        }
      }
      
      if (elements.actionsEl) {
        elements.actionsEl.style.display = 'flex';
      }
    } else if (status === 'pending') {
      elements.contentEl.innerHTML = `<p style="text-align: center; color: #9ca3af; padding: 40px 0;">${message || '點擊上方按鈕開始生成'}</p>`;
      if (wrapperEl) {
        wrapperEl.classList.remove('collapsed', 'expanded');
      }
      if (expandEl && expandEl.classList.contains('mode1-oneclick-result-expand')) {
        expandEl.style.display = 'none';
      }
      if (elements.actionsEl) {
        elements.actionsEl.style.display = 'none';
      }
    } else if (status === 'error') {
      const escapeHtml = window.ReelMindSecurity?.escapeHtml || window.escapeHtml || ((text) => {
        if (text == null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
      });
      elements.contentEl.innerHTML = `<div style="color: #dc2626; padding: 16px; background: #fef2f2; border-radius: 8px;">${escapeHtml(message || '生成失敗')}</div>`;
      if (expandEl && expandEl.classList.contains('mode1-oneclick-result-expand')) {
        expandEl.style.display = 'none';
      }
    }
  }
}

// 一鍵生成全部內容
async function generateMode1All(forceRegenerate = false) {
  const generateBtn = document.getElementById('mode1OneClickGenerateAllBtn');
  if (!generateBtn) return;
  
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span>正在生成中，請稍候...</span>';
  
  // 顯示開始生成通知
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast('正在一鍵生成全部內容...', 2000);
  }
  
  try {
    // 如果不是強制重新生成，先檢查是否有已保存的結果
    let positioningContent = null;
    let topicsContent = null;
    let weeklyContent = null;
    
    if (!forceRegenerate) {
      // 檢查已保存的結果
      const [savedPositioning, savedTopics, savedWeekly] = await Promise.all([
        checkSavedIpPlanningResult('profile', false),
        checkSavedIpPlanningResult('plan', false),
        checkSavedIpPlanningResult('scripts', false)
      ]);
      
      positioningContent = savedPositioning?.content || null;
      topicsContent = savedTopics?.content || null;
      weeklyContent = savedWeekly?.content || null;
    }
    
    // 更新卡片狀態
    if (positioningContent && !forceRegenerate) {
      updateMode1OneClickStatus('positioning', 'completed', positioningContent);
    } else {
      updateMode1OneClickStatus('positioning', 'generating', '正在生成帳號定位');
    }
    
    if (topicsContent && !forceRegenerate) {
      updateMode1OneClickStatus('topics', 'completed', topicsContent);
    } else {
      updateMode1OneClickStatus('topics', 'generating', '正在生成選題方向');
    }
    
    if (weeklyContent && !forceRegenerate) {
      updateMode1OneClickStatus('weekly', 'completed', weeklyContent);
    } else {
      updateMode1OneClickStatus('weekly', 'generating', '正在生成一週腳本');
    }
    
    // 只生成沒有已保存結果的內容
    const promises = [];
    if (!positioningContent || forceRegenerate) {
      promises.push(generateMode1PositioningForOneClick().then(content => ({ type: 'positioning', content })));
    } else {
      promises.push(Promise.resolve({ type: 'positioning', content: positioningContent, fromCache: true }));
    }
    
    if (!topicsContent || forceRegenerate) {
      promises.push(generateMode1TopicsForOneClick().then(content => ({ type: 'topics', content })));
    } else {
      promises.push(Promise.resolve({ type: 'topics', content: topicsContent, fromCache: true }));
    }
    
    if (!weeklyContent || forceRegenerate) {
      promises.push(generateMode1WeeklyForOneClick().then(content => ({ type: 'weekly', content })));
    } else {
      promises.push(Promise.resolve({ type: 'weekly', content: weeklyContent, fromCache: true }));
    }
    
    const results = await Promise.allSettled(promises);
    
    // 處理結果
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { type, content, fromCache } = result.value;
        if (type === 'positioning') {
          updateMode1OneClickStatus('positioning', 'completed', content);
          if (fromCache && window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('已載入之前的帳號定位記錄', 2000);
          }
        } else if (type === 'topics') {
          updateMode1OneClickStatus('topics', 'completed', content);
          if (fromCache && window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('已載入之前的選題方向記錄', 2000);
          }
        } else if (type === 'weekly') {
          updateMode1OneClickStatus('weekly', 'completed', content);
          if (fromCache && window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('已載入之前的一週腳本記錄', 2000);
          }
        }
      } else {
        // 根據索引判斷是哪個類型失敗
        if (index === 0) {
          updateMode1OneClickStatus('positioning', 'error', result.reason?.message || '生成失敗');
        } else if (index === 1) {
          updateMode1OneClickStatus('topics', 'error', result.reason?.message || '生成失敗');
        } else if (index === 2) {
          updateMode1OneClickStatus('weekly', 'error', result.reason?.message || '生成失敗');
        }
      }
    });
    
    // 顯示完成通知
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('一鍵生成完成！', 3000);
    }
    
  } catch (error) {
    console.error('一鍵生成失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('生成過程中發生錯誤', 3000);
    }
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>一鍵生成全部（帳號定位 + 選題方向 + 一週腳本）</span>';
  }
}

// 為一鍵生成優化的生成函數（返回 Promise 和內容）
async function generateMode1PositioningForOneClick() {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ipPlanningToken}`
        },
        body: JSON.stringify({
          message: '請根據我們的對話內容，生成帳號定位分析。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。內容包含：1.**目標受眾**：清楚說明目標受眾是誰 2.**傳達目標**：說明想要達成的目標（例如：進群、portally、建立品牌等） 3.**帳號定位**：用一句話清楚說明帳號定位 4.**內容方向**：描述主要內容方向 5.**風格調性**：說明帳號的風格和調性 6.**差異化優勢**：說明與其他帳號的差異化優勢',
          user_id: ipPlanningUser?.user_id || 'anonymous',
          platform: '短影音平台',
          profile: 'IP人設規劃專家',
          topic: '帳號定位生成',
          style: '自然語言、用戶友好、易讀易懂，使用Markdown粗體標記重要內容，不要程式碼或技術格式',
          duration: '30',
          conversation_type: 'ip_planning'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                content += parsed.content;
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }
      
      if (!content) {
        throw new Error('未收到任何內容');
      }
      
      resolve(content);
    } catch (error) {
      reject(error);
    }
  });
}

async function generateMode1TopicsForOneClick() {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ipPlanningToken}`
        },
        body: JSON.stringify({
          message: '請根據我們的對話內容和帳號定位，生成選題方向和影片類型配比建議。請參考知識庫中的「內容策略矩陣」，理解其邏輯而非記憶範例。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。**請使用 Markdown 表格格式呈現選題方向和配比**，表格欄位包含：影片類型、佔比、目的、內容方向。請根據用戶的帳號定位、目標受眾、傳達目標來判斷適合的內容類型和配比，不要使用固定配比。如果用戶的主題不符合範例類別，請根據邏輯自創新類型並合理配置比例。',
          user_id: ipPlanningUser?.user_id || 'anonymous',
          platform: '短影音平台',
          profile: 'IP人設規劃專家',
          topic: '選題方向生成',
          style: '自然語言、用戶友好、易讀易懂，使用Markdown粗體標記重要內容，使用Markdown表格格式呈現選題方向和配比',
          duration: '30',
          conversation_type: 'ip_planning'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                content += parsed.content;
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }
      
      if (!content) {
        throw new Error('未收到任何內容');
      }
      
      resolve(content);
    } catch (error) {
      reject(error);
    }
  });
}

async function generateMode1WeeklyForOneClick() {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ipPlanningToken}`
        },
        body: JSON.stringify({
          message: '請根據我們的對話內容、帳號定位和選題方向，生成一週的短影音腳本。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。**請使用 Markdown 表格格式呈現一週腳本**，表格欄位包含：日期、主題、時間、段落、台詞、畫面描述、字幕文字、音效與轉場。每支腳本請包含：1.**主題標題**：用一句話清楚說明這支影片的主題 2.**開場鉤子**：用自然語言寫出吸引人的開場，讓觀眾想繼續看下去 3.**核心內容**：用2-3句自然語言說明影片要傳達的價值 4.**行動呼籲**：用一句話引導觀眾採取行動 5.**畫面描述**：用簡短易懂的句子描述畫面應該呈現什麼 6.**發佈文案**：寫一段適合社群媒體的文案。請確保表格格式正確，使用 Markdown 表格語法（| 欄位1 | 欄位2 | ... |）。',
          user_id: ipPlanningUser?.user_id || 'anonymous',
          platform: '短影音平台',
          profile: 'IP人設規劃專家',
          topic: '一週腳本生成',
          style: '自然語言、用戶友好、易讀易懂，使用Markdown粗體標記重要內容，使用Markdown表格格式呈現一週腳本',
          duration: '30',
          conversation_type: 'ip_planning'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                content += parsed.content;
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }
      
      if (!content) {
        throw new Error('未收到任何內容');
      }
      
      resolve(content);
    } catch (error) {
      reject(error);
    }
  });
}

// 儲存一鍵生成結果
async function saveMode1OneClickResult(type) {
  // 防止模態窗口縮放動畫
  const modal = document.querySelector('.mode1-oneclick-modal');
  if (modal) {
    modal.classList.add('saving');
  }
  
  try {
    const contentEl = document.getElementById(`mode1OneClick${type === 'positioning' ? 'Positioning' : type === 'topics' ? 'Topics' : 'Weekly'}Content`);
    if (!contentEl || !contentEl.innerHTML.trim()) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('沒有可儲存的內容', 3000);
      }
      return;
    }
    
    const token = localStorage.getItem('ipPlanningToken');
    const userStr = localStorage.getItem('ipPlanningUser');
    
    if (!token || !userStr) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入', 3000);
      }
      return;
    }
    
    const user = JSON.parse(userStr);
    
    // 映射類型到後端接受的格式
    const resultTypeMap = {
      'positioning': 'profile',
      'topics': 'plan',
      'weekly': 'scripts'
    };
    
    const resultType = resultTypeMap[type];
    if (!resultType) {
      console.error('無效的結果類型:', type);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('儲存失敗：無效的結果類型', 3000);
      }
      return;
    }
    
    // 獲取內容（HTML）
    let content = contentEl.innerHTML.trim();
    
    // 生成標題
    const titleMap = {
      'positioning': '帳號定位',
      'topics': '選題方向（影片類型配比）',
      'weekly': '一週腳本'
    };
    const title = titleMap[type] || 'IP 人設規劃結果';
    
    // 顯示儲存中通知
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在儲存...', 2000);
    }
    
    // 直接調用 API 儲存
    const response = await fetch('https://aivideobackend.zeabur.app/api/ip-planning/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: user.user_id,
        result_type: resultType,
        title: title,
        content: content,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'mode1_oneclick'
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    // 顯示成功通知
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('✅ 儲存成功', 3000);
    }
    
    console.log('儲存成功:', result);
    
  } catch (error) {
    console.error('儲存失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast(`❌ 儲存失敗：${error.message}`, 5000);
    }
  } finally {
    // 移除 saving class，恢復動畫
    if (modal) {
      setTimeout(() => {
        modal.classList.remove('saving');
      }, 100);
    }
  }
}

// 重新生成生成結果
async function regenerateMode1OneClickResult(type, forceRegenerate = true) {
  updateMode1OneClickStatus(type, 'generating', `正在重新生成${type === 'positioning' ? '帳號定位' : type === 'topics' ? '選題方向' : '一週腳本'}`);
  
  try {
    let result;
    if (type === 'positioning') {
      result = await generateMode1PositioningForOneClick();
    } else if (type === 'topics') {
      result = await generateMode1TopicsForOneClick();
    } else if (type === 'weekly') {
      result = await generateMode1WeeklyForOneClick();
    }
    
    updateMode1OneClickStatus(type, 'completed', result);
    
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast(`${type === 'positioning' ? '帳號定位' : type === 'topics' ? '選題方向' : '一週腳本'}已重新生成`, 3000);
    }
  } catch (error) {
    updateMode1OneClickStatus(type, 'error', error.message || '生成失敗');
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast(`重新生成失敗`, 3000);
    }
  }
}

// 展開一鍵生成結果（彈出模態視窗）
window.toggleMode1OneClickExpand = function(type) {
  const typeMap = {
    'positioning': { name: 'Positioning', title: '帳號定位' },
    'topics': { name: 'Topics', title: '選題方向（影片類型配比）' },
    'weekly': { name: 'Weekly', title: '一週腳本' }
  };
  const typeInfo = typeMap[type] || { name: type, title: '內容' };
  const contentEl = document.getElementById(`mode1OneClick${typeInfo.name}Content`);
  
  if (!contentEl || !contentEl.innerHTML.trim()) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('沒有可查看的內容', 2000);
    }
    return;
  }
  
  // 打開模態視窗
  const overlay = document.getElementById('mode1ExpandModalOverlay');
  const modal = overlay?.querySelector('.mode1-expand-modal');
  const titleEl = document.getElementById('mode1ExpandModalTitle');
  const contentElModal = document.getElementById('mode1ExpandModalContent');
  
  if (!overlay || !modal || !titleEl || !contentElModal) return;
  
  // 設置標題
  titleEl.textContent = typeInfo.title;
  
  // 複製內容到模態視窗
  contentElModal.innerHTML = contentEl.innerHTML;
  
  // 確保表格在模態視窗中正確顯示
  const tables = contentElModal.querySelectorAll('table');
  tables.forEach(table => {
    // 如果表格不在滾動容器中，添加容器
    if (!table.parentElement.classList.contains('mode1-oneclick-result-content-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'mode1-oneclick-result-content-wrapper';
      wrapper.style.overflowX = 'auto';
      wrapper.style.webkitOverflowScrolling = 'touch';
      wrapper.style.overscrollBehaviorX = 'contain';
      table.parentElement.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
  
  // 顯示模態視窗
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  // iOS Safari 處理
  if (window.innerWidth <= 768) {
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }
};

// 關閉展開模態視窗
window.closeMode1ExpandModal = function() {
  const overlay = document.getElementById('mode1ExpandModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
};

// 匯出生成結果
function exportMode1OneClickResult(type) {
  const contentEl = document.getElementById(`mode1OneClick${type === 'positioning' ? 'Positioning' : type === 'topics' ? 'Topics' : 'Weekly'}Content`);
  if (!contentEl || !contentEl.innerHTML.trim()) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('沒有可匯出的內容', 3000);
    }
    return;
  }
  
  try {
    const textContent = contentEl.innerText || contentEl.textContent || '';
    const typeNames = {
      'positioning': '帳號定位',
      'topics': '選題方向',
      'weekly': '一週腳本'
    };
    const typeName = typeNames[type] || type;
    
    const csvContent = `類型,標題,內容,匯出時間\n"${type}","${typeName}","${textContent.replace(/"/g, '""').replace(/\n/g, ' ')}","${new Date().toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}"`;
    
    const csvBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `ip-${type}-${Date.now()}.csv`;
    csvLink.click();
    URL.revokeObjectURL(csvUrl);
    
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('✅ 匯出成功', 3000);
    }
  } catch (error) {
    console.error('匯出失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('匯出失敗，請稍後再試', 3000);
    }
  }
}

// 處理模式導航（檢查權限）
async function handleModeNavigation(event, targetMode) {
  event.preventDefault();
  event.stopPropagation();
  
  // 檢查登入狀態
  if (window.ReelMindCommon && typeof window.ReelMindCommon.checkLoginStatus === 'function') {
    const loggedIn = await window.ReelMindCommon.checkLoginStatus();
    
    if (!loggedIn) {
      // 未登入，顯示通知並跳轉到登入頁面
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入以使用此功能', 3000);
      }
      // 使用 common.js 的登入函數
      if (typeof goToLogin === 'function') {
        goToLogin();
      } else if (window.ReelMindCommon && typeof window.ReelMindCommon.goToLogin === 'function') {
        window.ReelMindCommon.goToLogin();
      } else {
        // 降級處理：直接跳轉到 Google 登入
        const backendUrl = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
        const redirectUri = encodeURIComponent(window.location.origin + '/' + (targetMode === 'mode1' ? 'mode1.html' : 'mode3.html'));
        window.location.href = `${backendUrl}/api/auth/google?redirect_uri=${redirectUri}`;
      }
      return false;
    }
    
    // 已登入，檢查訂閱狀態
    if (window.ReelMindCommon && typeof window.ReelMindCommon.checkSubscriptionStatus === 'function') {
      await window.ReelMindCommon.checkSubscriptionStatus();
    }
    
    const subscribed = window.ReelMindCommon && typeof window.ReelMindCommon.isSubscribed === 'function' 
      ? window.ReelMindCommon.isSubscribed() 
      : false;
    
    if (!subscribed) {
      // 已登入但未訂閱，跳轉到訂閱頁面
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先訂閱以使用此功能', 3000);
      }
      window.location.href = '/subscription.html';
      return false;
    }
  } else {
    // 如果 common.js 未載入，降級處理：直接檢查 localStorage
    const token = localStorage.getItem('ipPlanningToken') || localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('ipPlanningUser') || localStorage.getItem('user') || 'null');
    
    if (!token || !user) {
      // 未登入
      alert('請先登入以使用此功能！');
      const backendUrl = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
      const redirectUri = encodeURIComponent(window.location.origin + '/' + (targetMode === 'mode1' ? 'mode1.html' : 'mode3.html'));
      window.location.href = `${backendUrl}/api/auth/google?redirect_uri=${redirectUri}`;
      return false;
    }
    
    // 檢查訂閱狀態
    const isSubscribed = user.is_subscribed === true || user.is_subscribed === 1 || user.is_subscribed === '1' || user.is_subscribed === 'true';
    if (!isSubscribed) {
      alert('請先訂閱以使用此功能！');
      window.location.href = '/subscription.html';
      return false;
    }
  }
  
  // 已登入且已訂閱，允許跳轉
  window.location.href = targetMode === 'mode1' ? 'mode1.html' : 'mode3.html';
  return false;
}

// 登入函數
// 使用 common.js 中的統一函數（已導出到 window）
// goToLogin, toggleMobileDrawer, openMobileDrawer, closeMobileDrawer 現在都在 common.js 中統一管理

