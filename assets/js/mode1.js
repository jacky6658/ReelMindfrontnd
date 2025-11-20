// mode1.js - IP人設規劃模式專用函數
// 從 mode1.html 提取的所有 JavaScript 代碼
// 版本: 2025-11-13 (修復 checkLoginStatus, getCSRFToken 錯誤)

// API_BASE_URL 已在 config.js 中定義為全局變數
// 這裡直接使用 window.APP_CONFIG，避免重複聲明
const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
let ipPlanningToken = localStorage.getItem('ipPlanningToken') || '';
let ipPlanningUser = JSON.parse(localStorage.getItem('ipPlanningUser') || 'null');
let isMode1Sending = false;
let mode1ChatInitialized = false;
let currentMode1ConversationType = 'ip_planning';

// 快取相關變數
let cachedHistoryData = null;
let cachedHistoryTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘快取

// ===== 全局函數導出將在所有函數定義之後進行 =====

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

// ===== 使用說明 Modal 相關函數（提前定義，確保可以被 HTML onclick 調用） =====
// 切換說明 Modal（彈跳視窗）
function toggleMode1InstructionsDrawer() {
  const overlay = document.getElementById('mode1InstructionsOverlay');
  const modal = document.getElementById('mode1InstructionsModal');
  
  if (overlay && modal) {
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
  const modal = document.getElementById('mode1InstructionsModal');
  
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
  
  if (overlay && modal) {
    overlay.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden'; // 禁止背景滾動
  }
}

function closeMode1InstructionsDrawer() {
  const overlay = document.getElementById('mode1InstructionsOverlay');
  const modal = document.getElementById('mode1InstructionsModal');
  
  if (overlay && modal) {
    overlay.classList.remove('open');
    modal.classList.remove('open');
    document.body.style.overflow = ''; // 恢復背景滾動
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
    return cachedHistoryData;
  }

  try {
    const token = localStorage.getItem('ipPlanningToken');
    if (!token) return null;

    const response = await fetch(`${API_URL}/api/ip-planning/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return null;
    }

    const data = await response.json();
    
    // 後端返回的字段是 result_type，需要映射為 type 以符合前端代碼
    if (data && data.success && data.results) {
      // 只顯示 mode1 的結果（過濾掉 mode3 的結果）
      data.results = data.results
        .filter(result => {
          try {
            const metadata = typeof result.metadata === 'string' 
              ? JSON.parse(result.metadata) 
              : (result.metadata || {});
            // 只顯示 source === 'mode1' 或沒有 source 的舊資料（向後兼容）
            return metadata.source === 'mode1' || !metadata.source;
          } catch (e) {
            // 如果 metadata 解析失敗，預設顯示（舊資料）
            return true;
          }
        })
        .map(result => ({
        ...result,
        type: result.result_type || result.type  // 將 result_type 映射為 type
      }));
    }
    
    cachedHistoryData = data;
    cachedHistoryTimestamp = Date.now();
    return data;
  } catch (error) {
    return null;
  }
}

// 清除歷史快取
function clearHistoryCache() {
  cachedHistoryData = null;
  cachedHistoryTimestamp = null;
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

    // 使用 escapeHtml 轉義 HTML，而不是 safeSetText（safeSetText 需要 DOM 元素）
    const escapedTitle = window.escapeHtml ? window.escapeHtml(titleText) : titleText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    
    historyItem.innerHTML = `
      <div class="mode1-oneclick-history-item-header">
        <div class="mode1-oneclick-history-item-title-wrapper">
          <span class="mode1-oneclick-history-item-title" id="historyTitle-${result.id}">${escapedTitle}</span>
          <input type="text" class="mode1-oneclick-history-item-title-input" id="historyTitleInput-${result.id}" value="${escapedTitle}" style="display: none;">
          <i class="fas fa-edit edit-title-icon" onclick="editMode1HistoryTitle('${result.id}')"></i>
          <i class="fas fa-check save-title-icon" onclick="saveMode1HistoryTitle('${result.id}')" style="display: none;"></i>
          <i class="fas fa-times cancel-title-icon" onclick="cancelMode1HistoryTitleEdit('${result.id}', '${escapedTitle}')" style="display: none;"></i>
        </div>
        <span class="mode1-oneclick-history-item-date">${formattedDate}</span>
      </div>
      <div class="mode1-oneclick-history-item-content-wrapper" id="contentWrapper-${result.id}">
        <div class="mode1-oneclick-history-item-content" id="content-${result.id}">
          ${renderMode1Markdown(result.content)}
        </div>
      </div>
      <div class="mode1-oneclick-history-item-actions">
        <button class="mode1-oneclick-history-item-btn primary ${isSelected ? 'selected' : ''}" type="button" data-result-id="${result.id}" data-result-type="${result.type}" onclick="selectHistoryResult('${result.type}', '${result.id}')">
          <i class="fas fa-check"></i> <span>${isSelected ? '已選擇' : '選擇'}</span>
        </button>
        <button class="mode1-oneclick-history-item-btn" type="button" data-result-id="${result.id}" data-result-type="${result.type}" onclick="openMode1ExpandModal('${result.id}', '${result.type}')">
          <i class="fas fa-expand"></i> <span>展開</span>
        </button>
        <button class="mode1-oneclick-history-item-btn" type="button" data-result-id="${result.id}" data-result-type="${result.type}" onclick="exportHistoryResult('${result.id}', '${result.type}')">
          <i class="fas fa-download"></i> <span>匯出</span>
        </button>
        <button class="mode1-oneclick-history-item-btn danger" data-action="delete" data-type="${result.type}" data-id="${result.id}" type="button" onclick="deleteMode1HistoryResult('${result.id}', '${result.type}')">
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

// 匯出歷史結果（客戶端生成 CSV）
window.exportHistoryResult = async function(resultId, resultType) {
  try {
    // 從快取或 API 獲取數據
    const data = await fetchHistoryData();
    if (!data || !data.success || !data.results) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到要匯出的數據', 3000);
      }
        return;
      }

    // 處理類型轉換：resultId 可能是字串或數字
    const result = data.results.find(r => {
      return r.id == resultId || 
             String(r.id) === String(resultId) || 
             Number(r.id) === Number(resultId);
    });
    
    if (!result) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到要匯出的記錄', 3000);
      }
      return;
    }
    

    // 生成 CSV 內容
    const typeNames = {
      'profile': '帳號定位',
      'plan': '選題方向',
      'scripts': '短影音腳本'
    };
    const typeName = typeNames[resultType] || resultType;
    const title = result.title || `未命名${typeName}`;
    
    // 移除 HTML 標籤，只保留純文本
    const textContent = result.content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').replace(/"/g, '""');
    const formattedDate = new Date(result.created_at).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const csvContent = `類型,標題,內容,建立時間\n"${resultType}","${title}","${textContent}","${formattedDate}"`;
    
    // 創建 Blob 並下載
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
  } catch (error) {
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
  try {
  const data = await fetchHistoryData();
    if (!data || !data.success || !data.results) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('無法獲取數據，請稍後再試', 3000);
      }
      return;
    }

    // 處理類型轉換：resultId 可能是字串或數字
    const result = data.results.find(r => {
      return r.id == resultId || 
             String(r.id) === String(resultId) || 
             Number(r.id) === Number(resultId);
    });
    
  if (result) {
      if (selectedSettings[type] && selectedSettings[type].id == resultId) {
      // 如果已經選擇，則取消選擇
      selectedSettings[type] = null;
    } else {
        // 清除所有其他已選擇的設定（限制一次只能選擇一個）
        selectedSettings.profile = null;
        selectedSettings.plan = null;
        selectedSettings.scripts = null;
        
        // 選擇新的設定
      selectedSettings[type] = {
        id: result.id,
        title: result.title || `未命名${type.charAt(0).toUpperCase() + type.slice(1)}`,
        content: result.content,
      };
    }
    updateSelectedSettingsDisplay();
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        const message = selectedSettings[type] 
          ? `✅ 已選擇 ${selectedSettings[type].title}（已清除其他設定）` 
          : '已取消選擇';
        window.ReelMindCommon.showToast(message, 2000);
      }
    } else {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到對應的記錄', 3000);
      }
    }
  } catch (error) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('選擇失敗，請稍後再試', 3000);
    }
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
    const response = await fetch(`${API_URL}/api/ip-planning/results/${resultId}`, {
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
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`刪除失敗: ${errorData.message || '未知錯誤'}`, 3000);
      }
    }
  } catch (error) {
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

      // 注意：後端目前沒有標題更新端點，暫時只更新本地顯示
      // 更新本地顯示（textContent 會自動轉義，不需要 safeSetText）
      if (window.safeSetText && titleSpan) {
        window.safeSetText(titleSpan, newTitle);
      } else {
        titleSpan.textContent = newTitle;
      }
      titleSpan.style.display = 'inline-block';
      titleInput.style.display = 'none';
      editIcon.style.display = 'inline-block';
      saveIcon.style.display = 'none';
      cancelIcon.style.display = 'none';
      
      // 更新快取中的標題（如果存在）
      if (cachedHistoryData && cachedHistoryData.results) {
        const cachedResult = cachedHistoryData.results.find(r => r.id === resultId);
        if (cachedResult) {
          cachedResult.title = newTitle;
        }
      }
      
      updateSelectedSettingsDisplay(); // 更新已選擇設定中的標題

      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ 標題已更新（僅本地顯示，重新載入後會恢復）', 3000);
      }
      
      // TODO: 當後端添加標題更新端點時，可以使用以下代碼：
      /*
      const response = await fetch(`${API_URL}/api/ip-planning/results/${resultId}/title`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (response.ok) {
        clearHistoryCache(); // 清除快取以強制重新載入
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('✅ 標題已更新', 3000);
      }
    } else {
        const errorData = await response.json();
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast(`更新標題失敗: ${errorData.message || '未知錯誤'}`, 3000);
        }
      }
      */
    } catch (error) {
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
  try {
  const contentWrapper = document.getElementById(`contentWrapper-${resultId}`);
    if (!contentWrapper) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到內容區域', 3000);
      }
      return;
    }
    
  const expandBtn = contentWrapper.querySelector('.mode1-oneclick-expand-btn');
    if (!expandBtn) {
      return;
    }
    
  const expandIcon = expandBtn.querySelector('i');
    if (!expandIcon) {
      return;
    }

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
  } catch (error) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('操作失敗，請稍後再試', 3000);
    }
  }
}
window.toggleHistoryContentExpanded = toggleHistoryContentExpanded;


// ===== 展開內容 Modal 相關函數 =====
let currentExpandModalContent = null; // 用於保存當前展開的內容，防止重新渲染

// 開啟展開內容 Modal
async function openMode1ExpandModal(resultId, resultType) {
  try {
    
  const overlay = document.getElementById('mode1ExpandModalOverlay');
  const modal = document.getElementById('mode1ExpandModal');
  const modalTitle = document.getElementById('mode1ExpandModalTitle');
  const modalContentDiv = document.getElementById('mode1ExpandModalContent');
  
    if (!overlay || !modal || !modalTitle || !modalContentDiv) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('無法打開視窗，請刷新頁面重試', 3000);
      }
      return;
    }

    modalContentDiv.innerHTML = '<p style="text-align: center; color: #9ca3af;">載入中...</p>';

  const data = await fetchHistoryData();
    
  if (!data || !data.success || !data.results) {
    modalContentDiv.innerHTML = '<p style="text-align: center; color: #ef4444;">載入失敗，請稍後再試。</p>';
      return;
    }
    
    
    // 處理類型轉換：resultId 可能是字串或數字
    const result = data.results.find(r => {
      // 嘗試多種匹配方式
      return r.id == resultId || 
             String(r.id) === String(resultId) || 
             Number(r.id) === Number(resultId);
    });
    

  if (result) {
      
      if (!result.content || result.content.trim() === '') {
        modalContentDiv.innerHTML = '<p style="text-align: center; color: #ef4444;">此記錄沒有內容。</p>';
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        return;
      }
      
    const typeNames = {
      'profile': '帳號定位',
      'plan': '選題方向',
      'scripts': '短影音腳本'
    };
      modalTitle.textContent = result.title || `查看完整${typeNames[result.type] || resultType || ''}內容`;
      
      const renderedContent = renderMode1Markdown(result.content);
      
      if (!renderedContent || renderedContent.trim() === '') {
        modalContentDiv.innerHTML = '<div style="white-space: pre-wrap; padding: 20px;">' + 
          (window.escapeHtml ? window.escapeHtml(result.content) : result.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')) + 
          '</div>';
      } else {
        modalContentDiv.innerHTML = renderedContent;
      }
      
      currentExpandModalContent = result.content;
    
    overlay.classList.add('open');
      document.body.style.overflow = 'hidden';

    // 手機版：處理表格溢出
    if (window.innerWidth <= 768) {
      const tables = modalContentDiv.querySelectorAll('table');
      tables.forEach(table => {
        const wrapper = document.createElement('div');
          wrapper.className = 'mode1-oneclick-result-content-wrapper in-expand-modal';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
    }
    
    modalContentDiv.scrollTop = 0;
    setTimeout(() => {
      modalContentDiv.scrollTop = 0;
    }, 50);

    } else {
    modalContentDiv.innerHTML = '<p style="text-align: center; color: #ef4444;">找不到對應的內容。</p>';
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  } catch (error) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('打開視窗失敗，請稍後再試', 3000);
    }
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


// ===== 快速按鈕處理函數 =====

// 處理快速按鈕點擊
async function handleQuickButton(type) {
  const chatMessages = document.getElementById('mode1-chatMessages');
  if (!chatMessages) return;
  
  switch(type) {
    case 'ip-profile':
      // 先打開生成結果彈跳視窗，顯示過往的帳號定位記錄（不消耗 LLM token）
      // 切換到「帳號定位」標籤頁
      if (window.openMode1OneClickModal) {
        window.openMode1OneClickModal();
        // 等待彈跳視窗打開後，切換到「帳號定位」標籤頁
        setTimeout(() => {
          if (window.switchMode1HistoryType) {
            window.switchMode1HistoryType('profile');
          }
        }, 100);
        
        // 顯示提示訊息
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('📋 已顯示過往的帳號定位記錄，您可以選擇使用或直接與 AI 對話生成新的', 4000);
        }
    } else {
        // 如果彈跳視窗函數不存在，降級為直接發送訊息
        sendMode1Message('請幫我建立 IP Profile（個人品牌定位）。', 'ip_planning');
      }
      break;
    case '14day-plan':
      sendMode1Message('請幫我規劃 14 天的短影音內容計劃。', 'ip_planning');
      break;
    case 'today-script':
      sendMode1Message('請幫我生成今日的短影音腳本。', 'ip_planning');
      break;
    case 'change-script-structure':
      sendMode1Message('請幫我調整短影音腳本的結構。', 'ip_planning');
      break;
    case 'reposition':
      sendMode1Message('【重要：完全重新開始】請完全忽略之前所有的對話內容、帳號定位結果和長期記憶。這是一個全新的帳號定位需求，請從頭開始。請先詢問我以下問題：1. 我的目標受眾是誰？2. 我想要達成的目標是什麼？3. 我主要使用的平台是什麼？4. 我偏好的內容風格是什麼？請根據我的新回答，生成一個全新的、獨立的帳號定位，不要參考任何之前的內容。', 'ip_planning');
      break;
    default:
  }
}
window.handleQuickButton = handleQuickButton; // 立即導出到全局，以便 HTML onclick 使用

// ===== 聊天訊息相關函數 =====

// 檢查用戶是否已綁定 LLM 金鑰
async function checkUserLlmKey() {
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    return false;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/llm-keys/check`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.has_key === true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// 發送 Mode1 訊息
async function sendMode1Message(message, conversationType = 'ip_planning') {
  if (!message || !message.trim()) {
    return;
  }
  
  if (isMode1Sending) {
    return;
  }
  
  isMode1Sending = true;
  
  const hasLlmKey = await checkUserLlmKey();
  if (!hasLlmKey) {
    isMode1Sending = false;
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('⚠️ 請先綁定您的 LLM API 金鑰才能與 AI 對談。點擊「立即綁定」前往設定。', 5000);
    }
    setTimeout(() => {
      window.location.href = 'userDB.html#settings';
    }, 2000);
    return;
  }
  
  currentMode1ConversationType = conversationType;
  // 訊息檢查已在函數開頭完成，這裡不需要重複檢查
  
  const messageInput = document.getElementById('mode1-messageInput');
  const chatMessages = document.getElementById('mode1-chatMessages');
  const sendBtn = document.getElementById('mode1-sendBtn');
  const userAvatarUrl = ipPlanningUser?.picture || ipPlanningUser?.avatar || ipPlanningUser?.photoURL || '';

  // 顯示用戶訊息
  const userMessageEl = createMode1Message('user', message, userAvatarUrl);
  chatMessages.appendChild(userMessageEl);
  // 注意：輸入框已在事件處理器中清空，這裡不需要重複清空
  // messageInput.value = ''; // 已在事件處理器中清空
  messageInput.style.height = 'auto'; // 重置輸入框高度
  chatMessages.scrollTop = chatMessages.scrollHeight; // 滾動到底部

  // 注意：isMode1Sending 已在函數開頭設置，這裡不需要重複設置
  // isMode1Sending = true; // 已在函數開頭設置
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
  
  // 如果是儲存請求，讓後端處理（後端會發送 save_request 事件）
  // 不在此處直接儲存，而是等待後端的 save_request 事件觸發儲存流程
  if (shouldSave) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('💡 偵測到儲存指令，正在處理...', 3000);
    }
    // 繼續發送訊息給後端，後端會檢測並發送 save_request 事件
    // 儲存流程將在 SSE 的 save_request 事件處理中完成
    // 不在此處 return，讓訊息繼續發送給後端
  }

  try {
    const token = localStorage.getItem('ipPlanningToken');
    if (!token) {
      isMode1Sending = false;
      sendBtn.disabled = false;
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入', 3000);
      }
      if (typingIndicatorEl.parentNode) {
        typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
      }
    return;
  }

    // 獲取 CSRF Token
    let csrfToken = '';
    if (window.Api && window.Api.getCsrfToken) {
      try {
        csrfToken = await window.Api.getCsrfToken() || '';
      } catch (e) {
      }
    }
    
    // 確保傳遞 user_id 和 conversation_type 給後端，以便載入記憶和 RAG
    const requestBody = {
      message: message,
      conversation_type: conversationType  // 後端需要這個來過濾記憶
    };
    
    // 如果用戶已登入，添加 user_id（後端會從 token 驗證，但也可以從 body 獲取）
    if (ipPlanningUser && ipPlanningUser.user_id) {
      requestBody.user_id = ipPlanningUser.user_id;
    }
    
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Conversation-Type': conversationType, // 保留 header 以備後端需要
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      if (typingIndicatorEl.parentNode) {
        typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
      }
      
      const errorData = await response.json();
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
      
      const escapedErrorMessage = window.escapeHtml ? window.escapeHtml(errorMessage) : errorMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      const aiErrorMessage = createMode1Message('assistant', `<span style="color: #ef4444;">❌ ${escapedErrorMessage}</span>`);
      chatMessages.appendChild(aiErrorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      isMode1Sending = false;
      sendBtn.disabled = false;

      try {
        await recordMode1ConversationMessage(conversationType, 'user', message, token, ipPlanningUser);
      } catch (memError) {
        // 靜默失敗
      }

      return;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let aiResponseContent = '';
    
    // 延遲創建 AI 訊息元素和移除 typing indicator（在收到第一個實際內容時才執行）
    let aiMessageEl = null;
    let contentDiv = null;
    let hasReceivedContent = false; // 標記是否已收到第一個內容
    
    const fullContent = [];
    let isCodeBlock = false;
    
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
            
            // 處理 save_request 事件（後端發送的儲存請求）
            if (json.type === 'save_request') {
              // 後端檢測到儲存指令，觸發儲存流程
              // 流程：儲存 → 先到生成結果 → 再存到創作者資料庫 → LLM 回覆（不消耗 token）
              const saveResultType = json.conversation_type === 'ip_planning' ? 'ip_planning' : conversationType;
              
              // 先儲存到生成結果（流程：儲存 → 先到生成結果 → 再存到創作者資料庫 → LLM 回覆）
              saveMode1Result(saveResultType).then(() => {
                // 儲存成功後，打開生成結果彈跳視窗並切換到對應標籤頁
                if (window.openMode1OneClickModal) {
                  window.openMode1OneClickModal();
                  setTimeout(() => {
                    // 根據 resultType 切換到對應標籤頁
                    const typeMap = {
                      'ip_planning': 'profile',
                      'plan': 'plan',
                      'scripts': 'scripts'
                    };
                    const targetType = typeMap[saveResultType] || 'profile';
                    if (window.switchMode1HistoryType) {
                      window.switchMode1HistoryType(targetType);
                    }
                    
                    // 強制重新載入歷史記錄，確保新儲存的內容顯示出來
                    setTimeout(() => {
                      if (window.loadMode1OneClickHistory) {
                        window.loadMode1OneClickHistory(targetType, true);
                      }
                    }, 200);
                  }, 100);
                }
                
                // 顯示 AI 確認訊息（不消耗 token，直接在前端顯示）
                const aiConfirmMessage = createMode1Message('assistant', '✅ 好的，我已將最新的生成內容保存到您的創作者資料庫。');
                chatMessages.appendChild(aiConfirmMessage);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // 顯示成功提示
                if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
                  window.ReelMindCommon.showToast('✅ 內容已儲存並顯示在生成結果中', 3000);
                }
              }).catch(error => {
                // 靜默失敗
              });
              
              // 跳過後續的 AI 回應（因為已經處理了儲存）
              continue;
            }
            
            // 忽略非內容事件（如 start, end）
            if (json.type === 'start' || json.type === 'end') {
              continue;
            }
            
            // 後端 SSE 格式可能是 {type: "token", content: "..."} 或 {message: {content: "..."}}
            let content = null;
            if (json.type === 'token' && json.content !== undefined) {
              // 新格式：{type: "token", content: "..."}
              content = json.content;
            } else if (json.message && json.message.content !== undefined) {
              // 舊格式：{message: {content: "..."}}
              content = json.message.content;
            } else if (json.content !== undefined) {
              // 直接 content 格式
              content = json.content;
            }
            
            // 只有當 content 存在且不為空時才處理
            if (content !== null && content !== undefined && content !== '') {
              // 在收到第一個實際內容時，才創建 AI 訊息元素並移除 typing indicator
              if (!hasReceivedContent) {
                hasReceivedContent = true;
                
                // 移除 typing indicator
                if (typingIndicatorEl.parentNode) {
                  typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
                }
                
                // 創建 AI 訊息元素
                aiMessageEl = createMode1Message('assistant', '');
                chatMessages.appendChild(aiMessageEl);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                contentDiv = aiMessageEl.querySelector('.message-content');
              }
              
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
              
              if (contentDiv) {
              contentDiv.innerHTML = renderedHtml;

              // 處理程式碼高亮
              contentDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
              });

              chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            }
          } catch (e) {
            // 只記錄真正的錯誤，忽略無法解析的數據（可能是空行或其他格式）
            if (data && data.trim() && data !== '[DONE]') {
            }
          }
        }
      }
    }

    // 確保在流結束時，如果還沒有收到任何內容，也要移除 typing indicator
    if (!hasReceivedContent && typingIndicatorEl.parentNode) {
      typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
      
      // 如果完全沒有收到內容，顯示錯誤訊息
      const aiErrorMessage = createMode1Message('assistant', '<span style="color: #ef4444;">❌ AI 沒有返回任何內容，請稍後再試。</span>');
      chatMessages.appendChild(aiErrorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 將完整的 AI 回應內容記錄到長期記憶
    try {
      await recordMode1ConversationMessage(conversationType, 'user', message, token, ipPlanningUser);
      await recordMode1ConversationMessage(conversationType, 'assistant', aiResponseContent, token, ipPlanningUser);
    } catch (error) {
      // 靜默失敗
    }

    // 自動儲存邏輯：根據內容判斷類型並自動儲存
    if (conversationType === 'ip_planning' && aiResponseContent && aiResponseContent.trim().length > 50) {
      // 帳號定位關鍵字
      const positioningKeywords = ['目標受眾', '內容定位', '風格調性', '競爭優勢', '執行建議', '帳號定位', '品牌定位'];
      const hasPositioningContent = positioningKeywords.some(keyword => aiResponseContent.includes(keyword));
      
      // 選題方向關鍵字
      const planKeywords = ['選題方向', '影片類型', '內容類型', '主題配比', '內容配比', '影片配比', '主題規劃', '內容規劃'];
      const hasPlanContent = planKeywords.some(keyword => aiResponseContent.includes(keyword));
      
      // 腳本關鍵字
      const scriptKeywords = ['今日腳本', '短影音腳本', '影片腳本', '腳本內容', '開場', '中場', '結尾', '腳本', '開頭', '結尾'];
      const hasScriptContent = scriptKeywords.some(keyword => aiResponseContent.includes(keyword));
      
      let detectedType = null;
      let targetTab = null;
      
      // 根據關鍵字判斷類型（優先順序：腳本 > 選題方向 > 帳號定位）
      if (hasScriptContent) {
        detectedType = 'scripts';
        targetTab = 'scripts';
      } else if (hasPlanContent) {
        detectedType = 'plan';
        targetTab = 'plan';
      } else if (hasPositioningContent) {
        detectedType = 'ip_planning';
        targetTab = 'profile';
      }
      
      if (detectedType) {
        setTimeout(async () => {
          try {
            await saveMode1Result(detectedType);
            if (window.openMode1OneClickModal) {
              window.openMode1OneClickModal();
              setTimeout(() => {
                if (window.switchMode1HistoryType) {
                  window.switchMode1HistoryType(targetTab);
                }
                setTimeout(() => {
                  if (window.loadMode1OneClickHistory) {
                    window.loadMode1OneClickHistory(targetTab, true);
                  }
                }, 200);
              }, 100);
            }
          } catch (error) {
            // 靜默失敗
          }
        }, 1000);
      }
    }

  } catch (error) {
    isMode1Sending = false;
    sendBtn.disabled = false;
    
    if (typingIndicatorEl && typingIndicatorEl.parentNode) {
      typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('發送訊息失敗，請檢查網絡或稍後再試。', 3000);
    }
    try {
      await recordMode1ConversationMessage(conversationType, 'user', message, ipPlanningToken, ipPlanningUser);
    } catch (memError) {
      // 靜默失敗
    }

  } finally {
    isMode1Sending = false;
    sendBtn.disabled = false;
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

// 渲染 Markdown（支援 HTML 和 Markdown 混合內容，完全自然語言顯示）
function renderMode1Markdown(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // 1. 先清理可能的編碼問題（HTML 實體解碼）
  let cleanedText = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // 2. 檢查是否包含 HTML 標籤
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(cleanedText);
  
  if (hasHtmlTags) {
    // 3. 如果包含 HTML，使用 DOMPurify 清理並保留所有格式標籤
    if (window.DOMPurify) {
      const sanitized = window.DOMPurify.sanitize(cleanedText, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'], // 只禁止危險標籤
        ADD_TAGS: [
          // 表格相關
          'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
          // 文字格式
          'strong', 'em', 'b', 'i', 'u', 's', 'strike', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
          // 列表
          'ul', 'ol', 'li', 'dl', 'dt', 'dd',
          // 段落和換行
          'p', 'br', 'div', 'span', 'hr',
          // 標題
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          // 引用和程式碼
          'blockquote', 'pre', 'code', 'kbd', 'samp',
          // 連結和圖片
          'a', 'img',
          // 其他
          'abbr', 'address', 'cite', 'q', 'time'
        ],
        ADD_ATTR: ['target', 'colspan', 'rowspan', 'class', 'style', 'href', 'src', 'alt', 'title', 'width', 'height'],
        KEEP_CONTENT: true, // 保留內容，即使標籤被移除
        ALLOW_DATA_ATTR: false // 禁止 data-* 屬性
      });
      return sanitized;
    }
    // 如果沒有 DOMPurify，直接返回（風險較高，但至少能顯示）
    return cleanedText;
  }
  
  // 4. 如果沒有 HTML 標籤，嘗試 Markdown 解析
  if (window.marked && window.DOMPurify) {
    try {
      // 確保 marked 支援所有需要的功能（先設置選項，再解析）
      if (typeof marked.setOptions === 'function') {
        marked.setOptions({
          breaks: true,  // 單個換行符轉換為 <br>
          gfm: true,     // GitHub Flavored Markdown（支援表格）
          headerIds: false, // 不生成標題 ID
          mangle: false  // 不混淆 email
        });
      }
      
      const rawHtml = marked.parse(cleanedText);
      
      // 使用 DOMPurify 清理 Markdown 轉換後的 HTML
      const cleanHtml = window.DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
        ADD_TAGS: [
          'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
          'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
          'p', 'br', 'div', 'span', 'hr',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'blockquote', 'pre', 'code', 'a', 'img'
        ],
        ADD_ATTR: ['target', 'colspan', 'rowspan', 'class', 'href', 'src', 'alt', 'title'],
        KEEP_CONTENT: true
      });
      
      return cleanHtml;
    } catch (e) {
      // 降級處理：如果渲染失敗，轉義並保留換行
      if (window.escapeHtml) {
        return window.escapeHtml(cleanedText).replace(/\n/g, '<br>');
      }
    }
  }
  
  // 5. 最終降級處理：轉義 HTML 並保留換行
  if (window.escapeHtml) {
    return window.escapeHtml(cleanedText).replace(/\n/g, '<br>');
  }
  
  // 6. 手動轉義（最基礎的降級處理）
  return cleanedText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

// 記錄會話訊息到記憶（短期記憶和長期記憶）
async function recordMode1ConversationMessage(conversationType, role, content, token, user) {
  if (!token || !user || !user.user_id) {
    return;
  }

  try {
    // 獲取 CSRF Token
    let csrfToken = '';
    if (window.Api && window.Api.getCsrfToken) {
      try {
        csrfToken = await window.Api.getCsrfToken() || '';
      } catch (e) {
      }
    }
    
    // 生成或獲取 session_id（使用當前會話類型 + 時間戳作為唯一標識）
    // 可以從 localStorage 獲取或生成新的 session_id
    let sessionId = localStorage.getItem(`mode1_session_${conversationType}`) || `session_${conversationType}_${Date.now()}`;
    if (!localStorage.getItem(`mode1_session_${conversationType}`)) {
      localStorage.setItem(`mode1_session_${conversationType}`, sessionId);
    }
    
    // 確保所有必填字段都有值
    if (!conversationType || !sessionId || !role || !content) {
      return;
    }
    
    const requestBody = {
      conversation_type: conversationType,
      session_id: sessionId,
      message_role: role,
      message_content: content
    };
    
    // 只有在 metadata 不為 null 時才添加（後端 Optional[str] 可以接受 null）
    // 但為了避免驗證問題，我們不發送 metadata 字段
    // requestBody.metadata = null;
    
    // 創建 AbortController 用於超時控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超時
    
    const response = await fetch(`${API_URL}/api/memory/long-term`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal // 綁定 abort signal
    });
    
    clearTimeout(timeoutId); // 清除超時計時器
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
      }
      // 靜默失敗，不影響主流程
    }
  } catch (error) {
    // 靜默失敗，不影響主流程
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
    // 獲取 CSRF Token
    let csrfToken = '';
    if (window.Api && window.Api.getCsrfToken) {
      try {
        csrfToken = await window.Api.getCsrfToken() || '';
      } catch (e) {
      }
    }
    
    // 獲取用戶 ID
    const user = JSON.parse(localStorage.getItem('ipPlanningUser') || 'null');
    if (!user || !user.user_id) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('無法獲取用戶資訊', 3000);
      }
      return;
    }
    
    // 映射 resultType 到後端期望的格式
    // ip_planning -> profile, plan -> plan, scripts -> scripts
    let resultTypeForBackend = resultType;
    if (resultType === 'ip_planning') {
      resultTypeForBackend = 'profile';  // 預設為 profile，或者可以讓用戶選擇
    }
    
    const response = await fetch(`${API_URL}/api/ip-planning/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        user_id: user.user_id,
        result_type: resultTypeForBackend,
        title: extractedTitle,
        content: latestAiMessageContent,
        metadata: {
          source: 'mode1'  // 標記來源為 mode1，確保與 mode3 分離
        }
      })
    });
    
    if (response.ok) {
      // 儲存成功後清除快取，強制重新載入
      clearHistoryCache();
      
      // 如果生成結果彈跳視窗已打開，重新載入當前標籤頁的歷史記錄
      const modal = document.getElementById('mode1OneClickModal');
      if (modal && modal.classList.contains('open')) {
        // 獲取當前活動的標籤頁
        const activeTab = document.querySelector('.mode1-oneclick-history-tab.active');
        if (activeTab) {
          const currentType = activeTab.dataset.type || 'profile';
          // 強制重新載入當前標籤頁的歷史記錄
          setTimeout(() => {
            loadMode1OneClickHistory(currentType, true);
          }, 300);
        }
      }
      
    } else {
      const errorData = await response.json();
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`保存失敗: ${errorData.message || '未知錯誤'}`, 3000);
      }
    }
  } catch (error) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('保存失敗，請稍後再試', 3000);
    }
  }
}
window.saveMode1Result = saveMode1Result; // 導出到全局作用域

// ===== 全局函數導出（確保在 DOMContentLoaded 之前可用，所有函數已定義） =====
if (typeof window !== 'undefined') {
  // 使用說明抽屜相關函數
  window.toggleMode1InstructionsDrawer = toggleMode1InstructionsDrawer;
  window.openMode1InstructionsDrawer = openMode1InstructionsDrawer;
  window.closeMode1InstructionsDrawer = closeMode1InstructionsDrawer;

  // 快速按鈕處理函數（如果存在）
  if (typeof handleQuickButton === 'function') {
    window.handleQuickButton = handleQuickButton;
  }

  // 生成結果 Modal 相關函數（部分已在定義後立即導出，這裡確保完整性）
  if (typeof openMode1OneClickModal === 'function') {
    window.openMode1OneClickModal = openMode1OneClickModal;
  }
  if (typeof closeMode1OneClickModal === 'function') {
    window.closeMode1OneClickModal = closeMode1OneClickModal;
  }
  if (typeof switchMode1HistoryType === 'function') {
    window.switchMode1HistoryType = switchMode1HistoryType;
  }
  if (typeof deleteMode1HistoryResult === 'function') {
    window.deleteMode1HistoryResult = deleteMode1HistoryResult;
  }
  // exportHistoryResult 已直接定義為 window.exportHistoryResult，無需重複導出
  if (typeof selectHistoryResult === 'function') {
    window.selectHistoryResult = selectHistoryResult;
  }
  if (typeof removeSelectedSetting === 'function') {
    window.removeSelectedSetting = removeSelectedSetting;
  }
  if (typeof useSelectedSettingsToChat === 'function') {
    window.useSelectedSettingsToChat = useSelectedSettingsToChat;
  }
  if (typeof editMode1HistoryTitle === 'function') {
    window.editMode1HistoryTitle = editMode1HistoryTitle;
  }
  if (typeof saveMode1HistoryTitle === 'function') {
    window.saveMode1HistoryTitle = saveMode1HistoryTitle;
  }
  if (typeof cancelMode1HistoryTitleEdit === 'function') {
    window.cancelMode1HistoryTitleEdit = cancelMode1HistoryTitleEdit;
  }

  // 展開內容 Modal 相關函數（部分已在定義後立即導出）
  if (typeof openMode1ExpandModal === 'function') {
    window.openMode1ExpandModal = openMode1ExpandModal;
  }
  if (typeof closeMode1ExpandModal === 'function') {
    window.closeMode1ExpandModal = closeMode1ExpandModal;
  }
  if (typeof toggleHistoryContentExpanded === 'function') {
    window.toggleHistoryContentExpanded = toggleHistoryContentExpanded;
  }

  // 其他可能被 HTML onclick 直接調用的函數（從 common.js 來的，但防止其他頁面沒有引入 common.js 時出錯）
  if (typeof handleModeNavigation === 'function') {
    window.handleModeNavigation = handleModeNavigation;
  }
  if (typeof goToLogin === 'function') {
    window.goToLogin = goToLogin;
  }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
  
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

  // 移除事件委託監聽器，讓按鈕的 onclick 屬性直接執行
  // 所有按鈕都已經有 onclick 屬性，並且所有函數都已導出到全局作用域
  // const historyContainer = document.getElementById('mode1OneClickHistoryContainer');
  // if (historyContainer) {
  //   historyContainer.addEventListener('click', function(e) {
  //     // 事件委託已移除，使用按鈕的 onclick 屬性
  //   });
  // }

  // 更新用戶資訊
  updateUserInfo();

  // 檢查登入狀態並更新 UI
  if (window.ReelMindCommon && window.ReelMindCommon.checkLoginStatus) {
    await window.ReelMindCommon.checkLoginStatus();
  }
  if (window.ReelMindCommon && window.ReelMindCommon.checkSubscriptionStatus) {
    await window.ReelMindCommon.checkSubscriptionStatus();
  }

  // 綁定生成結果按鈕事件（確保使用新的彈跳視窗）
  const resultsBtn = document.getElementById('mode1ResultsBtn');
  if (resultsBtn) {
    // 確保使用全局函數，避免作用域問題
    const openModal = window.openMode1OneClickModal || openMode1OneClickModal;
    if (typeof openModal === 'function') {
      resultsBtn.addEventListener('click', openModal);
    } else {
    }
  } else {
  }

  // 處理 SSE 事件
  // 注意：後端目前沒有 /api/events 端點，SSE 事件已整合在 /api/chat/stream 中
  // 儲存請求會通過聊天串流中的 save_request 事件處理，無需單獨的 SSE 連接
  // 如果需要實時通知功能，可以在後端添加 /api/events 端點
});

// 初始化 Mode1 聊天功能
function initMode1Chat() {
  // 防止重複初始化
  if (mode1ChatInitialized) {
    return;
  }
  
  const messageInput = document.getElementById('mode1-messageInput');
  const sendBtn = document.getElementById('mode1-sendBtn');
  const chatMessages = document.getElementById('mode1-chatMessages');
  const quickButtons = document.getElementById('mode1-quickButtons');
  const body = document.body;

  if (messageInput && sendBtn && chatMessages && quickButtons) {
    // 標記已初始化
    mode1ChatInitialized = true;
    
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

    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const message = messageInput.value.trim();
      if (message) {
        if (isMode1Sending) {
          isMode1Sending = false;
          sendBtn.disabled = false;
        }
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        sendMode1Message(message).catch(err => {
          isMode1Sending = false;
          sendBtn.disabled = false;
        });
      }
    }, true);

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const message = messageInput.value.trim();
        if (message) {
          if (isMode1Sending) {
            isMode1Sending = false;
            const sendBtn = document.getElementById('mode1-sendBtn');
            if (sendBtn) {
              sendBtn.disabled = false;
            }
          }
          
          messageInput.value = '';
          messageInput.style.height = 'auto';
          
          sendMode1Message(message).catch(err => {
            isMode1Sending = false;
            const sendBtn = document.getElementById('mode1-sendBtn');
            if (sendBtn) {
              sendBtn.disabled = false;
            }
          });
        }
      }
    }, true);
    
    // 防止表單提交（如果輸入框在表單內）
    const form = messageInput.closest('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (isMode1Sending) {
          return;
        }
        
        const message = messageInput.value.trim();
        if (message) {
          // 立即設置發送標誌
          isMode1Sending = true;
          
          // 清空輸入框
          messageInput.value = '';
          messageInput.style.height = 'auto';
          
          // 發送訊息
          sendMode1Message(message);
        }
      }, true); // 使用 capture 階段
    }
  }
}