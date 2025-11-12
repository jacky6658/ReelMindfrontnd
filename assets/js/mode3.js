// mode3.js - 一鍵生成模式專用函數
// 從 mode3.html 提取的所有 JavaScript 代碼

// API_BASE_URL 已在 config.js 中定義為全局變數
// 這裡直接使用 window.APP_CONFIG，避免重複聲明
// 使用 window 檢查避免重複聲明錯誤
if (typeof window.API_URL === 'undefined') {
  window.API_URL = window.APP_CONFIG?.API_BASE || 'https://aivideobackend.zeabur.app';
}
// 使用 window 對象避免 const 重複聲明錯誤（如果腳本被載入兩次）
// 檢查是否已經在當前作用域中聲明過 API_URL
if (typeof API_URL === 'undefined') {
  var API_URL = window.API_URL; // 使用 var 而不是 const，避免重複聲明錯誤
}
let currentPlatform = null;
let currentTopic = null;
let currentProfile = null;
let selectedScriptStructure = null; // 選中的腳本結構（A/B/C/D/E）
const styleInstruction = '格式要求：分段清楚，短句，每段換行，適度加入表情符號（如：✅✨🔥📌），避免口頭禪。絕對不要使用 ** 或任何 Markdown 格式符號，所有內容必須是純文字格式。';

// 從 localStorage 獲取用戶資訊
let ipPlanningToken = localStorage.getItem('ipPlanningToken') || '';
let ipPlanningUser = JSON.parse(localStorage.getItem('ipPlanningUser') || 'null');

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 ========== Mode3 (一鍵生成) 頁面初始化 ==========');
  
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
  
  // 初始化步驟式流程
  initStepFlow();
  
  // 初始化按鈕選擇器（平台、目標）
  initButtonSelectors();
  
  // 初始化腳本結構選擇按鈕
  initScriptStructureButtons();
  
  // 初始化標籤切換（Step 3 結果頁面）
  initTabs();
  
  // 初始化表單驗證
  initFormValidation();
  
  console.log('✅ ========== Mode3 頁面初始化完成 ==========');
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
      
      if (!platform) {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('請選擇平台', 3000);
        }
        return;
      }
      
      if (!selectedScriptStructure) {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('請選擇腳本結構', 3000);
        }
        return;
      }
      
      currentPlatform = platform;
      currentTopic = topic;
      currentProfile = positioning;
      
      // 顯示通知（確保一定會顯示）
      const showNotification = (message, duration = 3000) => {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast(message, duration);
        } else {
          const toastEl = document.getElementById('toast');
          if (toastEl) {
            toastEl.textContent = message;
            toastEl.style.display = 'block';
            toastEl.style.opacity = '1';
            setTimeout(() => {
              toastEl.style.opacity = '0';
              setTimeout(() => {
                toastEl.style.display = 'none';
              }, 300);
            }, duration);
          } else {
            alert(message);
          }
        }
      };
      
      showNotification('✅ 設定已套用', 2000);
      
      // 自動收合設定區塊
      if (settingsContent) {
        settingsContent.style.display = 'none';
        if (instructions) instructions.style.display = 'none';
        const toggleIcon = settingsToggle?.querySelector('.settings-toggle');
        if (toggleIcon) toggleIcon.textContent = '▶';
      }
    });
  }
}

// 初始化步驟式流程
function initStepFlow() {
  let currentStep = 1;
  
  // Step 1 → Step 2
  const nextToStep2Btn = document.getElementById('nextToStep2');
  if (nextToStep2Btn) {
    nextToStep2Btn.addEventListener('click', () => {
      if (validateStep1()) {
        updateConfirmContent();
        goToStep(2);
      }
    });
  }
  
  // Step 2 → Step 1 (返回)
  const backToStep1Btn = document.getElementById('backToStep1');
  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
      goToStep(1);
    });
  }
  
  // Step 2 → Step 3 (生成)
  const generateAllBtn = document.getElementById('generateAll');
  if (generateAllBtn) {
    generateAllBtn.addEventListener('click', async () => {
      await generateAll();
    });
  }
  
  // 重新生成按鈕
  const regenerateAllBtn = document.getElementById('regenerateAll');
  if (regenerateAllBtn) {
    regenerateAllBtn.addEventListener('click', () => {
      goToStep(1);
      // 重置表單
      resetForm();
    });
  }
}

// 切換步驟
function goToStep(step) {
  // 隱藏所有步驟內容
  document.querySelectorAll('.step-content').forEach(el => {
    el.classList.remove('active');
  });
  
  // 顯示對應步驟
  if (step === 1) {
    const stepEl = document.getElementById('step1');
    if (stepEl) stepEl.classList.add('active');
  } else if (step === 2) {
    const stepEl = document.getElementById('step2');
    if (stepEl) stepEl.classList.add('active');
  } else if (step === 3) {
    // Step 3 有兩個狀態：載入中和結果
    // 預設顯示結果頁面（如果已有結果）
    const resultStep = document.getElementById('step3Result');
    const loadingStep = document.getElementById('step3Loading');
    
    // 檢查是否已有結果
    const hasResults = document.getElementById('positioningContent')?.textContent.trim() && 
                       document.getElementById('positioningContent')?.textContent.trim() !== '正在生成...';
    
    if (hasResults && resultStep) {
      resultStep.classList.add('active');
    } else if (loadingStep) {
      loadingStep.classList.add('active');
    }
  }
  
  // 更新進度指示器
  updateProgressIndicator(step);
  
  // 滾動到頂部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 更新進度指示器
function updateProgressIndicator(currentStep) {
  for (let i = 1; i <= 3; i++) {
    const circle = document.getElementById(`stepCircle${i}`);
    const label = document.getElementById(`stepLabel${i}`);
    const connector = document.getElementById(`connector${i}`);
    
    if (i < currentStep) {
      // 已完成
      if (circle) circle.className = 'progress-step-circle completed';
      if (label) label.className = 'progress-step-label';
      if (connector) connector.className = 'progress-step-connector active';
    } else if (i === currentStep) {
      // 當前步驟
      if (circle) circle.className = 'progress-step-circle active';
      if (label) label.className = 'progress-step-label active';
      if (i > 1 && connector) {
        const prevConnector = document.getElementById(`connector${i - 1}`);
        if (prevConnector) prevConnector.className = 'progress-step-connector active';
      }
    } else {
      // 未完成
      if (circle) circle.className = 'progress-step-circle inactive';
      if (label) label.className = 'progress-step-label inactive';
      if (i > 1 && connector) {
        const prevConnector = document.getElementById(`connector${i - 1}`);
        if (prevConnector) prevConnector.className = 'progress-step-connector inactive';
      }
    }
  }
}

// 初始化按鈕選擇器（平台、目標）
function initButtonSelectors() {
  // 目標選擇器
  document.querySelectorAll('.button-selector[data-goal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 找到最近的 .button-grid 父元素，只移除該組內的按鈕選中狀態
      const buttonGrid = btn.closest('.button-grid');
      if (buttonGrid) {
        buttonGrid.querySelectorAll('.button-selector[data-goal]').forEach(b => {
          b.classList.remove('selected');
        });
      }
      
      // 添加選中狀態
      btn.classList.add('selected');
      checkStep1Validation();
    });
  });
  
  // 平台選擇器
  document.querySelectorAll('.button-selector[data-platform]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 找到最近的 .button-grid 父元素，只移除該組內的按鈕選中狀態
      const buttonGrid = btn.closest('.button-grid');
      if (buttonGrid) {
        buttonGrid.querySelectorAll('.button-selector[data-platform]').forEach(b => {
          b.classList.remove('selected');
        });
      }
      
      // 添加選中狀態
      btn.classList.add('selected');
      checkStep1Validation();
    });
  });
}

// 初始化表單驗證
function initFormValidation() {
  // 監聽所有必填項的變化
  const requiredInputs = ['topicInput', 'positioningInput', 'durationInput'];
  requiredInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', checkStep1Validation);
      el.addEventListener('change', checkStep1Validation);
    }
  });
  
  // 監聽結構選擇
  document.querySelectorAll('.structure-btn').forEach(btn => {
    btn.addEventListener('click', checkStep1Validation);
  });
  
  // 初始檢查
  checkStep1Validation();
}

// 檢查 Step 1 表單驗證
function checkStep1Validation() {
  const topic = document.getElementById('topicInput')?.value.trim();
  const positioning = document.getElementById('positioningInput')?.value.trim();
  const duration = document.getElementById('durationInput')?.value;
  const goal = document.querySelector('.button-selector[data-goal].selected');
  const platform = document.querySelector('.button-selector[data-platform].selected');
  const structure = document.querySelector('.structure-btn.selected');
  
  const isValid = topic && positioning && duration && goal && platform && structure;
  
  const nextBtn = document.getElementById('nextToStep2');
  if (nextBtn) {
    nextBtn.disabled = !isValid;
  }
  
  return isValid;
}

// 驗證 Step 1
function validateStep1() {
  if (!checkStep1Validation()) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請填寫所有必填項', 3000);
    }
    return false;
  }
  return true;
}

// 更新確認頁面內容
function updateConfirmContent() {
  const topic = document.getElementById('topicInput')?.value.trim();
  const positioning = document.getElementById('positioningInput')?.value.trim();
  const duration = document.getElementById('durationInput')?.value;
  const goal = document.querySelector('.button-selector[data-goal].selected')?.getAttribute('data-goal');
  const platform = document.querySelector('.button-selector[data-platform].selected')?.getAttribute('data-platform');
  const structure = document.querySelector('.structure-btn.selected')?.getAttribute('data-structure');
  const style = document.getElementById('styleInput')?.value.trim();
  
  const structureNames = {
    'A': '標準行銷三段式',
    'B': '問題→解決→證明',
    'C': 'Before→After',
    'D': '教學知識型',
    'E': '故事敘事型'
  };
  
  const confirmContent = document.getElementById('confirmContent');
  if (confirmContent) {
    confirmContent.innerHTML = `
      <div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">主題或產品</p>
        <p style="font-weight: 500; font-size: 16px;">${topic}</p>
      </div>
      <div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">帳號定位</p>
        <p style="font-weight: 500; font-size: 16px;">${positioning}</p>
      </div>
      <div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">影片目標</p>
        <p style="font-weight: 500; font-size: 16px;">${goal}</p>
      </div>
      <div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">社群平台</p>
        <p style="font-weight: 500; font-size: 16px;">${platform}</p>
      </div>
      <div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">腳本秒數</p>
        <p style="font-weight: 500; font-size: 16px;">${duration}秒</p>
      </div>
      <div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">腳本結構</p>
        <p style="font-weight: 500; font-size: 16px;">${structureNames[structure] || structure}</p>
      </div>
      ${style ? `
      <div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">補充說明</p>
        <p style="font-weight: 500; font-size: 16px;">${style}</p>
      </div>
      ` : ''}
    `;
  }
}

// 重置表單
function resetForm() {
  document.getElementById('topicInput').value = '';
  document.getElementById('positioningInput').value = '';
  document.getElementById('durationInput').value = '30';
  document.getElementById('styleInput').value = '';
  document.querySelectorAll('.button-selector').forEach(btn => btn.classList.remove('selected'));
  document.querySelectorAll('.structure-btn').forEach(btn => btn.classList.remove('selected'));
  selectedScriptStructure = null;
  checkStep1Validation();
}

// 初始化腳本結構選擇按鈕
function initScriptStructureButtons() {
  const structureButtons = document.querySelectorAll('.structure-btn');
  
  structureButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 移除所有按鈕的選中狀態
      structureButtons.forEach(b => b.classList.remove('selected'));
      
      // 添加選中狀態到當前按鈕
      btn.classList.add('selected');
      
      // 保存選中的結構
      selectedScriptStructure = btn.getAttribute('data-structure');
      
      // 顯示提示
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        const structureNames = {
          'A': '標準行銷三段式',
          'B': '問題→解決→證明',
          'C': 'Before→After',
          'D': '教學知識型',
          'E': '故事敘事型'
        };
        window.ReelMindCommon.showToast(`已選擇：${structureNames[selectedScriptStructure]}`, 2000);
      }
      
      // 觸發表單驗證
      checkStep1Validation();
    });
  });
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

// 顯示生成中動畫
function showGeneratingAnimation(blockId, message = '生成中') {
  const block = document.getElementById(blockId);
  if (block) {
    // 使用 escapeHtml 防止 XSS
    const safeMessage = window.escapeHtml ? window.escapeHtml(message) : message;
    block.innerHTML = `
      <div class="generating-container">
        <div class="generating-spinner"></div>
        <div class="generating-text">${safeMessage}<span class="generating-dots"></span></div>
      </div>
    `;
    block.classList.remove('has-content');
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

// 一次性生成所有內容（定位、選題、腳本）
async function generateAll() {
  // 獲取表單數據
  const topic = document.getElementById('topicInput')?.value.trim();
  const positioning = document.getElementById('positioningInput')?.value.trim();
  const duration = document.getElementById('durationInput')?.value;
  const goal = document.querySelector('.button-selector[data-goal].selected')?.getAttribute('data-goal');
  const platform = document.querySelector('.button-selector[data-platform].selected')?.getAttribute('data-platform');
  const structure = document.querySelector('.structure-btn.selected')?.getAttribute('data-structure');
  const style = document.getElementById('styleInput')?.value.trim() || styleInstruction;
  
  if (!topic || !positioning || !duration || !goal || !platform || !structure) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請填寫所有必填項', 3000);
    }
    return;
  }
  
  // 切換到載入頁面
  document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
  const loadingStep = document.getElementById('step3Loading');
  if (loadingStep) {
    loadingStep.classList.add('active');
  }
  updateProgressIndicator(3);
  
  // 保存當前設定
  currentPlatform = platform;
  currentTopic = topic;
  currentProfile = positioning;
  selectedScriptStructure = structure;
  
  // 顯示初始狀態
  updateResultBlock('positioningContent', '正在生成...', false);
  updateResultBlock('topicContent', '正在生成...', false);
  updateResultBlock('scriptContent', '正在生成...', false);
  
  try {
    // 同時發起三個生成請求
    const [positioningResult, topicsResult, scriptResult] = await Promise.allSettled([
      generatePositioningStream(platform, topic, positioning, style),
      generateTopicsStream(platform, topic, positioning, style),
      generateScriptStream(platform, topic, positioning, duration, structure, style)
    ]);
    
    // 處理結果
    if (positioningResult.status === 'fulfilled') {
      updateResultBlock('positioningContent', positioningResult.value, true);
      document.getElementById('positioningActions').style.display = 'flex';
    } else {
      updateResultBlock('positioningContent', '生成失敗，請稍後再試', false);
    }
    
    if (topicsResult.status === 'fulfilled') {
      updateResultBlock('topicContent', topicsResult.value, true);
      document.getElementById('topicActions').style.display = 'flex';
    } else {
      updateResultBlock('topicContent', '生成失敗，請稍後再試', false);
    }
    
    if (scriptResult.status === 'fulfilled') {
      updateResultBlock('scriptContent', scriptResult.value, true);
      document.getElementById('scriptActions').style.display = 'flex';
    } else {
      updateResultBlock('scriptContent', '生成失敗，請稍後再試', false);
    }
    
    // 切換到結果頁面
    if (loadingStep) {
      loadingStep.classList.remove('active');
    }
    const resultStep = document.getElementById('step3Result');
    if (resultStep) {
      resultStep.classList.add('active');
    }
    
    // 顯示成功通知
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('✅ 生成完成！', 3000);
    }
    
    // 自動切換到第一個標籤
    switchTab('positioning');
    
  } catch (error) {
    console.error('生成失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('生成失敗，請稍後再試', 3000);
    }
    
    // 切換到結果頁面（即使失敗也顯示）
    if (loadingStep) {
      loadingStep.classList.remove('active');
    }
    const resultStep = document.getElementById('step3Result');
    if (resultStep) {
      resultStep.classList.add('active');
    }
  }
}

// 生成帳號定位（Stream 版本，返回 Promise）
async function generatePositioningStream(platform, topic, positioning, style) {
  return new Promise(async (resolve, reject) => {
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
          style: style,
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
                // 實時更新（可選）
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
      
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// 生成選題（Stream 版本，返回 Promise）
async function generateTopicsStream(platform, topic, positioning, style) {
  return new Promise(async (resolve, reject) => {
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
          style: style,
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
                // 實時更新（可選）
                updateResultBlock('topicContent', result, true);
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
      
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// 生成腳本（Stream 版本，返回 Promise）
async function generateScriptStream(platform, topic, positioning, duration, structure, style) {
  return new Promise(async (resolve, reject) => {
    try {
      const structureMessages = {
        'A': '請使用標準行銷三段式（Hook → Value → CTA）結構生成完整腳本',
        'B': '請使用問題 → 解決 → 證明（Problem → Solution → Proof）結構生成完整腳本',
        'C': '請使用Before → After → 秘密揭露結構生成完整腳本',
        'D': '請使用教學知識型（迷思 → 原理 → 要點 → 行動）結構生成完整腳本',
        'E': '請使用故事敘事型（起 → 承 → 轉 → 合）結構生成完整腳本'
      };
      
      const durationNum = duration.toString().replace('秒', '');
      
      const response = await fetch(`${API_URL}/api/generate/script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ipPlanningToken}`
        },
        body: JSON.stringify({
          message: structureMessages[structure] || '請幫我生成完整腳本',
          platform: platform,
          topic: topic,
          duration: durationNum,
          style: style,
          profile: positioning,
          script_structure: structure,
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
                // 實時更新（可選）
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
      
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// 生成帳號定位（保留原有函數以支援獨立生成）
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
  
  // 顯示生成中動畫
  showGeneratingAnimation('positioningContent', '正在分析帳號定位');
  document.getElementById('positioningActions').style.display = 'flex';
  
  // 手機版：滾動到頂部（用戶需求設定區域）
  if (window.innerWidth <= 768) {
    const settingsBlock = document.querySelector('.settings-block');
    if (settingsBlock) {
      settingsBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
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
    
    // 移除自動儲存功能，改由用戶手動決定是否儲存
    
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
  
  // 移除帳號定位的前置檢查，允許獨立生成選題
  // 如果用戶有輸入帳號定位，則使用；如果沒有，則使用空值讓 AI 自行判斷
  
  if (!platform) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇平台', 3000);
    }
    return;
  }
  
  // 顯示生成中動畫
  showGeneratingAnimation('topicContent', '正在推薦選題');
  document.getElementById('topicActions').style.display = 'flex';
  
  // 手機版：滾動到頂部（用戶需求設定區域）
  if (window.innerWidth <= 768) {
    const settingsBlock = document.querySelector('.settings-block');
    if (settingsBlock) {
      settingsBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
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
    
    // 移除自動儲存功能，改由用戶手動決定是否儲存
    
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
  
  // 移除帳號定位和選題的前置檢查，允許獨立生成腳本
  // 如果用戶有輸入帳號定位或選題，則使用；如果沒有，則使用空值讓 AI 自行判斷
  
  if (!platform) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇平台', 3000);
    }
    return;
  }
  
  // 檢查是否選擇了腳本結構
  if (!selectedScriptStructure) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先選擇腳本結構', 3000);
    }
    return;
  }
  
  // 顯示生成中動畫
  showGeneratingAnimation('scriptContent', '正在生成腳本');
  document.getElementById('scriptActions').style.display = 'flex';
  
  // 手機版：滾動到頂部（用戶需求設定區域）
  if (window.innerWidth <= 768) {
    const settingsBlock = document.querySelector('.settings-block');
    if (settingsBlock) {
      settingsBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  try {
    const durationInput = document.getElementById('durationInput');
    
    // 根據選擇的結構生成對應的提示詞
    const structureMessages = {
      'A': '請使用標準行銷三段式（Hook → Value → CTA）結構生成完整腳本',
      'B': '請使用問題 → 解決 → 證明（Problem → Solution → Proof）結構生成完整腳本',
      'C': '請使用Before → After → 秘密揭露結構生成完整腳本',
      'D': '請使用教學知識型（迷思 → 原理 → 要點 → 行動）結構生成完整腳本',
      'E': '請使用故事敘事型（起 → 承 → 轉 → 合）結構生成完整腳本'
    };
    
    const response = await fetch(`${API_URL}/api/generate/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ipPlanningToken}`
      },
      body: JSON.stringify({
        message: structureMessages[selectedScriptStructure] || '請幫我生成完整腳本',
        platform: platform,
        topic: topic,
        duration: durationInput ? (durationInput.value || '30').replace('秒', '') : '30',
        style: styleInstruction,
        profile: positioning,
        script_structure: selectedScriptStructure, // 傳遞選中的結構
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
          // 顯示通知（確保一定會顯示）
          const showNotification = (message, duration = 3000) => {
            if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
              window.ReelMindCommon.showToast(message, duration);
            } else {
              const toastEl = document.getElementById('toast');
              if (toastEl) {
                toastEl.textContent = message;
                toastEl.style.display = 'block';
                toastEl.style.opacity = '1';
                setTimeout(() => {
                  toastEl.style.opacity = '0';
                  setTimeout(() => {
                    toastEl.style.display = 'none';
                  }, 300);
                }, duration);
              } else {
                alert(message);
              }
            }
          };
          showNotification(`✅ 帳號定位已儲存（編號：${data.record_number}）`, 3000);
        } else {
          throw new Error('儲存失敗');
        }
      } catch (error) {
        console.error('儲存錯誤:', error);
        // 顯示通知（確保一定會顯示）
        const showNotification = (message, duration = 3000) => {
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast(message, duration);
          } else {
            const toastEl = document.getElementById('toast');
            if (toastEl) {
              toastEl.textContent = message;
              toastEl.style.display = 'block';
              toastEl.style.opacity = '1';
              setTimeout(() => {
                toastEl.style.opacity = '0';
                setTimeout(() => {
                  toastEl.style.display = 'none';
                }, 300);
              }, duration);
            } else {
              alert(message);
            }
          }
        };
        showNotification('❌ 儲存失敗，請稍後再試', 3000);
      }
    } else {
      localStorage.setItem(`saved_${type}`, content);
      // 顯示通知（確保一定會顯示）
      const showNotification = (message, duration = 3000) => {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast(message, duration);
        } else {
          const toastEl = document.getElementById('toast');
          if (toastEl) {
            toastEl.textContent = message;
            toastEl.style.display = 'block';
            toastEl.style.opacity = '1';
            setTimeout(() => {
              toastEl.style.opacity = '0';
              setTimeout(() => {
                toastEl.style.display = 'none';
              }, 300);
            }, duration);
          } else {
            alert(message);
          }
        }
      };
      showNotification(`✅ ${type === 'topics' ? '選題' : '腳本'}已儲存`, 2000);
    }
  }
}

// 儲存腳本
async function saveScript() {
  console.log('saveScript() 被調用');
  
  // 輔助函數：顯示通知（確保一定會顯示）
  const showNotification = (message, duration = 3000) => {
    console.log('顯示通知:', message);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast(message, duration);
      console.log('使用 ReelMindCommon.showToast');
    } else {
      // 備用方案：使用 alert 或創建簡單的 toast
      const toastEl = document.getElementById('toast');
      if (toastEl) {
        toastEl.textContent = message;
        toastEl.style.display = 'block';
        toastEl.style.opacity = '1';
        console.log('使用 toast 元素');
        setTimeout(() => {
          toastEl.style.opacity = '0';
          setTimeout(() => {
            toastEl.style.display = 'none';
          }, 300);
        }, duration);
      } else {
        console.log('使用 alert 備用方案');
        alert(message);
      }
    }
  };
  
  if (!ipPlanningUser || !ipPlanningUser.user_id || !ipPlanningToken) {
    console.log('用戶未登入');
    showNotification('請先登入', 3000);
    return;
  }
  
  const content = document.getElementById('scriptContent').textContent;
  if (!content || content.includes('請點選「一鍵生成腳本」按鈕開始') || content.includes('請先完成')) {
    console.log('沒有可儲存的內容');
    showNotification('沒有可儲存的內容', 3000);
    return;
  }
  
  // 顯示儲存中提示
  console.log('開始儲存腳本...');
  showNotification('正在儲存...', 2000);
  
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
      const data = await response.json().catch(() => ({}));
      console.log('腳本儲存成功:', data);
      showNotification('✅ 腳本儲存成功！', 3000);
    } else if (response.status === 404) {
      localStorage.setItem(`saved_script_${Date.now()}`, content);
      console.log('腳本已儲存到本地（API 不存在）');
      showNotification('✅ 腳本已儲存到本地！', 3000);
    } else {
      const errorData = await response.json().catch(() => ({ error: '儲存失敗' }));
      console.error('儲存失敗:', errorData);
      throw new Error(errorData.error || '儲存失敗');
    }
  } catch (error) {
    console.error('Save script error:', error);
    // 儲存到本地作為備份
    localStorage.setItem(`saved_script_${Date.now()}`, content);
    console.log('腳本已儲存到本地（伺服器儲存失敗）');
    showNotification('⚠️ 腳本已儲存到本地（伺服器儲存失敗）', 3000);
  }
}

// 重新生成結果
async function regenerateResult(type) {
  // 顯示通知：開始重新生成
  const showNotification = (message, duration = 3000) => {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast(message, duration);
    } else {
      const toastEl = document.getElementById('toast');
      if (toastEl) {
        toastEl.textContent = message;
        toastEl.style.display = 'block';
        toastEl.style.opacity = '1';
        setTimeout(() => {
          toastEl.style.opacity = '0';
          setTimeout(() => {
            toastEl.style.display = 'none';
          }, 300);
        }, duration);
      } else {
        alert(message);
      }
    }
  };
  
  const typeNames = {
    'positioning': '帳號定位',
    'topics': '選題推薦',
    'script': '短影音腳本'
  };
  
  showNotification(`正在重新生成${typeNames[type]}...`, 2000);
  
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
  
  // 生成完成後顯示通知
  setTimeout(() => {
    showNotification(`✅ ${typeNames[type]}已重新生成`, 2000);
  }, 500);
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

