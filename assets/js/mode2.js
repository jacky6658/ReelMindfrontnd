// mode2.js - AI顧問模式專用函數
// 從 mode2.html 提取的所有 JavaScript 代碼

// API_BASE_URL 已在 config.js 中定義為全局變數
// 這裡直接使用 window.APP_CONFIG，避免重複聲明
const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
let ipPlanningToken = localStorage.getItem('ipPlanningToken') || '';
let ipPlanningUser = JSON.parse(localStorage.getItem('ipPlanningUser') || 'null');
let isSending = false;

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 ========== Mode2 (AI顧問) 頁面初始化 ==========');
  
  // 檢查登入狀態
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
  
  // 檢查認證和訂閱狀態
  if (window.ReelMindCommon && window.ReelMindCommon.checkFeatureAccess) {
    const canAccess = await window.ReelMindCommon.checkFeatureAccess();
    if (!canAccess) {
      console.warn('⚠️ 權限檢查失敗，無法訪問此功能');
      return; // checkFeatureAccess 已經處理了跳轉
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
  initChatGPTFeatures();
  
  console.log('✅ ========== Mode2 頁面初始化完成 ==========');
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
function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  const authButtons = document.getElementById('authButtons');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userDBTab = document.getElementById('userDBTab');
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
    if (userDBMobileTab) {
      userDBMobileTab.style.display = 'none';
    }
  }
}

// 跳轉到登入頁面
async function goToLogin() {
  if (window.ReelMindCommon && window.ReelMindCommon.goToLogin) {
    await window.ReelMindCommon.goToLogin();
  } else {
    window.location.href = 'index.html';
  }
}

// 手機版抽屜切換
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

function openMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  
  if (drawer && overlay) {
    drawer.classList.add('open');
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  
  if (drawer && overlay) {
    drawer.classList.remove('open');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// 切換說明抽屜
function toggleInstructionsDrawer() {
  const drawer = document.getElementById('instructionsDrawer');
  const overlay = document.getElementById('drawerOverlay');
  
  if (drawer && overlay) {
    const isOpen = drawer.classList.contains('open');
    
    if (isOpen) {
      drawer.classList.remove('open');
      overlay.classList.remove('show');
    } else {
      drawer.classList.add('open');
      overlay.classList.add('show');
    }
  }
}

// 初始化 ChatGPT 風格功能
function initChatGPTFeatures() {
  try {
    // 初始化 Markdown 渲染器
    if (typeof initMarkdownRenderer === 'function') {
      initMarkdownRenderer();
    }
  
    // 設置輸入框事件監聽器
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (messageInput) {
      // 自動調整高度
      messageInput.addEventListener('input', autoResizeTextarea);
      
      // 鍵盤事件：Enter發送，Shift+Enter換行
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (!sendBtn.disabled && !isSending) {
            handleSendMessage();
          }
        }
      });
    }
    
    if (sendBtn) {
      sendBtn.addEventListener('click', handleSendMessage);
    }
    
    // 快速按鈕事件
    const quickButtons = document.getElementById('quickButtons');
    if (quickButtons) {
      quickButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-btn')) {
          const text = e.target.getAttribute('data-text');
          if (text && messageInput) {
            messageInput.value = text;
            autoResizeTextarea();
            handleSendMessage();
          }
        }
      });
    }
  } catch (error) {
    console.error('初始化 ChatGPT 功能錯誤:', error);
  }
}

// 處理發送訊息
async function handleSendMessage() {
  const messageInput = document.getElementById('messageInput');
  if (!messageInput || isSending) return;
  
  const message = messageInput.value.trim();
  if (!message) return;
  
  isSending = true;
  await sendMessage(message);
  isSending = false;
}

// 創建訊息元素
function createMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  
  if (role === 'user') {
    // 嘗試載入Google用戶頭像
    const userAvatarImg = document.getElementById('userAvatar');
    if (userAvatarImg && userAvatarImg.src && userAvatarImg.src !== '') {
      const img = document.createElement('img');
      img.src = userAvatarImg.src;
      img.alt = '用戶頭像';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      avatarDiv.appendChild(img);
    } else {
      avatarDiv.textContent = '👤';
    }
  } else {
    avatarDiv.textContent = '🤖';
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  if (role === 'assistant' && content) {
    if (window.safeRenderMarkdown) {
      contentDiv.innerHTML = window.safeRenderMarkdown(content);
    } else if (typeof marked !== 'undefined') {
      contentDiv.innerHTML = marked.parse(content);
    } else {
      contentDiv.textContent = content;
    }
    // 對代碼塊進行語法高亮
    if (typeof hljs !== 'undefined') {
      contentDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  } else if (role === 'user') {
    contentDiv.textContent = content;
  }
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  return messageDiv;
}

// 創建載入動畫
function createTypingIndicator() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  avatarDiv.textContent = '🤖';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = `
    <div class="typing-indicator">
      <span>AI正在思考中</span>
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  return messageDiv;
}

// 自動調整輸入框高度
function autoResizeTextarea() {
  const textarea = document.getElementById('messageInput');
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    
    // 更新發送按鈕狀態
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
      sendBtn.disabled = textarea.value.trim() === '';
    }
  }
}

// 發送訊息（整合原有後端和LLM設定）
async function sendMessage(message) {
  if (!message || !message.trim()) return;
  
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const quickButtons = document.getElementById('quickButtons');
  
  // 添加用戶訊息
  const userMessage = createMessage('user', message);
  chatMessages.appendChild(userMessage);
  
  // 記錄長期記憶（用戶訊息）
  if (window.recordConversationMessage) {
    try { 
      await window.recordConversationMessage('ai_advisor', 'user', message); 
    } catch (error) {
      console.error('長期記憶儲存異常 (AI 顧問 - user):', error);
    }
  }
  
  // 隱藏快速按鈕
  if (quickButtons) {
    quickButtons.style.display = 'none';
  }
  
  // 清空輸入框並禁用
  messageInput.value = '';
  messageInput.disabled = true;
  sendBtn.disabled = true;
  autoResizeTextarea();
  
  // 添加載入動畫
  const typingIndicator = createTypingIndicator();
  chatMessages.appendChild(typingIndicator);
  
  // 滾動到底部
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  try {
    // 使用原有的後端API和LLM設定
    const endpoint = `${API_URL}/api/chat/stream`;
    const headers = { 'Content-Type': 'application/json' };
    if (ipPlanningToken) {
      headers['Authorization'] = `Bearer ${ipPlanningToken}`;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: message,
        platform: null,
        topic: null,
        duration: null,
        style: null,
        profile: null,
        history: [],
        user_id: ipPlanningUser?.user_id || null,
        conversation_type: 'ai_advisor'  // 指定對話類型
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 移除載入動畫
    chatMessages.removeChild(typingIndicator);
    
    // 創建AI回應容器
    const aiMessage = createMessage('assistant', '');
    chatMessages.appendChild(aiMessage);
    
    const contentDiv = aiMessage.querySelector('.message-content');
    
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
            // 記錄長期記憶（AI 回覆）
            if (window.recordConversationMessage) {
              try { 
                await window.recordConversationMessage('ai_advisor', 'assistant', fullContent); 
              } catch (error) {
                console.error('長期記憶儲存異常 (AI 顧問 - assistant):', error);
              }
            }
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              if (window.safeRenderMarkdown) {
                contentDiv.innerHTML = window.safeRenderMarkdown(fullContent);
              } else if (typeof marked !== 'undefined') {
                contentDiv.innerHTML = marked.parse(fullContent);
              } else {
                contentDiv.textContent = fullContent;
              }
              
              // 對代碼塊進行語法高亮
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
    
    // 移除載入動畫
    if (chatMessages.contains(typingIndicator)) {
      chatMessages.removeChild(typingIndicator);
    }
    
    // 顯示錯誤訊息
    const errorMessage = createMessage('assistant', `抱歉，發生了錯誤：${error.message}`);
    chatMessages.appendChild(errorMessage);
  }
  
  // 恢復輸入框和按鈕
  if (messageInput) {
    messageInput.disabled = false;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    autoResizeTextarea();
  }
  if (sendBtn) {
    sendBtn.disabled = false;
  }
  
  // 顯示快速按鈕
  if (quickButtons) {
    quickButtons.style.display = 'flex';
  }
  
  // 滾動到底部
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

