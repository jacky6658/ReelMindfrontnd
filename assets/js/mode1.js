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

// 快取相關變數
let cachedHistoryData = null;
let cachedHistoryTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘快取

// ===== 全局函數導出（確保在 DOMContentLoaded 之前可用） =====
if (typeof window !== 'undefined') {
  // 使用說明抽屜相關函數
  window.toggleMode1InstructionsDrawer = toggleMode1InstructionsDrawer;
  window.openMode1InstructionsDrawer = openMode1InstructionsDrawer;
  window.closeMode1InstructionsDrawer = closeMode1InstructionsDrawer;

  // 快速按鈕處理函數
  window.handleQuickButton = handleQuickButton;

  // 生成結果 Modal 相關函數
  window.openMode1OneClickModal = openMode1OneClickModal;
  window.closeMode1OneClickModal = closeMode1OneClickModal;
  window.switchMode1HistoryType = switchMode1HistoryType;
  window.deleteMode1HistoryResult = deleteMode1HistoryResult;
  // window.exportHistoryResult = exportHistoryResult; // 由於已直接定義為 window.exportHistoryResult，這裡可以省略
  window.selectHistoryResult = selectHistoryResult;
  window.removeSelectedSetting = removeSelectedSetting;
  window.useSelectedSettingsToChat = useSelectedSettingsToChat;
  window.editMode1HistoryTitle = editMode1HistoryTitle;
  window.saveMode1HistoryTitle = saveMode1HistoryTitle;
  window.cancelMode1HistoryTitleEdit = cancelMode1HistoryTitleEdit;

  // 展開內容 Modal 相關函數
  window.openMode1ExpandModal = openMode1ExpandModal;
  window.closeMode1ExpandModal = closeMode1ExpandModal;

  // 其他可能被 HTML onclick 直接調用的函數
  if (typeof handleModeNavigation === 'function') {
    window.handleModeNavigation = handleModeNavigation;
  }
  if (typeof goToLogin === 'function') {
    window.goToLogin = goToLogin;
  }
}

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

// ===== 使用說明抽屜相關函數（提前定義，確保可以被 HTML onclick 調用） =====
// 切換說明抽屜/彈跳視窗（根據螢幕寬度決定）
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
  
  // 確保舊的抽屜不會被打開
  const oldResultsOverlay = document.getElementById('mode1ResultsOverlay');
  const oldResultsDrawer = document.getElementById('mode1ResultsDrawer');
  if (oldResultsOverlay) {
    oldResultsOverlay.style.display = 'none';
    oldResultsOverlay.classList.remove('open');
  }
  if (oldResultsDrawer) {
    oldResultsDrawer.style.display = 'none';
    oldResultsDrawer.classList.remove('open');
  }
  
  if (overlay && drawer) {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // 手機版：防止背景滾動（iOS Safari）
    if (window.innerWidth <= 768) {
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }
  }
}

function closeMode1InstructionsDrawer() {
  const overlay = document.getElementById('mode1InstructionsOverlay');
  const drawer = document.getElementById('mode1InstructionsDrawer');
  
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    
    // 手機版：恢復背景滾動
    if (window.innerWidth <= 768) {
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }
}

// ===== 生成結果 Modal 相關函數 =====

// 開啟生成結果 Modal
function openMode1OneClickModal() {
  const overlay = document.getElementById('mode1OneClickModalOverlay');
  if (overlay) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // 禁止背景滾動
    // 預設顯示帳號定位
    switchMode1HistoryType('profile');
    // 強制更新一次選取狀態
    updateSelectedSettingsDisplay();
    // 載入歷史記錄（強制刷新）
    loadMode1OneClickHistory('profile', true); 
  }
}
window.openMode1OneClickModal = openMode1OneClickModal; // 導出到全局，以便 HTML 可以直接調用


// 關閉生成結果 Modal
function closeMode1OneClickModal() {
  const overlay = document.getElementById('mode1OneClickModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = ''; // 恢復背景滾動
  }
}
window.closeMode1OneClickModal = closeMode1OneClickModal; // 導出到全局，以便 HTML 可以直接調用

// 切換過往紀錄類型
async function switchMode1HistoryType(type) {
  const tabs = document.querySelectorAll('.mode1-oneclick-tab');
  const contents = document.querySelectorAll('.mode1-oneclick-tab-content');

  tabs.forEach(tab => {
    if (tab.id === `mode1HistoryTab${type.charAt(0).toUpperCase() + type.slice(1)}`) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  contents.forEach(content => {
    if (content.id === `mode1OneClickHistoryContent`) { // 只有一個內容區，內部動態載入
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  await loadMode1OneClickHistory(type, true); // 強制刷新
}
window.switchMode1HistoryType = switchMode1HistoryType;

// 從後端獲取歷史數據
async function fetchHistoryData(forceRefresh = false) {
  if (!forceRefresh && cachedHistoryData && cachedHistoryTimestamp && (Date.now() - cachedHistoryTimestamp < CACHE_DURATION)) {
    console.log('✅ 從快取載入歷史數據');
    return cachedHistoryData;
  }

  try {
    const token = localStorage.getItem('ipPlanningToken');
    if (!token) return null;

    const response = await fetch(`${API_URL}/api/user/generations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('獲取歷史數據失敗:', errorData);
      return null;
    }

    const data = await response.json();
    cachedHistoryData = data;
    cachedHistoryTimestamp = Date.now();
    console.log('✅ 成功從 API 獲取歷史數據並快取');
    return data;
  } catch (error) {
    console.error('獲取歷史數據時出錯:', error);
    return null;
  }
}

// 清除歷史快取
function clearHistoryCache() {
  cachedHistoryData = null;
  cachedHistoryTimestamp = null;
  console.log('快取已清除');
}

// 載入過往紀錄
async function loadMode1OneClickHistory(type, forceRefresh = false) {
  const historyContainer = document.getElementById('mode1OneClickHistoryContainer');
  if (!historyContainer) return;

  historyContainer.innerHTML = `
    <div style="text-align: center; padding: 40px 20px; color: #9ca3af;">
      <p>載入中...</p>
    </div>
  `;

  const data = await fetchHistoryData(forceRefresh);
  if (!data || !data.success || !data.results) {
    historyContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #9ca3af;">
        <p>目前沒有歷史紀錄。</p>
        <p style="margin-top: 10px;">請先與AI對話並儲存生成的內容。</p>
      </div>
    `;
    return;
  }

  const filteredResults = data.results.filter(r => r.type === type).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (filteredResults.length === 0) {
    historyContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #9ca3af;">
        <p>目前沒有此類型的歷史紀錄。</p>
        <p style="margin-top: 10px;">請先與AI對話並儲存生成的內容。</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  const typeNames = {
    'profile': '帳號定位',
    'plan': '選題方向',
    'scripts': '短影音腳本'
  };

  filteredResults.forEach(result => {
    const isSelected = selectedSettings[type] && selectedSettings[type].id === result.id;
    const historyItem = document.createElement('div');
    historyItem.className = 'mode1-oneclick-history-item';
    historyItem.dataset.id = result.id;
    historyItem.dataset.type = result.type;

    const titleText = result.title || `未命名${typeNames[result.type] || ''}`;
    const formattedDate = new Date(result.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    historyItem.innerHTML = `
      <div class="mode1-oneclick-history-item-header">
        <div class="mode1-oneclick-history-item-title-wrapper">
          <span class="mode1-oneclick-history-item-title" id="historyTitle-${result.id}">${safeSetText(titleText)}</span>
          <input type="text" class="mode1-oneclick-history-item-title-input" id="historyTitleInput-${result.id}" value="${safeSetText(titleText)}" style="display: none;">
          <i class="fas fa-edit edit-title-icon" onclick="editMode1HistoryTitle('${result.id}')"></i>
          <i class="fas fa-check save-title-icon" onclick="saveMode1HistoryTitle('${result.id}')" style="display: none;"></i>
          <i class="fas fa-times cancel-title-icon" onclick="cancelMode1HistoryTitleEdit('${result.id}', '${safeSetText(titleText)}')" style="display: none;"></i>
        </div>
        <span class="mode1-oneclick-history-item-date">${formattedDate}</span>
      </div>
      <div class="mode1-oneclick-history-item-content-wrapper collapsed" id="contentWrapper-${result.id}">
        <div class="mode1-oneclick-history-item-content" id="content-${result.id}">
          ${renderMode1Markdown(result.content)}
        </div>
        <div class="mode1-oneclick-result-expand">
          <button class="mode1-oneclick-expand-btn" onclick="toggleHistoryContentExpanded('${result.id}')">
            <span>展開</span> <i class="fas fa-chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="mode1-oneclick-history-item-actions">
        <button class="mode1-oneclick-history-item-btn primary ${isSelected ? 'selected' : ''}" onclick="selectHistoryResult('${result.type}', '${result.id}')">
          <i class="fas fa-check"></i> <span>${isSelected ? '已選擇' : '選擇'}</span>
        </button>
        <button class="mode1-oneclick-history-item-btn" onclick="openMode1ExpandModal('${result.id}', '${result.type}')">
          <i class="fas fa-expand"></i> <span>查看完整</span>
        </button>
        <button class="mode1-oneclick-history-item-btn" onclick="exportHistoryResult('${result.id}', '${result.type}')">
          <i class="fas fa-download"></i> <span>匯出</span>
        </button>
        <button class="mode1-oneclick-history-item-btn danger" onclick="deleteMode1HistoryResult('${result.id}', '${result.type}')">
          <i class="fas fa-trash-alt"></i> <span>刪除</span>
        </button>
      </div>
    `;
    fragment.appendChild(historyItem);
  });

  historyContainer.innerHTML = ''; // 清空載入中提示
  historyContainer.appendChild(fragment);
}
window.loadMode1OneClickHistory = loadMode1OneClickHistory;

// 匯出歷史結果
window.exportHistoryResult = async function(resultId, resultType) {
  try {
    const token = localStorage.getItem('ipPlanningToken');
    if (!token) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入', 3000);
      }
      return;
    }

    const response = await fetch(`${API_URL}/api/user/generations/${resultId}/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const blob = await response.blob();
      const csvUrl = URL.createObjectURL(blob);
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = `ip-${resultType}-${resultId}-${Date.now()}.csv`;
      csvLink.click();
      URL.revokeObjectURL(csvUrl);

      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ 匯出成功', 3000);
      }
    } else {
      const errorData = await response.json();
      console.error('匯出失敗:', errorData);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`匯出失敗: ${errorData.message || '未知錯誤'}`, 3000);
      }
    }
  } catch (error) {
    console.error('匯出時出錯:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('匯出失敗，請稍後再試', 3000);
    }
  }
};

// 儲存已選擇的設定
let selectedSettings = {
  profile: null,
  plan: null,
  scripts: null,
};

// 更新已選擇設定的顯示
function updateSelectedSettingsDisplay() {
  const selectedSettingsDiv = document.getElementById('mode1SelectedSettings');
  const profileItem = document.getElementById('mode1SelectedProfile');
  const planItem = document.getElementById('mode1SelectedPlan');
  const scriptsItem = document.getElementById('mode1SelectedScripts');
  const profileValue = document.getElementById('mode1SelectedProfileValue');
  const planValue = document.getElementById('mode1SelectedPlanValue');
  const scriptsValue = document.getElementById('mode1SelectedScriptsValue');

  let hasSelected = false;

  if (selectedSettings.profile) {
    profileValue.textContent = selectedSettings.profile.title;
    profileItem.style.display = 'flex';
    hasSelected = true;
  } else {
    profileItem.style.display = 'none';
  }

  if (selectedSettings.plan) {
    planValue.textContent = selectedSettings.plan.title;
    planItem.style.display = 'flex';
    hasSelected = true;
  } else {
    planItem.style.display = 'none';
  }

  if (selectedSettings.scripts) {
    scriptsValue.textContent = selectedSettings.scripts.title;
    scriptsItem.style.display = 'flex';
    hasSelected = true;
  } else {
    scriptsItem.style.display = 'none';
  }

  if (selectedSettingsDiv) {
    selectedSettingsDiv.style.display = hasSelected ? 'block' : 'none';
  }

  // 更新選擇按鈕的狀態
  document.querySelectorAll('.mode1-oneclick-history-item-btn.primary').forEach(btn => {
    const type = btn.closest('.mode1-oneclick-history-item').dataset.type;
    const id = btn.closest('.mode1-oneclick-history-item').dataset.id;
    if (selectedSettings[type] && selectedSettings[type].id === id) {
      btn.classList.add('selected');
      btn.querySelector('span').textContent = '已選擇';
    } else {
      btn.classList.remove('selected');
      btn.querySelector('span').textContent = '選擇';
    }
  });
}
window.updateSelectedSettingsDisplay = updateSelectedSettingsDisplay;

// 選擇歷史結果
async function selectHistoryResult(type, resultId) {
  const data = await fetchHistoryData();
  if (!data || !data.success || !data.results) return;

  const result = data.results.find(r => r.id === resultId);
  if (result) {
    if (selectedSettings[type] && selectedSettings[type].id === resultId) {
      // 如果已經選擇，則取消選擇
      selectedSettings[type] = null;
    } else {
      // 否則選擇
      selectedSettings[type] = {
        id: result.id,
        title: result.title || `未命名${type.charAt(0).toUpperCase() + type.slice(1)}`,
        content: result.content,
      };
    }
    updateSelectedSettingsDisplay();
  }
}
window.selectHistoryResult = selectHistoryResult;

// 移除選擇的設定
function removeSelectedSetting(type) {
  selectedSettings[type] = null;
  updateSelectedSettingsDisplay();
}
window.removeSelectedSetting = removeSelectedSetting;

// 使用選擇的設定與 AI 對話
async function useSelectedSettingsToChat() {
  let messageContent = '請根據以下內容與我討論：\n\n';
  let hasContent = false;

  if (selectedSettings.profile) {
    messageContent += `【帳號定位】\n${selectedSettings.profile.content}\n\n`;
    hasContent = true;
  }
  if (selectedSettings.plan) {
    messageContent += `【選題方向】\n${selectedSettings.plan.content}\n\n`;
    hasContent = true;
  }
  if (selectedSettings.scripts) {
    messageContent += `【短影音腳本】\n${selectedSettings.scripts.content}\n\n`;
    hasContent = true;
  }

  if (hasContent) {
    sendMode1Message(messageContent, 'ip_planning');
    closeMode1OneClickModal(); // 發送後關閉 Modal
  } else {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請至少選擇一項設定', 3000);
    }
  }
}
window.useSelectedSettingsToChat = useSelectedSettingsToChat;

// 刪除歷史結果
window.deleteMode1HistoryResult = async function(resultId, resultType) {
  if (!confirm('確定要刪除這條記錄嗎？')) {
    return;
  }
  
  const token = localStorage.getItem('ipPlanningToken');
  if (!token) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/user/generations/${resultId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      clearHistoryCache(); // 清除快取，強制重新載入
      
      // 如果刪除的是已選擇的設定，清除選擇
      if (selectedSettings[resultType]?.id === resultId) {
        selectedSettings[resultType] = null;
        updateSelectedSettingsDisplay();
      }
      
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ 記錄已刪除', 3000);
      }
      
      // 根據刪除的類型，重新載入對應標籤頁的歷史記錄（強制刷新）
      // 確保刪除後保持在當前標籤頁，而不是跳到帳號定位
      const typeMap = {
        'profile': 'profile',
        'plan': 'plan',
        'scripts': 'scripts'
      };
      const targetType = typeMap[resultType] || resultType;
      
      // 切換到對應的標籤頁並重新載入
      await switchMode1HistoryType(targetType);
      await loadMode1OneClickHistory(targetType, true); // 強制刷新
    } else {
      const errorData = await response.json();
      console.error('刪除失敗:', errorData);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`刪除失敗: ${errorData.message || '未知錯誤'}`, 3000);
      }
    }
  } catch (error) {
    console.error('刪除時出錯:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('刪除失敗，請稍後再試', 3000);
    }
  }
};


// 編輯歷史記錄標題
function editMode1HistoryTitle(resultId) {
  const titleSpan = document.getElementById(`historyTitle-${resultId}`);
  const titleInput = document.getElementById(`historyTitleInput-${resultId}`);
  const editIcon = titleSpan.nextElementSibling; // i.fas.fa-edit
  const saveIcon = editIcon.nextElementSibling; // i.fas.fa-check
  const cancelIcon = saveIcon.nextElementSibling; // i.fas.fa-times

  if (titleSpan && titleInput && editIcon && saveIcon && cancelIcon) {
    titleSpan.style.display = 'none';
    titleInput.style.display = 'inline-block';
    titleInput.focus();
    editIcon.style.display = 'none';
    saveIcon.style.display = 'inline-block';
    cancelIcon.style.display = 'inline-block';
  }
}
window.editMode1HistoryTitle = editMode1HistoryTitle;


// 保存歷史記錄標題
async function saveMode1HistoryTitle(resultId) {
  const titleSpan = document.getElementById(`historyTitle-${resultId}`);
  const titleInput = document.getElementById(`historyTitleInput-${resultId}`);
  const editIcon = titleSpan.nextElementSibling;
  const saveIcon = editIcon.nextElementSibling;
  const cancelIcon = saveIcon.nextElementSibling;

  if (titleSpan && titleInput && editIcon && saveIcon && cancelIcon) {
    const newTitle = titleInput.value.trim();
    if (newTitle === '') {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('標題不能為空', 3000);
      }
      return;
    }

    try {
      const token = localStorage.getItem('ipPlanningToken');
      if (!token) {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('請先登入', 3000);
        }
        return;
      }

      const response = await fetch(`${API_URL}/api/user/generations/${resultId}/title`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (response.ok) {
        titleSpan.textContent = safeSetText(newTitle);
        titleSpan.style.display = 'inline-block';
        titleInput.style.display = 'none';
        editIcon.style.display = 'inline-block';
        saveIcon.style.display = 'none';
        cancelIcon.style.display = 'none';
        
        clearHistoryCache(); // 清除快取以強制重新載入
        updateSelectedSettingsDisplay(); // 更新已選擇設定中的標題

        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('✅ 標題已更新', 3000);
        }
      } else {
        const errorData = await response.json();
        console.error('更新標題失敗:', errorData);
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast(`更新標題失敗: ${errorData.message || '未知錯誤'}`, 3000);
        }
      }
    } catch (error) {
      console.error('更新標題時出錯:', error);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('更新標題失敗，請稍後再試', 3000);
      }
    }
  }
}
window.saveMode1HistoryTitle = saveMode1HistoryTitle;


// 取消編輯歷史記錄標題
function cancelMode1HistoryTitleEdit(resultId, originalTitle) {
  const titleSpan = document.getElementById(`historyTitle-${resultId}`);
  const titleInput = document.getElementById(`historyTitleInput-${resultId}`);
  const editIcon = titleSpan.nextElementSibling;
  const saveIcon = editIcon.nextElementSibling;
  const cancelIcon = saveIcon.nextElementSibling;

  if (titleSpan && titleInput && editIcon && saveIcon && cancelIcon) {
    titleInput.value = originalTitle; // 恢復原始標題
    titleSpan.style.display = 'inline-block';
    titleInput.style.display = 'none';
    editIcon.style.display = 'inline-block';
    saveIcon.style.display = 'none';
    cancelIcon.style.display = 'none';
  }
}
window.cancelMode1HistoryTitleEdit = cancelMode1HistoryTitleEdit;


// 展開/收起歷史記錄內容
function toggleHistoryContentExpanded(resultId) {
  const contentWrapper = document.getElementById(`contentWrapper-${resultId}`);
  const expandBtn = contentWrapper.querySelector('.mode1-oneclick-expand-btn');
  const expandIcon = expandBtn.querySelector('i');

  if (contentWrapper.classList.contains('expanded')) {
    contentWrapper.classList.remove('expanded');
    expandBtn.querySelector('span').textContent = '展開';
    expandIcon.classList.remove('fa-chevron-up');
    expandIcon.classList.add('fa-chevron-down');
  } else {
    contentWrapper.classList.add('expanded');
    expandBtn.querySelector('span').textContent = '收起';
    expandIcon.classList.remove('fa-chevron-down');
    expandIcon.classList.add('fa-chevron-up');
  }
}
window.toggleHistoryContentExpanded = toggleHistoryContentExpanded;


// ===== 展開內容 Modal 相關函數 =====
let currentExpandModalContent = null; // 用於保存當前展開的內容，防止重新渲染

// 開啟展開內容 Modal
async function openMode1ExpandModal(resultId, resultType) {
  const overlay = document.getElementById('mode1ExpandModalOverlay');
  const modal = document.getElementById('mode1ExpandModal');
  const modalTitle = document.getElementById('mode1ExpandModalTitle');
  const modalContentDiv = document.getElementById('mode1ExpandModalContent');
  
  if (!overlay || !modal || !modalTitle || !modalContentDiv) return;

  modalContentDiv.innerHTML = '<p style="text-align: center; color: #9ca3af;">載入中...</p>'; // 顯示載入中

  const data = await fetchHistoryData();
  if (!data || !data.success || !data.results) {
    modalContentDiv.innerHTML = '<p style="text-align: center; color: #ef4444;">載入失敗，請稍後再試。</p>';
    return;
  }

  const result = data.results.find(r => r.id === resultId);

  if (result) {
    const typeNames = {
      'profile': '帳號定位',
      'plan': '選題方向',
      'scripts': '短影音腳本'
    };
    modalTitle.textContent = result.title || `查看完整${typeNames[result.type] || ''}內容`;
    modalContentDiv.innerHTML = renderMode1Markdown(result.content);
    currentExpandModalContent = result.content; // 快取內容
    
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // 禁止背景滾動

    // 手機版：處理表格溢出
    if (window.innerWidth <= 768) {
      const tables = modalContentDiv.querySelectorAll('table');
      tables.forEach(table => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mode1-oneclick-result-content-wrapper in-expand-modal'; // 添加類名以便 CSS 處理
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
    }
    
    // 強制重繪，確保滾動條正確顯示
    modalContentDiv.scrollTop = 0;
    setTimeout(() => {
      modalContentDiv.scrollTop = 0;
    }, 50);

  } else {
    modalContentDiv.innerHTML = '<p style="text-align: center; color: #ef4444;">找不到對應的內容。</p>';
  }
}
window.openMode1ExpandModal = openMode1ExpandModal;

// 關閉展開內容 Modal
function closeMode1ExpandModal() {
  const overlay = document.getElementById('mode1ExpandModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = ''; // 恢復背景滾動
    currentExpandModalContent = null; // 清除快取
  }
}
window.closeMode1ExpandModal = closeMode1ExpandModal;


// ===== 聊天訊息相關函數 =====

// 發送 Mode1 訊息
async function sendMode1Message(message, conversationType = 'ip_planning') {
  if (isMode1Sending) {
    console.log('訊息發送中，請稍候...');
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('訊息發送中，請稍候...', 2000);
    }
    return;
  }
  
  currentMode1ConversationType = conversationType;
  if (!message || !message.trim()) return;
  
  const messageInput = document.getElementById('mode1-messageInput');
  const chatMessages = document.getElementById('mode1-chatMessages');
  const sendBtn = document.getElementById('mode1-sendBtn');
  const userAvatarUrl = ipPlanningUser?.picture || ipPlanningUser?.avatar || ipPlanningUser?.photoURL || '';

  // 顯示用戶訊息
  const userMessageEl = createMode1Message('user', message, userAvatarUrl);
  chatMessages.appendChild(userMessageEl);
  messageInput.value = ''; // 清空輸入框
  messageInput.style.height = 'auto'; // 重置輸入框高度
  chatMessages.scrollTop = chatMessages.scrollHeight; // 滾動到底部

  isMode1Sending = true;
  sendBtn.disabled = true; // 禁用發送按鈕

  // 顯示打字指示器
  const typingIndicatorEl = createMode1Message('assistant', '<div class="typing-indicator">AI 正在生成 <span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span></div>');
  typingIndicatorEl.classList.add('typing-message'); // 添加類名以便後續移除
  chatMessages.appendChild(typingIndicatorEl);
  chatMessages.scrollTop = chatMessages.scrollHeight; // 滾動到底部


  // 檢測用戶是否說"儲存"或"保存"
  const saveKeywords = ['儲存', '保存', 'save', '儲存腳本', '保存腳本', '儲存結果', '保存結果', '幫我儲存', '幫我保存'];
  const messageLower = message.toLowerCase().trim();
  const shouldSave = saveKeywords.some(keyword => 
    messageLower.includes(keyword.toLowerCase()) || 
    message === keyword || 
    message.trim() === keyword
  );
  
  // 如果是儲存請求，直接觸發儲存函數
  if (shouldSave) {
    try {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('💡 偵測到儲存指令，AI 將自動保存最新生成內容', 3000);
      }
      await saveMode1Result(currentMode1ConversationType); // 觸發儲存，預設保存當前會話類型最新結果
      
      // 移除打字指示器
      if (typingIndicatorEl.parentNode) {
        typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
      }
      
      const aiConfirmMessage = createMode1Message('assistant', '✅ 好的，我已將最新的生成內容保存到您的創作者資料庫。');
      chatMessages.appendChild(aiConfirmMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
      console.error('處理儲存指令時出錯:', error);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('儲存失敗，請稍後再試', 3000);
      }
    } finally {
      isMode1Sending = false;
      sendBtn.disabled = false; // 啟用發送按鈕
    }
    return;
  }

  try {
    const token = localStorage.getItem('ipPlanningToken');
    if (!token) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入', 3000);
      }
      // 移除打字指示器
      if (typingIndicatorEl.parentNode) {
        typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
      }
      return;
    }

    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Conversation-Type': conversationType, // 傳遞會話類型
        'X-CSRF-Token': getCSRFToken()
      },
      body: JSON.stringify({ message: message })
    });

    if (!response.ok) {
      // 移除打字指示器
      if (typingIndicatorEl.parentNode) {
        typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
      }
      
      const errorData = await response.json();
      console.error('API 錯誤:', errorData);
      
      let errorMessage = 'AI 回應失敗，請稍後再試。';
      if (errorData.message) {
        errorMessage = errorData.message;
        const quotaErrorMatch = errorMessage.match(/quota limits for API key|overloaded/i);
        if (quotaErrorMatch) {
          const parsedError = parseQuotaError(errorMessage);
          errorMessage = parsedError.message;
        } else if (errorMessage.includes('Invalid API key')) {
            errorMessage = '您提供的 LLM 金鑰無效，請至「創作者資料庫」檢查或重新綁定金鑰。';
        }
      }
      
      // 添加一個 AI 錯誤訊息
      const aiErrorMessage = createMode1Message('assistant', `<span style="color: #ef4444;">❌ ${safeSetText(errorMessage)}</span>`);
      chatMessages.appendChild(aiErrorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // 即使 API 失敗，也嘗試記錄用戶訊息到記憶
      try {
        await recordMode1ConversationMessage(conversationType, 'user', message, token, ipPlanningUser);
      } catch (memError) {
        console.error('記錄用戶訊息到記憶錯誤:', memError);
      }

      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let aiResponseContent = '';
    const aiMessageEl = createMode1Message('assistant', '');
    chatMessages.appendChild(aiMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const contentDiv = aiMessageEl.querySelector('.message-content');
    const fullContent = [];
    let isCodeBlock = false;

    // 移除打字指示器
    if (typingIndicatorEl.parentNode) {
      typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
    }
    
    // 清除快取，因為有新的 AI 回應
    clearHistoryCache();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') {
            break;
          }
          try {
            const json = JSON.parse(data);
            const content = json.message.content;
            if (content) {
              aiResponseContent += content;
              fullContent.push(content);

              // 這裡進行更細緻的渲染，以避免在程式碼塊中提前結束
              let renderedHtml = '';
              const tempContent = aiResponseContent;

              // 偵測程式碼區塊的開頭和結尾
              if (tempContent.includes('```')) {
                  const parts = tempContent.split('```');
                  renderedHtml = parts.map((part, index) => {
                      if (index % 2 === 1) { // 這是程式碼塊內部
                          isCodeBlock = true;
                          return `<pre><code class="language-javascript">${DOMPurify.sanitize(part, { USE_PROFILES: { html: false } })}</code></pre>`;
                      } else { // 這是普通文本
                          isCodeBlock = false;
                          return safeRenderMarkdown(part);
                      }
                  }).join('');
              } else {
                  renderedHtml = safeRenderMarkdown(tempContent);
              }
              
              contentDiv.innerHTML = renderedHtml;

              // 處理程式碼高亮
              contentDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
              });

              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch (e) {
            console.error('解析 SSE 數據失敗:', e, '數據:', data);
          }
        }
      }
    }

    // 將完整的 AI 回應內容記錄到長期記憶
    try {
      await recordMode1ConversationMessage(conversationType, 'user', message, token, ipPlanningUser);
      await recordMode1ConversationMessage(conversationType, 'assistant', aiResponseContent, token, ipPlanningUser);
    } catch (error) {
      console.error('記錄長期記憶錯誤:', error);
    }

  } catch (error) {
    console.error('發送訊息時出錯:', error);
    // 移除打字指示器
    if (typingIndicatorEl.parentNode) {
      typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('發送訊息失敗，請檢查網絡或稍後再試。', 3000);
    }
    // 嘗試記錄用戶訊息到記憶
    try {
      await recordMode1ConversationMessage(conversationType, 'user', message, ipPlanningToken, ipPlanningUser);
    } catch (memError) {
      console.error('記錄用戶訊息到記憶錯誤:', memError);
    }

  } finally {
    isMode1Sending = false;
    sendBtn.disabled = false; // 啟用發送按鈕
    chatMessages.scrollTop = chatMessages.scrollHeight; // 確保最後滾動到底部
  }
}

// 根據角色創建聊天訊息元素
function createMode1Message(role, content, avatarUrl = '') {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;

  const avatarEl = document.createElement('div');
  avatarEl.className = 'message-avatar';
  if (role === 'user') {
    if (avatarUrl) {
      const imgEl = document.createElement('img');
      imgEl.src = avatarUrl;
      imgEl.alt = '用戶頭像';
      avatarEl.appendChild(imgEl);
    } else {
      avatarEl.textContent = '👤';
    }
  } else {
    avatarEl.textContent = 'AI';
  }

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';
  contentEl.innerHTML = content; // 這裡直接使用 innerHTML，因為內容可能是 HTML 或 Markdown 渲染結果

  messageEl.appendChild(avatarEl);
  messageEl.appendChild(contentEl);
  return messageEl;
}

// 渲染 Markdown
function renderMode1Markdown(text) {
  if (window.marked && window.DOMPurify && window.hljs) {
    // 使用 marked.js 將 Markdown 轉換為 HTML
    const rawHtml = marked.parse(text, { breaks: true, gfm: true });
    // 使用 DOMPurify 清理 HTML，防止 XSS 攻擊
    const cleanHtml = window.DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['style'], // 禁止 style 標籤，以防止內容破壞樣式
      ADD_ATTR: ['target'], // 允許 target 屬性用於連結
    });
    return cleanHtml;
  }
  return safeSetText(text); // 降級處理
}

// 記錄會話訊息到記憶（短期記憶和長期記憶）
async function recordMode1ConversationMessage(conversationType, role, content, token, user) {
  if (!token || !user || !user.user_id) {
    console.warn('未登入，無法記錄記憶。');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/memory/long-term`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Conversation-Type': conversationType,
        'X-CSRF-Token': getCSRFToken()
      },
      body: JSON.stringify({
        user_id: user.user_id,
        role: role,
        content: content
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('記錄長期記憶失敗:', errorData);
    } else {
      console.log('✅ 記憶已記錄:', role);
    }
  } catch (error) {
    console.error('記錄長期記憶錯誤:', error);
  }
}

// 解析 429 配額錯誤並提取重試時間
function parseQuotaError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return null;
  }

  const retryAfterMatch = errorMessage.match(/Retry-After: (\d+)/);
  let retryAfterSeconds = 60; // 預設 60 秒

  if (retryAfterMatch && retryAfterMatch[1]) {
    retryAfterSeconds = parseInt(retryAfterMatch[1], 10);
  }

  return {
    retryAfter: retryAfterSeconds,
    message: `API 請求次數過多，請等待 ${retryAfterSeconds} 秒後再試。`,
  };
}


// 更新用戶資訊顯示（與 common.js 中的統一函數保持一致，但在此處作為降級處理）
function updateUserInfo() {
  // 優先使用 common.js 的統一函數
  if (window.ReelMindCommon && window.ReelMindCommon.updateUserInfo) {
    window.ReelMindCommon.updateUserInfo();
    return;
  }
  
  // 降級處理：如果 common.js 不可用，直接更新元素
  const userInfo = document.getElementById('userInfo');
  const authButtons = document.getElementById('authButtons');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userDBTab = document.getElementById('userDBTab');
  const userDBMobileTab = document.getElementById('userDBMobileTab');
  
  // 確保用戶資訊已載入
  let currentUser = ipPlanningUser;
  let currentToken = ipPlanningToken;
  
  if (!currentUser) {
    const userStr = localStorage.getItem('ipPlanningUser');
    if (userStr) {
      try {
        currentUser = JSON.parse(userStr);
      } catch (e) {
        console.warn('無法解析用戶資料:', e);
      }
    }
  }
  
  if (!currentToken) {
    currentToken = localStorage.getItem('ipPlanningToken');
  }
  
  if (currentUser && currentToken) {
    if (userInfo) {
      userInfo.style.display = 'flex';
      if (userAvatar) {
        // 支援多種頭像欄位名稱
        const avatarUrl = currentUser.picture || currentUser.avatar || currentUser.photoURL || '';
        if (avatarUrl) {
          userAvatar.src = avatarUrl;
          userAvatar.style.display = 'block';
        } else {
          userAvatar.style.display = 'none';
        }
      }
      if (userName) {
        userName.textContent = currentUser.name || currentUser.displayName || currentUser.email || '用戶';
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

// 保存 Mode1 生成結果
async function saveMode1Result(resultType) {
  const token = localStorage.getItem('ipPlanningToken');
  if (!token) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }

  // 找到最新的 AI 回應
  const chatMessages = document.getElementById('mode1-chatMessages');
  const aiMessages = chatMessages.querySelectorAll('.message.assistant .message-content');
  if (aiMessages.length === 0) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('沒有可儲存的 AI 回應內容。', 3000);
    }
    return;
  }

  const latestAiMessageContent = aiMessages[aiMessages.length - 1].innerHTML;

  if (!latestAiMessageContent || latestAiMessageContent.includes('AI 正在生成')) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('AI 仍在生成內容，請等待完成。', 3000);
    }
    return;
  }

  // 從 HTML 內容中提取純文本標題（假設第一個 h1/h2/h3 或 p 作為標題）
  let extractedTitle = '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = latestAiMessageContent;
  
  const titleEl = tempDiv.querySelector('h1, h2, h3, p');
  if (titleEl) {
    extractedTitle = titleEl.textContent.trim().substring(0, 50); // 截斷標題
  }
  if (!extractedTitle) {
    const typeNames = {
      'ip_planning': 'IP人設規劃',
      'plan': '選題方向',
      'scripts': '短影音腳本'
    };
    extractedTitle = `${typeNames[resultType] || 'AI 生成內容'} - ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}`;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Conversation-Type': resultType, // 傳遞類型
        'X-CSRF-Token': getCSRFToken()
      },
      body: JSON.stringify({
        type: resultType,
        title: extractedTitle,
        content: latestAiMessageContent,
      })
    });

    if (response.ok) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ 最新內容已儲存至創作者資料庫！', 3000);
      }
      clearHistoryCache(); // 儲存成功後清除快取
    } else {
      const errorData = await response.json();
      console.error('保存失敗:', errorData);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`保存失敗: ${errorData.message || '未知錯誤'}`, 3000);
      }
    }
  } catch (error) {
    console.error('保存時出錯:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('保存失敗，請稍後再試', 3000);
    }
  }
}
window.saveMode1Result = saveMode1Result; // 導出到全局作用域

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 ========== Mode1 (IP人設規劃) 頁面初始化 ==========');
  
  // 立即強制隱藏舊的抽屜（最高優先級）
  const oldResultsOverlay = document.getElementById('mode1ResultsOverlay');
  const oldResultsDrawer = document.getElementById('mode1ResultsDrawer');
  if (oldResultsOverlay) {
    oldResultsOverlay.style.display = 'none';
    oldResultsOverlay.style.visibility = 'hidden';
    oldResultsOverlay.style.opacity = '0';
    oldResultsOverlay.classList.remove('open');
    oldResultsOverlay.style.pointerEvents = 'none';
    oldResultsOverlay.style.zIndex = '-1';
  }
  if (oldResultsDrawer) {
    oldResultsDrawer.style.display = 'none';
    oldResultsDrawer.style.visibility = 'hidden';
    oldResultsDrawer.style.opacity = '0';
    oldResultsDrawer.classList.remove('open');
    oldResultsDrawer.style.pointerEvents = 'none';
    oldResultsDrawer.style.zIndex = '-1';
  }
  
  // iOS Safari 視窗高度處理
  setIOSViewportHeight();
  window.addEventListener('resize', setIOSViewportHeight);

  // 初始化 Mode1 聊天功能
  initMode1Chat();

  // 更新用戶資訊
  updateUserInfo();

  // 檢查登入狀態並更新 UI
  await checkLoginStatus();
  await checkSubscriptionStatus();

  // 綁定生成結果按鈕事件（確保使用新的彈跳視窗）
  const resultsBtn = document.getElementById('mode1ResultsBtn');
  if (resultsBtn) {
    resultsBtn.addEventListener('click', openMode1OneClickModal);
  }

  // 處理 SSE 事件
  // 注意：SSE 連線應在用戶登入後才建立
  if (ipPlanningToken && ipPlanningUser?.user_id) {
    const eventSource = new EventSource(`${API_URL}/api/events?token=${ipPlanningToken}&user_id=${ipPlanningUser.user_id}`);

    eventSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      console.log('SSE Event:', data);
      if (data.type === 'save_request') {
        saveMode1Result(data.conversation_type);
      }
    };

    eventSource.onerror = function(err) {
      console.error('EventSource failed:', err);
      eventSource.close();
      // 可以在這裡嘗試重新連線
    };
  }
});

// 初始化 Mode1 聊天功能
function initMode1Chat() {
  const messageInput = document.getElementById('mode1-messageInput');
  const sendBtn = document.getElementById('mode1-sendBtn');
  const chatMessages = document.getElementById('mode1-chatMessages');
  const quickButtons = document.getElementById('mode1-quickButtons');
  const body = document.body;

  if (messageInput && sendBtn && chatMessages && quickButtons) {
    // 啟用輸入框和按鈕
    sendBtn.disabled = false;

    // 自動調整輸入框高度
    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = (messageInput.scrollHeight) + 'px';
      // 滾動到最新訊息
      chatMessages.scrollTop = chatMessages.scrollHeight;
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
  }
}