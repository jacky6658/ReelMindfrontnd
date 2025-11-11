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
  
  // 更新用戶資訊顯示
  updateUserInfo();
  
  // 載入用戶記憶（長期記憶和短期記憶）- 在權限檢查之前載入，確保日誌能輸出
  if (isLoggedIn && ipPlanningUser?.user_id) {
    console.log('📚 開始載入用戶記憶...');
    await loadUserMemory();
  } else {
    console.warn('⚠️ 無法載入記憶：用戶未登入或缺少用戶ID');
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
    
    // 檢查用戶訊息是否包含腳本相關請求，如果是，添加結構選擇提示
    let enhancedMessage = message;
    const scriptKeywords = ['腳本', '腳本建議', '生成腳本', '寫腳本', '腳本結構', '腳本格式', '腳本範例', '提供腳本', '給我腳本', '幫我寫腳本', '腳本給我'];
    const planningKeywords = ['規劃', '接下來', '未來', '之後', '下一步', '內容規劃', '腳本規劃', '選題規劃', '14天', '內容策略'];
    const isScriptRequest = scriptKeywords.some(keyword => message.includes(keyword));
    const isPlanningRequest = planningKeywords.some(keyword => message.includes(keyword));
    
    if (isScriptRequest) {
      // 在訊息中添加強化的提示，讓 AI 必須先詢問結構或提供多種選項，而不是直接生成 A 結構
      enhancedMessage = `${message}\n\n[重要系統提示：用戶要求提供腳本。請務必遵守以下規則：
1. 絕對不要直接生成腳本，必須先詢問用戶想要的腳本結構（A/B/C/D/E）
2. 或者提供多種結構選項讓用戶選擇，以表格形式呈現，包含以下五種結構的詳細說明：

A. 標準行銷三段式（Hook → Value → CTA）【通用/帶貨】
   - 30秒版本：Hook 0–5s / Value 5–25s / CTA 25–30s
   - 45秒版本：Hook 0–7s / Value 7–38s / CTA 38–45s
   - 60秒版本：Hook 0–10s / Value 10–52s / CTA 52–60s
   - Hook：吸睛鉤子（痛點/反差/數據/疑問）
   - Value：最多三個重點（機制/步驟/見證/對比）
   - CTA：明確下一步（點連結、留言、關注/收藏）
   適合：產品推廣、快速轉換

B. 問題 → 解決 → 證明（Problem → Solution → Proof）【教育/建立信任】
   - 30秒版本：問題 0–8s / 解決 8–22s / 證明 22–30s
   - 45秒版本：問題 0–12s / 解決 12–35s / 證明 35–45s
   - 60秒版本：問題 0–15s / 解決 15–48s / 證明 48–60s
   - 用場景/台詞丟痛點 → 給解法 → 拿實證/案例/對比收尾
   適合：教學內容、建立專業形象

C. Before → After → 秘密揭露【視覺反差/爆量】
   - 30秒版本：After 0–5s / Before 5–20s / 秘密揭露 20–30s
   - 45秒版本：After 0–7s / Before 7–32s / 秘密揭露 32–45s
   - 60秒版本：After 0–10s / Before 10–45s / 秘密揭露 45–60s
   - 先閃現結果（After）→ 回顧 Before → 揭露方法/產品/關鍵動作
   適合：效果展示、吸引眼球

D. 教學知識型（迷思 → 原理 → 要點 → 行動）【冷受眾】
   - 30秒版本：迷思 0–6s / 原理 6–15s / 要點 15–24s / 行動 24–30s
   - 45秒版本：迷思 0–9s / 原理 9–22s / 要點 22–36s / 行動 36–45s
   - 60秒版本：迷思 0–12s / 原理 12–30s / 要點 30–48s / 行動 48–60s
   - 用「你知道為什麼…？」切入；重點條列，搭字幕與圖示
   適合：知識科普、教育內容

E. 故事敘事型（起 → 承 → 轉 → 合）【人設/口碑】
   - 30秒版本：起 0–7s / 承 7–15s / 轉 15–23s / 合 23–30s
   - 45秒版本：起 0–10s / 承 10–22s / 轉 22–35s / 合 35–45s
   - 60秒版本：起 0–13s / 承 13–30s / 轉 30–47s / 合 47–60s
   - 個人經歷/阻礙/轉折/感悟，最後落到價值與行動
   適合：個人品牌、情感連結

3. 每種結構請簡要說明其特點和適用場景
4. 如果用戶提到時長（如30秒、45秒、60秒），請根據時長和選擇的結構調整時間分配（參考上面的時間分配表）
5. 等待用戶選擇結構後，再根據選擇的結構和時長生成對應格式的腳本
6. 如果用戶沒有明確選擇結構，請再次提醒用戶選擇，不要預設使用 A 結構
7. ⚠️ 極重要：生成腳本時必須使用對應結構的專屬命名，絕對不要混用：
   - A 結構：使用「Hook、Value、CTA」
   - B 結構：使用「問題、解決、證明」（絕對不要用 Hook、Value、CTA）
   - C 結構：使用「After、Before、秘密揭露」（絕對不要用 Hook、Value、CTA）
   - D 結構：使用「迷思、原理、要點、行動」（絕對不要用 Hook、Value、CTA）
   - E 結構：使用「起、承、轉、合」（絕對不要用 Hook、Value、CTA）
   例如：B 結構應標示為「問題（開場鉤子:問題）」，而不是「Hook（開場鉤子:問題）」
8. ⚠️ 極重要格式要求：生成腳本時必須按照時間分配為主軸，每個時間段都要明確標示：
   - 時間標示：例如「0-5s (Hook)」或「0-8s (問題)」
   - 台詞內容：該時間段要說的台詞
   - 畫面描述：該時間段的鏡頭/畫面建議
   - 字幕建議：該時間段的字幕文字
   - 音效建議：該時間段的音效或轉場
   這樣才能正確儲存到創作者資料庫中]`;
    }
    
    // 檢查是否為腳本規劃請求
    if (isPlanningRequest && !isScriptRequest) {
      // 在訊息中添加規劃提示
      enhancedMessage = `${message}\n\n[系統提示：用戶要求規劃接下來的腳本或內容策略。請協助用戶：
1. 分析用戶的帳號定位、目標受眾和內容目標
2. 提供選題方向建議（3-5個具體選題）
3. 建議適合的腳本結構（A/B/C/D/E）和時長（30s/45s/60s）
4. 可以規劃短期（1週）或中期（14天）的內容策略
5. 提供內容發布節奏建議
6. 根據用戶的目標和受眾，給出專業的內容規劃建議]`;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: enhancedMessage,
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
      // 如果請求失敗，移除載入動畫並顯示錯誤
      chatMessages.removeChild(typingIndicator);
      const errorMessage = createMessage('assistant', '❌ 發生錯誤，請稍後再試。');
      chatMessages.appendChild(errorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 創建AI回應容器（先創建，但內容先顯示載入動畫）
    const aiMessage = createMessage('assistant', '');
    const contentDiv = aiMessage.querySelector('.message-content');
    // 先將載入動畫移到 AI 訊息容器中
    contentDiv.innerHTML = typingIndicator.querySelector('.message-content').innerHTML;
    // 移除舊的載入動畫
    chatMessages.removeChild(typingIndicator);
    // 添加 AI 訊息容器
    chatMessages.appendChild(aiMessage);
    
    // 處理串流回應
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let hasReceivedContent = false; // 標記是否已收到內容
    
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
              // 第一次收到內容時，移除載入動畫
              if (!hasReceivedContent) {
                hasReceivedContent = true;
                contentDiv.innerHTML = ''; // 清空載入動畫
              }
              
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

