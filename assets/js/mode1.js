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
  if (window.ReelMindCommon && window.ReelMindCommon.updateUserInfo) {
    window.ReelMindCommon.updateUserInfo();
  } else if (window.updateUserInfo) {
    window.updateUserInfo();
  }
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
  
  // 快速按鈕
  quickButtons.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('.quick-btn');
    if (btn && btn.closest('.mode3-page') && quickButtons.id === 'mode3-quickButtons') {
      e.preventDefault();
      const text = btn.getAttribute('data-text');
      if (text) {
        sendMode3Message(text, 'ip_planning');
      }
    }
  });
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
    const html = marked.parse(text);
    // 使用 DOMPurify 清理（如果可用）
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(html);
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
      if (tab.textContent.includes(tabName === 'profile' ? 'IP Profile' : tabName === 'plan' ? '14天' : '今日')) {
        tab.classList.add('active');
      }
    });
  }
  
  const resultBlock = document.getElementById(`mode3-${tabName}-result`);
  if (resultBlock) {
    resultBlock.classList.add('active');
  }
}

// 生成IP Profile
async function generateMode3IPProfile() {
  const resultBlock = document.getElementById('mode3-profile-result');
  const button = resultBlock.querySelector('.mode3-generate-btn');
  
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
        message: '請根據我們的對話內容，生成一份完整的IP Profile。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。絕對不要出現任何程式碼、技術術語或複雜的結構化格式。內容包含：1.**人設標籤**：列出3-5個標籤，用自然語言描述 2.**一句話定位**：用一句話清楚說明個人定位 3.**品牌原型**：簡潔描述品牌原型和特質 4.**語氣設定**：用友善的語言說明語氣特點 5.**核心價值觀**：列出3-5個核心價值，用簡短句子說明 6.**禁語清單**：列出應該避免使用的詞彙和表達方式 7.**視覺設定**：描述視覺風格、配色、字體等，用自然語言 8.**KPI指標**：說明關鍵指標，用易懂的方式呈現',
        user_id: ipPlanningUser?.user_id || 'anonymous',
        platform: '短影音平台',
        profile: 'IP人設規劃專家',
        topic: 'IP Profile生成',
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
    console.error('生成IP Profile失敗:', error);
    button.innerHTML = '<span>❌</span> 生成失敗，請重試';
    button.disabled = false;
  }
}

// 生成14天規劃
async function generateMode314DayPlan() {
  const resultBlock = document.getElementById('mode3-plan-result');
  const button = resultBlock.querySelector('.mode3-generate-btn');
  
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
        message: '請根據我們的對話內容和IP Profile，生成一份14天短影音規劃表。請使用自然語言、友善的語氣，以清晰易懂的方式呈現每一天的規劃。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。絕對不要出現任何程式碼、表格符號或複雜的結構化格式。每一天的規劃請包含：1.**每日主題**：用一句話說明當天的主題 2.**內容方向**：用2-3句自然語言描述內容重點 3.**拍攝建議**：用簡短易懂的句子說明拍攝要點 4.**發布時間**：建議發布時段 5.**互動策略**：用一句話說明如何與觀眾互動。請將每一天的內容用清晰的段落分隔，讓用戶容易閱讀。',
        user_id: ipPlanningUser?.user_id || 'anonymous',
        platform: '短影音平台',
        profile: 'IP人設規劃專家',
        topic: '14天規劃生成',
        style: '自然語言、用戶友好、易讀易懂，使用Markdown粗體標記重要內容，不要程式碼或表格格式',
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
    console.error('生成14天規劃失敗:', error);
    button.innerHTML = '<span>❌</span> 生成失敗，請重試';
    button.disabled = false;
  }
}

// 生成今日腳本
async function generateMode3TodayScripts() {
  const resultBlock = document.getElementById('mode3-scripts-result');
  const button = resultBlock.querySelector('.mode3-generate-btn');
  
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
        message: '請根據我們的對話內容和IP Profile，生成今日3支短影音腳本。請使用自然語言、友善的語氣，以清晰易懂的方式呈現。重要標題和關鍵詞請使用**粗體**標記（Markdown格式）。絕對不要出現任何程式碼、技術術語或複雜的結構化格式。每支腳本請包含：1.**主題標題**：用一句話清楚說明這支影片的主題 2.**開場鉤子**：用自然語言寫出吸引人的開場，讓觀眾想繼續看下去 3.**核心內容**：用2-3句自然語言說明影片要傳達的價值 4.**行動呼籲**：用一句話引導觀眾採取行動 5.**畫面描述**：用簡短易懂的句子描述畫面應該呈現什麼 6.**發佈文案**：寫一段適合社群媒體的文案。請將每支腳本用清晰的段落分隔，讓用戶容易閱讀和使用。',
        user_id: ipPlanningUser?.user_id || 'anonymous',
        platform: '短影音平台',
        profile: 'IP人設規劃專家',
        topic: '今日腳本生成',
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
    console.error('生成今日腳本失敗:', error);
    button.innerHTML = '<span>❌</span> 生成失敗，請重試';
    button.disabled = false;
  }
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
    if (activeTab.textContent.includes('Profile')) {
      resultType = 'profile';
      title = 'IP Profile';
    } else if (activeTab.textContent.includes('規劃')) {
      resultType = 'plan';
      title = '14天短影音規劃';
    } else if (activeTab.textContent.includes('腳本')) {
      resultType = 'scripts';
      title = '今日3支腳本';
    }
    
    const resultBlock = document.getElementById(`mode3-${resultType}-result`);
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
    const tabName = activeTab.textContent.includes('Profile') ? 'profile' : 
                   activeTab.textContent.includes('規劃') ? 'plan' : 'scripts';
    
    if (tabName === 'profile') {
      generateMode3IPProfile();
    } else if (tabName === 'plan') {
      generateMode314DayPlan();
    } else if (tabName === 'scripts') {
      generateMode3TodayScripts();
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
  
  const tabName = activeTab.textContent.includes('Profile') ? 'profile' : 
                 activeTab.textContent.includes('規劃') ? 'plan' : 'scripts';
  
  const resultBlock = document.getElementById(`mode3-${tabName}-result`);
  const content = resultBlock.querySelector('.mode3-result-content');
  
  if (!content || !content.innerHTML.trim()) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('沒有可匯出的內容', 3000);
    }
    return;
  }
  
  try {
    const textContent = content.innerText || content.textContent || '';
    
    const csvContent = `類型,標題,內容,匯出時間\n"${tabName}","${tabName === 'profile' ? 'IP Profile' : tabName === 'plan' ? '14天規劃' : '今日腳本'}","${textContent.replace(/"/g, '""').replace(/\n/g, ' ')}","${new Date().toLocaleString('zh-TW', {
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

