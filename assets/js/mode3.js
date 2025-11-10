// mode3.js - 一鍵生成模式專用函數
// 從 mode3.html 提取的所有 JavaScript 代碼

// API_BASE_URL 已在 config.js 中定義為全局變數
// 這裡直接使用 window.APP_CONFIG，避免重複聲明
const API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
let currentPlatform = null;
let currentTopic = null;
let currentProfile = null;
const styleInstruction = '格式要求：分段清楚，短句，每段換行，適度加入表情符號（如：✅✨🔥📌），避免口頭禪。絕對不要使用 ** 或任何 Markdown 格式符號，所有內容必須是純文字格式。';

// 從 localStorage 獲取用戶資訊
let ipPlanningToken = localStorage.getItem('ipPlanningToken') || '';
let ipPlanningUser = JSON.parse(localStorage.getItem('ipPlanningUser') || 'null');

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
  // 檢查權限（需要登入和訂閱）
  if (window.ReelMindCommon) {
    const hasAccess = await window.ReelMindCommon.checkFeatureAccess();
    if (!hasAccess) {
      return;
    }
  }

  // 更新用戶資訊顯示
  updateUserInfo();
  
  // 初始化設定區塊
  initSettingsBlock();
  
  // 初始化標籤切換
  initTabs();

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
});

// 更新用戶資訊顯示
function updateUserInfo() {
  if (window.ReelMindCommon && window.ReelMindCommon.isLoggedIn()) {
    const user = window.ReelMindCommon.getUser();
    if (user) {
      const userInfo = document.getElementById('userInfo');
      const userAvatar = document.getElementById('userAvatar');
      const userName = document.getElementById('userName');
      const authButtons = document.getElementById('authButtons');
      const userDBTab = document.getElementById('userDBTab');
      
      if (userInfo && userAvatar && userName) {
        userAvatar.src = user.picture || user.avatar || 'https://via.placeholder.com/32';
        userName.textContent = user.name || '用戶';
        userInfo.style.display = 'flex';
        if (authButtons) authButtons.style.display = 'none';
        if (userDBTab) userDBTab.style.display = 'inline-block';
      }
    }
  } else {
    const userInfo = document.getElementById('userInfo');
    const authButtons = document.getElementById('authButtons');
    if (userInfo) userInfo.style.display = 'none';
    if (authButtons) authButtons.style.display = 'block';
  }
}

// 初始化設定區塊
function initSettingsBlock() {
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsContent = document.getElementById('settingsContent');
  const instructions = document.getElementById('oneClickInstructions');
  
  if (settingsToggle && settingsContent && instructions) {
    settingsToggle.addEventListener('click', () => {
      const isExpanded = settingsContent.style.display !== 'none';
      settingsContent.style.display = isExpanded ? 'none' : 'block';
      instructions.style.display = isExpanded ? 'none' : 'block';
      const toggleIcon = settingsToggle.querySelector('.settings-toggle');
      if (toggleIcon) {
        toggleIcon.textContent = isExpanded ? '▶' : '▼';
      }
    });

    // 監聽設定區塊的展開/收合
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const isExpanded = settingsContent.style.display !== 'none';
          instructions.style.display = isExpanded ? 'block' : 'none';
        }
      });
    });
    
    observer.observe(settingsContent, { attributes: true });
    
    // 初始狀態檢查
    const isExpanded = settingsContent.style.display !== 'none';
    instructions.style.display = isExpanded ? 'block' : 'none';
  }

  // 套用設定按鈕
  const applyBtn = document.getElementById('applyBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const platform = document.getElementById('platformSelect')?.value;
      const topic = document.getElementById('topicInput')?.value;
      const duration = document.getElementById('durationInput')?.value;
      const positioning = document.getElementById('positioningInput')?.value;
      
      if (platform) {
        currentPlatform = platform;
        currentTopic = topic;
        currentProfile = positioning;
        
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('設定已套用', 2000);
        }
        
        // 自動收合設定區塊
        if (settingsContent) {
          settingsContent.style.display = 'none';
          if (instructions) instructions.style.display = 'none';
          const toggleIcon = settingsToggle?.querySelector('.settings-toggle');
          if (toggleIcon) toggleIcon.textContent = '▶';
        }
      } else {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('請選擇平台', 3000);
        }
      }
    });
  }
}

// 初始化標籤切換
function initTabs() {
  document.querySelectorAll('.result-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

// 標籤切換功能
function switchTab(tabName) {
  // 移除所有標籤的 active 類別
  document.querySelectorAll('.result-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 隱藏所有結果內容
  document.querySelectorAll('.result-content').forEach(content => {
    content.style.display = 'none';
  });
  
  // 激活選中的標籤
  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  // 顯示對應的結果內容
  let contentId = '';
  if (tabName === 'positioning') {
    contentId = 'positioningResult';
  } else if (tabName === 'topics') {
    contentId = 'topicSelectionResult';
  } else if (tabName === 'script') {
    contentId = 'scriptResult';
  }
  
  const activeContent = document.getElementById(contentId);
  if (activeContent) {
    activeContent.style.display = 'block';
  }
}

// 更新結果區塊內容
function updateResultBlock(blockId, content, hasContent = true) {
  const block = document.getElementById(blockId);
  if (block) {
    if (window.safeSetText) {
      window.safeSetText(block, content);
    } else {
      block.textContent = content;
    }
    if (hasContent) {
      block.classList.add('has-content');
    } else {
      block.classList.remove('has-content');
    }
  }
}

// 生成帳號定位
async function generatePositioning() {
  const platformEl = document.getElementById('platformSelect');
  const topicEl = document.getElementById('topicInput');
  const positioningEl = document.getElementById('positioningInput');
  
  const platform = platformEl ? platformEl.value : '';
  const topic = topicEl ? topicEl.value : '';
  const positioning = positioningEl ? positioningEl.value : '';
  
  if (!platform) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇平台', 3000);
    }
    return;
  }
  
  updateResultBlock('positioningContent', '正在分析帳號定位...', false);
  document.getElementById('positioningActions').style.display = 'flex';
  
  try {
    const response = await fetch(`${API_URL}/api/generate/positioning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        message: '請幫我進行帳號定位分析',
        platform: platform,
        topic: topic,
        duration: '30',
        style: styleInstruction,
        profile: positioning,
        history: [],
        user_id: ipPlanningUser?.user_id || null
      })
    });
    
    if (!response.ok) {
      throw new Error('生成失敗');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && data.content) {
              result += data.content;
              updateResultBlock('positioningContent', result, true);
            } else if (data.type === 'end') {
              break;
            } else if (data.type === 'error') {
              throw new Error(data.message || '生成失敗');
            }
          } catch (e) {
            console.error('解析錯誤:', e);
          }
        }
      }
    }
    
    switchTab('positioning');
    
    // 自動保存帳號定位到後端
    if (result && ipPlanningToken && ipPlanningUser) {
      try {
        const saveResponse = await fetch(`${API_URL}/api/user/positioning/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ipPlanningToken}`
          },
          body: JSON.stringify({
            user_id: ipPlanningUser.user_id,
            content: result
          })
        });
        
        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast(`帳號定位已自動儲存（編號：${saveData.record_number}）`, 2000);
          }
        }
      } catch (saveError) {
        console.error('自動儲存失敗:', saveError);
      }
    }
    
  } catch (error) {
    updateResultBlock('positioningContent', '生成失敗，請稍後再試', false);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('生成帳號定位失敗', 3000);
    }
  }
}

// 生成選題
async function generateTopics() {
  const platformEl = document.getElementById('platformSelect');
  const topicEl = document.getElementById('topicInput');
  const positioningEl = document.getElementById('positioningInput');
  
  const platform = platformEl ? platformEl.value : '';
  const topic = topicEl ? topicEl.value : '';
  const positioning = positioningEl ? positioningEl.value : '';
  
  const positioningContent = document.getElementById('positioningContent').textContent.trim();
  const isDefaultText = positioningContent.includes('請點選「一鍵生成帳號定位」按鈕開始') ||
                       positioningContent.includes('點擊「一鍵生成帳號定位」') || 
                       positioningContent.includes('開始分析');
  
  if (!positioningContent || isDefaultText) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先完成帳號定位', 3000);
    }
    return;
  }
  
  if (!platform) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇平台', 3000);
    }
    return;
  }
  
  updateResultBlock('topicContent', '正在推薦選題...', false);
  document.getElementById('topicActions').style.display = 'flex';
  
  try {
    const response = await fetch(`${API_URL}/api/generate/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        message: '請幫我推薦選題',
        platform: platform,
        topic: topic,
        duration: '30',
        style: styleInstruction,
        profile: positioning,
        history: [],
        user_id: ipPlanningUser?.user_id || null
      })
    });
    
    if (!response.ok) {
      throw new Error('生成失敗');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = '';
    let generationEnded = false;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && data.content) {
              result += data.content;
              updateResultBlock('topicContent', result, true);
            } else if (data.type === 'end') {
              generationEnded = true;
              break;
            } else if (data.type === 'error') {
              throw new Error(data.message || '生成失敗');
            }
          } catch (e) {
            console.error('解析錯誤:', e);
          }
        }
      }
        
      if (generationEnded) break;
    }
    
    switchTab('topics');
    
    // 自動保存選題內容到後端
    if (generationEnded && result && result.trim() && ipPlanningToken && ipPlanningUser && ipPlanningUser.user_id) {
      try {
        const saveResponse = await fetch(`${API_URL}/api/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ipPlanningToken}`
          },
          body: JSON.stringify({
            user_id: ipPlanningUser.user_id,
            content: result,
            platform: platform,
            topic: topic || '選題推薦'
          })
        });
        
        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          console.log('選題已自動儲存:', saveData);
        }
      } catch (saveError) {
        console.error('自動儲存選題失敗:', saveError);
      }
    }
    
  } catch (error) {
    updateResultBlock('topicContent', '生成失敗，請稍後再試', false);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('生成選題失敗', 3000);
    }
  }
}

// 生成腳本
async function generateScript() {
  const platformEl = document.getElementById('platformSelect');
  const topicEl = document.getElementById('topicInput');
  const positioningEl = document.getElementById('positioningInput');
  
  const platform = platformEl ? platformEl.value : '';
  const topic = topicEl ? topicEl.value : '';
  const positioning = positioningEl ? positioningEl.value : '';
  
  const positioningContent = document.getElementById('positioningContent').textContent.trim();
  const topicContent = document.getElementById('topicContent').textContent.trim();
  
  const isPositioningDefault = positioningContent.includes('請點選「一鍵生成帳號定位」按鈕開始') || 
                               positioningContent.includes('點擊「一鍵生成帳號定位」') || 
                               positioningContent.includes('開始分析');
  const isTopicDefault = topicContent.includes('請點選「一鍵生成選題」按鈕開始') ||
                        topicContent.includes('完成帳號定位') || 
                        topicContent.includes('進行選題') ||
                        topicContent.includes('點擊「一鍵生成選題」');
  
  if (!positioningContent || isPositioningDefault) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先完成帳號定位', 3000);
    }
    return;
  }
  
  if (!topicContent || isTopicDefault) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先完成選題推薦', 3000);
    }
    return;
  }
  
  if (!platform) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇平台', 3000);
    }
    return;
  }
  
  updateResultBlock('scriptContent', '正在生成腳本...', false);
  document.getElementById('scriptActions').style.display = 'flex';
  
  try {
    const durationInput = document.getElementById('durationInput');
    const response = await fetch(`${API_URL}/api/generate/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        message: '請幫我生成完整腳本',
        platform: platform,
        topic: topic,
        duration: durationInput ? durationInput.value || '30' : '30',
        style: styleInstruction,
        profile: positioning,
        history: [],
        user_id: ipPlanningUser?.user_id || null
      })
    });
    
    if (!response.ok) {
      throw new Error('生成失敗');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && data.content) {
              result += data.content;
              updateResultBlock('scriptContent', result, true);
            } else if (data.type === 'end') {
              break;
            } else if (data.type === 'error') {
              throw new Error(data.message || '生成失敗');
            }
          } catch (e) {
            console.error('解析錯誤:', e);
          }
        }
      }
    }
    
    switchTab('script');
    
  } catch (error) {
    updateResultBlock('scriptContent', '生成失敗，請稍後再試', false);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('生成腳本失敗', 3000);
    }
  }
}

// 儲存結果
async function saveResult(type) {
  if (!ipPlanningUser || !ipPlanningUser.user_id) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  let content = '';
  let contentElement = null;
  
  switch(type) {
    case 'positioning':
      contentElement = document.getElementById('positioningContent');
      break;
    case 'topics':
      contentElement = document.getElementById('topicContent');
      break;
    case 'script':
      contentElement = document.getElementById('scriptContent');
      break;
  }
  
  if (contentElement) {
    content = contentElement.textContent;
    
    if (type === 'positioning') {
      try {
        const response = await fetch(`${API_URL}/api/user/positioning/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ipPlanningToken}`
          },
          body: JSON.stringify({
            user_id: ipPlanningUser.user_id,
            content: content
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast(`帳號定位已儲存（編號：${data.record_number}）`, 3000);
          }
        } else {
          throw new Error('儲存失敗');
        }
      } catch (error) {
        console.error('儲存錯誤:', error);
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('儲存失敗，請稍後再試', 3000);
        }
      }
    } else {
      localStorage.setItem(`saved_${type}`, content);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`${type === 'topics' ? '選題' : '腳本'}已儲存`, 2000);
      }
    }
  }
}

// 儲存腳本
async function saveScript() {
  if (!ipPlanningUser || !ipPlanningUser.user_id || !ipPlanningToken) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  const content = document.getElementById('scriptContent').textContent;
  if (!content || content.includes('請點選「一鍵生成腳本」按鈕開始') || content.includes('請先完成')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('沒有可儲存的內容', 3000);
    }
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/scripts/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        user_id: ipPlanningUser.user_id,
        content: content,
        platform: currentPlatform || '未設定',
        topic: currentTopic || '未設定',
        profile: currentProfile || '未設定'
      })
    });
    
    if (response.ok) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('腳本儲存成功！', 3000);
      }
    } else if (response.status === 404) {
      localStorage.setItem(`saved_script_${Date.now()}`, content);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('腳本已儲存到本地！', 3000);
      }
    } else {
      throw new Error('儲存失敗');
    }
  } catch (error) {
    console.error('Save script error:', error);
    localStorage.setItem(`saved_script_${Date.now()}`, content);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('腳本已儲存到本地！', 3000);
    }
  }
}

// 重新生成結果
async function regenerateResult(type) {
  switch(type) {
    case 'positioning':
      await generatePositioning();
      break;
    case 'topics':
      await generateTopics();
      break;
    case 'script':
      await generateScript();
      break;
  }
}

// 登入函數
function goToLogin() {
  if (window.ReelMindCommon && window.ReelMindCommon.goToLogin) {
    window.ReelMindCommon.goToLogin();
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

