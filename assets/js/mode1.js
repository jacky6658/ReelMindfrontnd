// mode1.js - IP人設規劃模式專用函數
// 從 mode1.html 提取的所有 JavaScript 代碼

// API_BASE_URL 已在 config.js 中定義為全局變數
// 這裡直接使用 window.APP_CONFIG，避免重複聲明
const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
let ipPlanningToken = localStorage.getItem('ipPlanningToken') || '';
let ipPlanningUser = JSON.parse(localStorage.getItem('ipPlanningUser') || 'null');
let isMode3Sending = false;
let mode3ChatInitialized = false;
let currentMode3ConversationType = 'ip_planning';

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 ========== Mode1 (IP人設規劃) 頁面初始化 ==========');
  
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
  
  // 檢查權限（需要登入和訂閱）
  if (window.ReelMindCommon) {
    const hasAccess = await window.ReelMindCommon.checkFeatureAccess();
    if (!hasAccess) {
      console.warn('⚠️ 權限檢查失敗，無法訪問此功能');
      return;
    }
    console.log('✅ 權限檢查通過，可以訪問此功能');
  }

  // 更新用戶資訊顯示
  updateUserInfo();
  
  // 載入用戶記憶（長期記憶和短期記憶）
  if (isLoggedIn && ipPlanningUser?.user_id) {
    await loadUserMemory();
  }
  
  // 初始化聊天功能
  initMode3Chat();
  
  console.log('✅ ========== Mode1 頁面初始化完成 ==========');
});

// 載入用戶記憶（長期記憶和短期記憶）
async function loadUserMemory() {
  if (!ipPlanningUser?.user_id || !ipPlanningToken) {
    console.warn('⚠️ 無法載入記憶：缺少用戶ID或Token');
    return;
  }
  
  try {
    console.log('🧠 ========== 開始載入用戶記憶 ==========');
    console.log('👤 用戶ID:', ipPlanningUser.user_id);
    
    // 使用完整記憶端點（包含 STM + LTM）
    const memoryResponse = await fetch(`${API_URL}/api/user/memory/full/${ipPlanningUser.user_id}`, {
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

// 初始化 Mode3 聊天功能
function initMode3Chat() {
  const messageInput = document.getElementById('mode3-messageInput');
  const sendBtn = document.getElementById('mode3-sendBtn');
  const quickButtons = document.getElementById('mode3-quickButtons');
  
  if (!messageInput || !sendBtn || !quickButtons) return;
  
  if (mode3ChatInitialized) {
    sendBtn.disabled = !messageInput.value.trim();
    return;
  }
  mode3ChatInitialized = true;
  
  // 輸入框自動調整高度
  messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    sendBtn.disabled = !this.value.trim();
  });
  
  // 發送按鈕
  sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
      sendMode3Message(message);
    }
  });
  
  // Enter 發送
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = messageInput.value.trim();
      if (message) {
        sendMode3Message(message);
      }
    }
  });
  
  // 快速按鈕事件處理（保留作為備用，主要使用 onclick）
  quickButtons.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('.quick-btn');
    if (btn && btn.closest('.mode3-page') && quickButtons.id === 'mode3-quickButtons') {
      e.preventDefault();
      // 如果按鈕有 onclick，不處理（由 onclick 處理）
      if (btn.onclick) {
        return;
      }
      // 降級處理：如果有 data-text，使用舊方式
      const text = btn.getAttribute('data-text');
      if (text) {
        sendMode3Message(text, 'ip_planning');
      }
    }
  });
}

// 處理快速按鈕點擊
function handleQuickButton(type) {
  switch(type) {
    case 'ip-profile':
      // 打開右側抽屜，顯示 帳號定位 標籤
      toggleMode3ResultsDrawer();
      switchMode3Tab('positioning', null);
      // 如果還沒有生成，自動生成
      const positioningResult = document.getElementById('mode3-positioning-result');
      if (positioningResult && positioningResult.querySelector('.mode3-result-placeholder')) {
        generateMode3Positioning();
      } else {
        // 如果已經有內容，LLM 告知用戶目前的 IP Profile
        sendMode3Message('請告知我目前的 IP Profile，基於我們之前的對話內容。', 'ip_planning');
      }
      break;
    case '14day-plan':
      // 打開右側抽屜，顯示 選題方向 標籤
      toggleMode3ResultsDrawer();
      switchMode3Tab('topics', null);
      // 如果還沒有生成，自動生成
      const topicsResult = document.getElementById('mode3-topics-result');
      if (topicsResult && topicsResult.querySelector('.mode3-result-placeholder')) {
        generateMode3TopicsWithRatio();
      } else {
        // 如果已經有內容，LLM 根據之前討論的影片類型配比再次告知規劃
        sendMode3Message('請根據我們之前討論的影片類型配比，再次告知我的14天規劃。', 'ip_planning');
      }
      break;
    case 'today-script':
      // 打開右側抽屜，顯示 一週腳本 標籤
      toggleMode3ResultsDrawer();
      switchMode3Tab('weekly', null);
      // 詢問用戶要使用哪個腳本結構
      sendMode3Message('請根據目前資料庫的5個腳本結構（A/B/C/D/E），詢問我要使用哪一個腳本結構來產出今日的腳本。', 'ip_planning');
      break;
    case 'reposition':
      // 重新定位：LLM 會先詢問
      sendMode3Message('我想要重新定位，請先詢問我想要重新定位哪個方面？', 'ip_planning');
      break;
    default:
      console.warn('未知的快速按鈕類型:', type);
  }
}

// 發送 Mode3 訊息
async function sendMode3Message(message, conversationType = 'ip_planning') {
  if (isMode3Sending) {
    console.log('訊息發送中，請稍候...');
    return;
  }
  
  currentMode3ConversationType = conversationType;
  if (!message || !message.trim()) return;
  
  isMode3Sending = true;
  
  const chatMessages = document.getElementById('mode3-chatMessages');
  const messageInput = document.getElementById('mode3-messageInput');
  const sendBtn = document.getElementById('mode3-sendBtn');
  const quickButtons = document.getElementById('mode3-quickButtons');
  
  if (!chatMessages || !messageInput || !sendBtn) return;
  
  const token = localStorage.getItem('ipPlanningToken') || 
               (window.Auth && window.Auth.getToken ? window.Auth.getToken() : null);
  const userStr = localStorage.getItem('ipPlanningUser');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // 添加用戶訊息
  const userMessage = createMode3Message('user', message);
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
    await recordMode3ConversationMessage(conversationType, 'user', message, token, user);
  } catch (error) {
    console.error('記錄長期記憶錯誤:', error);
  }
  
  // 添加載入動畫
  const aiMessage = createMode3Message('assistant', '');
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
              await recordMode3ConversationMessage(currentMode3ConversationType, 'assistant', fullContent, token, user);
            } catch (error) {
              console.error('記錄長期記憶錯誤:', error);
            }
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              contentDiv.innerHTML = renderMode3Markdown(fullContent);
              
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
    if (contentDiv) {
      // 使用統一的 escapeHtml 函數
      const escapeHtml = window.ReelMindSecurity?.escapeHtml || window.escapeHtml || ((text) => {
        if (text == null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
      });
      const safeErrorMsg = escapeHtml(error.message || '未知錯誤');
      contentDiv.innerHTML = `抱歉，發生了錯誤：${safeErrorMsg}`;
    } else {
      const errorMessage = createMode3Message('assistant', `抱歉，發生了錯誤：${error.message}`);
      chatMessages.appendChild(errorMessage);
    }
  } finally {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    if (quickButtons) {
      quickButtons.style.display = 'flex';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
    isMode3Sending = false;
  }
}

// 創建 Mode3 訊息元素
function createMode3Message(role, content) {
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
    contentDiv.innerHTML = renderMode3Markdown(content);
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
function renderMode3Markdown(text) {
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
async function recordMode3ConversationMessage(conversationType, role, content, token, user) {
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
function toggleMode3InstructionsDrawer() {
  const overlay = document.getElementById('mode3InstructionsOverlay');
  const drawer = document.getElementById('mode3InstructionsDrawer');
  
  if (overlay && drawer) {
    const isOpen = overlay.classList.contains('open');
    
    if (isOpen) {
      closeMode3InstructionsDrawer();
    } else {
      openMode3InstructionsDrawer();
    }
  }
}

function openMode3InstructionsDrawer() {
  const overlay = document.getElementById('mode3InstructionsOverlay');
  const drawer = document.getElementById('mode3InstructionsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMode3InstructionsDrawer() {
  const overlay = document.getElementById('mode3InstructionsOverlay');
  const drawer = document.getElementById('mode3InstructionsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// 切換結果抽屜
function toggleMode3ResultsDrawer() {
  const overlay = document.getElementById('mode3ResultsOverlay');
  const drawer = document.getElementById('mode3ResultsDrawer');
  
  if (overlay && drawer) {
    const isOpen = overlay.classList.contains('open');
    
    if (isOpen) {
      closeMode3ResultsDrawer();
    } else {
      openMode3ResultsDrawer();
    }
  }
}

function openMode3ResultsDrawer() {
  const overlay = document.getElementById('mode3ResultsOverlay');
  const drawer = document.getElementById('mode3ResultsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMode3ResultsDrawer() {
  const overlay = document.getElementById('mode3ResultsOverlay');
  const drawer = document.getElementById('mode3ResultsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// 切換結果標籤
function switchMode3Tab(tabName, event) {
  document.querySelectorAll('.mode3-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.mode3-result-block').forEach(block => {
    block.classList.remove('active');
  });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    const tabs = document.querySelectorAll('.mode3-tab');
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
  let resultBlock = document.getElementById(`mode3-${tabName}-result`);
  if (!resultBlock) {
    // 映射舊的標籤名稱到新的 ID
    if (tabName === 'profile') {
      resultBlock = document.getElementById('mode3-positioning-result');
    } else if (tabName === 'plan') {
      resultBlock = document.getElementById('mode3-topics-result');
    } else if (tabName === 'scripts') {
      resultBlock = document.getElementById('mode3-weekly-result');
    }
  }
  
  if (resultBlock) {
    resultBlock.classList.add('active');
  }
}

// 生成帳號定位
async function generateMode3Positioning() {
  const resultBlock = document.getElementById('mode3-positioning-result') || document.getElementById('mode3-profile-result');
  if (!resultBlock) {
    console.error('找不到結果區塊');
    return;
  }
  const button = resultBlock.querySelector('.mode3-generate-btn');
  if (!button) {
    console.error('找不到生成按鈕');
    return;
  }
  
  button.disabled = true;
  button.innerHTML = '<span>⏳</span> 生成中...';
  
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
    
    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
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
      
      const renderedContent = renderMode3Markdown(content);
      resultBlock.innerHTML = `<div class="mode3-result-content">${renderedContent}</div>`;
      button.innerHTML = '<span>🚀</span> 重新生成';
      button.disabled = false;
    } else {
      throw new Error('生成失敗');
    }
  } catch (error) {
    console.error('生成帳號定位失敗:', error);
    button.innerHTML = '<span>❌</span> 生成失敗，請重試';
    button.disabled = false;
  }
}

// 保留舊函數作為備用（向後兼容）
async function generateMode3IPProfile() {
  return generateMode3Positioning();
}

// 生成選題方向（影片類型配比）
async function generateMode3TopicsWithRatio() {
  const resultBlock = document.getElementById('mode3-topics-result') || document.getElementById('mode3-plan-result');
  if (!resultBlock) {
    console.error('找不到結果區塊');
    return;
  }
  const button = resultBlock.querySelector('.mode3-generate-btn');
  if (!button) {
    console.error('找不到生成按鈕');
    return;
  }
  
  button.disabled = true;
  button.innerHTML = '<span>⏳</span> 生成中...';
  
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
    
    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
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
      
      const renderedContent = renderMode3Markdown(content);
      resultBlock.innerHTML = `<div class="mode3-result-content">${renderedContent}</div>`;
      button.innerHTML = '<span>🚀</span> 重新生成';
      button.disabled = false;
    } else {
      throw new Error('生成失敗');
    }
  } catch (error) {
    console.error('生成選題方向失敗:', error);
    button.innerHTML = '<span>❌</span> 生成失敗，請重試';
    button.disabled = false;
  }
}

// 保留舊函數作為備用（向後兼容）
async function generateMode314DayPlan() {
  return generateMode3TopicsWithRatio();
}

// 生成一週腳本
async function generateMode3WeeklyScripts() {
  const resultBlock = document.getElementById('mode3-weekly-result') || document.getElementById('mode3-scripts-result');
  if (!resultBlock) {
    console.error('找不到結果區塊');
    return;
  }
  const button = resultBlock.querySelector('.mode3-generate-btn');
  if (!button) {
    console.error('找不到生成按鈕');
    return;
  }
  
  button.disabled = true;
  button.innerHTML = '<span>⏳</span> 生成中...';
  
  // 清空之前的內容
  resultBlock.innerHTML = '<div class="mode3-result-content"><p>正在生成腳本...</p></div>';
  const contentDiv = resultBlock.querySelector('.mode3-result-content');
  
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
              const renderedContent = renderMode3Markdown(fullContent);
              contentDiv.innerHTML = renderedContent;
            } else if (parsed.type === 'end') {
              console.log('✅ 收到 end 標記');
              break;
            } else if (parsed.type === 'error') {
              throw new Error(parsed.content || '生成失敗');
            } else if (parsed.content) {
              // 兼容舊格式
              fullContent += parsed.content;
              hasReceivedContent = true;
              const renderedContent = renderMode3Markdown(fullContent);
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
      const renderedContent = renderMode3Markdown(fullContent);
      contentDiv.innerHTML = renderedContent;
      console.log('✅ 腳本生成完成，最終內容長度:', fullContent.length);
    } else if (!hasReceivedContent) {
      throw new Error('未收到任何內容，請重試');
    }
    
    button.innerHTML = '<span>🚀</span> 重新生成';
    button.disabled = false;
  } catch (error) {
    console.error('❌ 生成一週腳本失敗:', error);
    contentDiv.innerHTML = `<p style="color: #dc2626;">生成失敗：${escapeHtml(error.message || '未知錯誤')}</p><p>請檢查網路連線或稍後再試。</p>`;
    button.innerHTML = '<span>❌</span> 生成失敗，請重試';
    button.disabled = false;
  }
}

// 保留舊函數作為備用（向後兼容）
async function generateMode3TodayScripts() {
  return generateMode3WeeklyScripts();
}

// 儲存結果
async function saveMode3Result() {
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
    const activeTab = document.querySelector('.mode3-tab.active');
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
      resultType = 'positioning';
      title = '帳號定位';
    } else if (tabText.includes('選題方向')) {
      resultType = 'topics';
      title = '選題方向（影片類型配比）';
    } else if (tabText.includes('一週腳本')) {
      resultType = 'weekly';
      title = '一週腳本';
    }
    // 保留舊的匹配邏輯作為備用
    else if (tabText.includes('Profile')) {
      resultType = 'positioning';
      title = 'IP Profile';
    } else if (tabText.includes('規劃')) {
      resultType = 'topics';
      title = '14天短影音規劃';
    } else if (tabText.includes('腳本')) {
      resultType = 'weekly';
      title = '今日腳本';
    }
    
    if (!resultType) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('無法識別結果類型', 3000);
      }
      return;
    }
    
    const resultBlock = document.getElementById(`mode3-${resultType}-result`) || 
                       document.getElementById(`mode3-${resultType === 'positioning' ? 'profile' : resultType === 'topics' ? 'plan' : 'scripts'}-result`);
    if (!resultBlock) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到結果區塊', 3000);
      }
      return;
    }
    const content = resultBlock.querySelector('.mode3-result-content');
    
    if (!content || !content.innerHTML.trim()) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('沒有可儲存的內容', 3000);
      }
      return;
    }
    
    const textContent = content.innerText || content.textContent || '';
    const shortTitle = textContent.substring(0, 50) || title;
    
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
        title: shortTitle,
        content: content.innerHTML,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'mode3'
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '網路錯誤' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ 結果已儲存到個人資料庫', 3000);
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
function regenerateMode3Result() {
  const activeTab = document.querySelector('.mode3-tab.active');
  if (activeTab) {
    const tabText = activeTab.textContent;
    if (tabText.includes('帳號定位')) {
      generateMode3Positioning();
    } else if (tabText.includes('選題方向')) {
      generateMode3TopicsWithRatio();
    } else if (tabText.includes('一週腳本')) {
      generateMode3WeeklyScripts();
    }
    // 保留舊的匹配邏輯作為備用
    else if (tabText.includes('Profile')) {
      generateMode3Positioning();
    } else if (tabText.includes('規劃')) {
      generateMode3TopicsWithRatio();
    } else if (tabText.includes('腳本')) {
      generateMode3WeeklyScripts();
    }
  }
}

// 匯出結果
function exportMode3Result() {
  const activeTab = document.querySelector('.mode3-tab.active');
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
  
  const resultBlock = document.getElementById(`mode3-${tabName}-result`) || 
                     document.getElementById(`mode3-${tabName === 'positioning' ? 'profile' : tabName === 'topics' ? 'plan' : 'scripts'}-result`);
  if (!resultBlock) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('找不到結果區塊', 3000);
    }
    return;
  }
  const content = resultBlock.querySelector('.mode3-result-content');
  
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
      window.ReelMindCommon.showToast('✅ 結果已匯出為 CSV 檔案', 3000);
    }
  } catch (error) {
    console.error('匯出失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('匯出失敗，請稍後再試', 3000);
    }
  }
}

// 登入函數
// 使用 common.js 中的統一函數（已導出到 window）
// goToLogin, toggleMobileDrawer, openMobileDrawer, closeMobileDrawer 現在都在 common.js 中統一管理

