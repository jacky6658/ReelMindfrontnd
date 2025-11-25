// userDB.js - 創作者資料庫專用函數
// 從 index.html 提取的所有 userDB 相關函數

// ===== 工具函數 =====

// 預設腳本標題
const DEFAULT_SCRIPT_TITLE = '點我編輯腳本標題';

// 獲取本地腳本
function getLocalScripts() {
  try {
    const scripts = localStorage.getItem('user_scripts');
    return scripts ? JSON.parse(scripts) : [];
  } catch (error) {
    console.error('Error loading local scripts:', error);
    return [];
  }
}

// 格式化台灣時區時間
function formatTaiwanTime(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false  // 使用 24 小時制
    });
  } catch (error) {
    console.error('格式化台灣時區時間錯誤:', error);
    return dateString;
  }
}

// 顯示載入動畫
function showLoadingAnimation(container, message = '載入中...') {
  if (!container) return;
  // 使用 escapeHtml 防止 XSS 攻擊
  const safeMessage = escapeHtml(message);
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; padding: 40px; gap: 12px; flex-direction: column;">
      <div class="spinner" style="width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
      <span style="color: #6b7280; font-size: 14px;">${safeMessage}</span>
    </div>
  `;
}

// XSS 防護函數
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== 腳本管理函數 =====

// 載入我的腳本
async function loadMyScriptsForUserDB() {
  const content = document.querySelector('#db-myScripts .section-content');
  
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (content) {
      content.innerHTML = '<div class="loading-text">請先登入以查看腳本記錄</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入以查看腳本記錄', 3000);
    }
    return;
  }
  
  if (content) {
    showLoadingAnimation(content, '載入腳本記錄中...');
  }
  
  console.log('正在載入腳本列表...', {
    ipPlanningToken: ipPlanningToken ? 'present' : 'missing',
    userId: ipPlanningUser.user_id
  });
  
  // 先檢查本地儲存的腳本
  const localScripts = getLocalScripts();
  console.log('本地腳本數量:', localScripts.length);
  
  // 如果有本地腳本，立即顯示（避免閃爍）
  if (localScripts.length > 0 && content) {
    displayScriptsForUserDB(localScripts);
  } else if (content) {
    showLoadingAnimation(content, '載入中...');
  }
  
  // 從後端 API 獲取腳本列表
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/scripts/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('腳本列表響應狀態:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('腳本列表數據:', data);
      const serverScripts = data.scripts || [];
      
      // 合併本地和後端腳本（後端優先，因為後端是權威數據源）
      const scriptMap = new Map();
      
      // 先添加後端腳本（優先）
      serverScripts.forEach(script => {
        if (script.id) {
          scriptMap.set(script.id, script);
        } else {
          const uniqueKey = script.created_at || Date.now();
          scriptMap.set(uniqueKey, script);
        }
      });
      
      // 再添加本地腳本（僅當後端沒有時）
      localScripts.forEach(script => {
        if (script.id && !scriptMap.has(script.id)) {
          scriptMap.set(script.id, script);
        }
      });
      
      // 轉換為陣列並更新本地儲存
      const mergedScripts = Array.from(scriptMap.values());
      console.log('合併後的腳本數量:', mergedScripts.length);
      
      // 更新本地儲存（同步後端數據）
      localStorage.setItem('user_scripts', JSON.stringify(mergedScripts));
      
      if (content) {
        if (mergedScripts.length > 0) {
          displayScriptsForUserDB(mergedScripts);
        } else {
          content.innerHTML = '<div class="loading-text">還沒有儲存的腳本，請先使用一鍵生成功能創建腳本</div>';
        }
      }
    } else if (response.status === 401) {
      console.log('腳本載入失敗: 認證錯誤');
      if (content && localScripts.length === 0) {
        const refreshed = await window.Api?.refreshTokenIfNeeded?.();
        if (refreshed) {
          return loadMyScriptsForUserDB();
        }
        content.innerHTML = '<div class="loading-text">請先登入</div>';
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('請先登入以查看腳本記錄', 3000);
        }
      }
    } else if (response.status === 404) {
      console.log('腳本載入失敗: API不存在');
      // 如果後端 API 不存在，只顯示本地腳本
      if (content && localScripts.length === 0) {
        content.innerHTML = '<div class="loading-text">腳本功能即將上線，請稍後再試</div>';
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('腳本功能即將上線，請稍後再試', 3000);
        }
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('腳本載入失敗:', errorData);
      // 如果後端載入失敗，只顯示本地腳本（不顯示錯誤訊息，避免影響用戶體驗）
      if (content && localScripts.length === 0) {
        content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
        }
      }
    }
  } catch (error) {
    console.error('Load scripts error:', error);
    // 如果後端載入失敗，只顯示本地腳本（不顯示錯誤訊息，避免影響用戶體驗）
    if (content && localScripts.length === 0) {
      content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
      }
    }
  }
}

// 顯示腳本列表
function displayScriptsForUserDB(scripts) {
  const container = document.querySelector('#db-myScripts .section-content');
  
  if (!container) return;
  
  if (scripts.length === 0) {
    container.innerHTML = '<div class="loading-text">還沒有儲存的腳本</div>';
    return;
  }
  
  // 按時間排序：由舊到新
  const sortedScripts = [...scripts].sort((a, b) => {
    const timeA = new Date(a.created_at || a.id || 0).getTime();
    const timeB = new Date(b.created_at || b.id || 0).getTime();
    return timeA - timeB;
  });
  
  container.innerHTML = sortedScripts.map((script, index) => {
    // 轉義 script.id 以防止 XSS（雖然主要是數字，但為了安全）
    const safeScriptId = String(script.id || '').replace(/['"\\]/g, '');
    const escapedScriptId = escapeHtml(safeScriptId);
    
    return `
    <div class="script-item" data-script-id="${escapedScriptId}">
      <div class="script-header" onclick="toggleScriptForUserDB('${safeScriptId.replace(/'/g, "\\'")}')">
        <div class="script-info">
          <span class="script-number">編號${String(index + 1).padStart(2, '0')}</span>
          <span class="script-name" onclick="editScriptNameForUserDB('${safeScriptId.replace(/'/g, "\\'")}', event)">${escapeHtml(script.name || script.title || DEFAULT_SCRIPT_TITLE)}</span>
          <span class="script-date">${formatTaiwanTime(script.created_at)}</span>
        </div>
        <div class="script-toggle">
          <span class="toggle-icon">▼</span>
        </div>
      </div>
      <div class="script-content" id="script-${escapedScriptId}" style="display: none;">
        <div class="script-details">
          <div class="script-table">
            <table>
              <thead>
                <tr>
                  <th>時間</th>
                  <th>段落</th>
                  <th>鏡頭/畫面</th>
                  <th>台詞 (演員口白)</th>
                  <th>字幕文字 (可動畫)</th>
                  <th>音效與轉場</th>
                </tr>
              </thead>
              <tbody>
                ${generateScriptTable(script.script_data || script.content || script)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="script-actions" id="actions-${escapedScriptId}" style="display: none;">
        <button class="action-btn view-btn" onclick="viewFullScriptForUserDB('${safeScriptId.replace(/'/g, "\\'")}')" data-script-id="${escapedScriptId}">
          <i class="fas fa-eye" style="font-size: 12px;"></i>
          查看完整結果
        </button>
        <button class="action-btn download-pdf-btn" onclick="downloadScriptPDF('${safeScriptId.replace(/'/g, "\\'")}')" data-script-id="${escapedScriptId}">
          <i class="fas fa-file-pdf" style="font-size: 12px;"></i>
          下載PDF檔案
        </button>
        <button class="action-btn download-csv-btn" onclick="downloadScriptCSV('${safeScriptId.replace(/'/g, "\\'")}')" data-script-id="${escapedScriptId}">
          <i class="fas fa-file-csv" style="font-size: 12px;"></i>
          下載CSV檔案
        </button>
        <button class="action-btn delete-btn" onclick="deleteScriptForUserDB('${safeScriptId.replace(/'/g, "\\'")}')" data-script-id="${escapedScriptId}">
          <i class="fas fa-trash" style="font-size: 12px;"></i>
          刪除
        </button>
      </div>
    </div>
  `;
  }).join('');
}

// 生成腳本表格
function generateScriptTable(scriptData) {
  console.log('生成腳本表格，數據:', scriptData);
  
  if (scriptData && scriptData.error) {
    console.log('腳本數據有錯誤:', scriptData.message);
    return `<tr><td colspan="6">解析失敗: ${escapeHtml(scriptData.message)}</td></tr>`;
  }
  
  // 處理新格式（有rows欄位）
  if (scriptData && scriptData.rows && scriptData.rows.length > 0) {
    let tableRows = '';
    
    scriptData.rows.forEach((row, index) => {
      const timeRange = row.time || (row.start_sec !== undefined && row.end_sec !== undefined ? `${row.start_sec}-${row.end_sec}s` : '-');
      const section = escapeHtml(row.section || '-');
      const shotDesc = escapeHtml(row.shot_desc || '-');
      const dialogue = escapeHtml(row.dialogue || '-');
      const subtitle = escapeHtml(row.subtitle || '-');
      const sfx = escapeHtml(row.sfx || '-');
      
      // 轉義 timeRange 以防止 XSS（雖然主要是數字，但為了安全）
      const escapedTimeRange = escapeHtml(String(timeRange));
      
      // 轉義 title 屬性中的值（雙重轉義，因為 title 屬性在 HTML 中）
      const escapedShotDescTitle = shotDesc.replace(/"/g, '&quot;');
      const escapedDialogueTitle = dialogue.replace(/"/g, '&quot;');
      const escapedSubtitleTitle = subtitle.replace(/"/g, '&quot;');
      const escapedSfxTitle = sfx.replace(/"/g, '&quot;');
      
      tableRows += `
        <tr>
          <td>${escapedTimeRange}</td>
          <td>${section}</td>
          <td title="${escapedShotDescTitle}">${shotDesc}</td>
          <td title="${escapedDialogueTitle}">${dialogue}</td>
          <td title="${escapedSubtitleTitle}">${subtitle}</td>
          <td title="${escapedSfxTitle}">${sfx}</td>
        </tr>
      `;
    });
    
    console.log('生成的表格行:', tableRows);
    return tableRows || '<tr><td colspan="6">無數據</td></tr>';
  }
  
  // 處理舊格式（有sections欄位）
  if (scriptData && scriptData.sections && scriptData.sections.length > 0) {
    let tableRows = '';
    let timeIndex = 0;
    const timeRanges = ['0-3s', '3-7s', '7-15s', '15-25s', '25-30s'];
    
    const hasVisualData = scriptData.visual && scriptData.visual.trim() !== '';
    let visualLines = [];
    
    if (hasVisualData) {
      visualLines = scriptData.visual.split('\n').map(line => line.trim()).filter(line => line);
    }
    
    scriptData.sections.forEach((section, sectionIndex) => {
      if (section.content && section.content.length > 0) {
        section.content.forEach((content, contentIndex) => {
          const timeRange = timeRanges[timeIndex] || '-';
          const sectionType = escapeHtml(section.type || '內容段落');
          const cleanContent = content.trim();
          const displayContent = cleanContent.length > 30 ? 
            escapeHtml(cleanContent.substring(0, 30) + '...') : escapeHtml(cleanContent);
          
          let visualDescription = '-';
          if (hasVisualData && visualLines[timeIndex]) {
            visualDescription = visualLines[timeIndex].length > 50 ? 
              escapeHtml(visualLines[timeIndex].substring(0, 50) + '...') : escapeHtml(visualLines[timeIndex]);
          }
          
          // 轉義 timeRange 以防止 XSS
          const escapedTimeRange = escapeHtml(String(timeRange));
          
          // 轉義 title 屬性中的值（雙重轉義，因為 title 屬性在 HTML 中）
          const escapedVisualTitle = (hasVisualData && visualLines[timeIndex] ? escapeHtml(visualLines[timeIndex]) : visualDescription).replace(/"/g, '&quot;');
          const escapedContentTitle = escapeHtml(cleanContent).replace(/"/g, '&quot;');
          
          tableRows += `
            <tr>
              <td>${escapedTimeRange}</td>
              <td>${sectionType}</td>
              <td title="${escapedVisualTitle}">${visualDescription}</td>
              <td title="${escapedContentTitle}">${displayContent}</td>
              <td>-</td>
              <td>-</td>
            </tr>
          `;
          timeIndex++;
        });
      }
    });
    
    return tableRows || '<tr><td colspan="6">無數據</td></tr>';
  }
  
  return '<tr><td colspan="6">無數據</td></tr>';
}

// 切換腳本顯示
window.toggleScriptForUserDB = function(scriptId) {
  const scriptContent = document.getElementById(`script-${scriptId}`);
  const scriptActions = document.getElementById(`actions-${scriptId}`);
  const toggleIcon = document.querySelector(`[data-script-id="${scriptId}"] .toggle-icon`);
  const scriptHeader = document.querySelector(`[data-script-id="${scriptId}"] .script-header`);
  const scriptNumber = document.querySelector(`[data-script-id="${scriptId}"] .script-number`);
  
  if (!scriptContent || !scriptActions) {
    console.error('找不到腳本元素:', scriptId);
    return;
  }
  
  if (scriptContent.style.display === 'none' || !scriptContent.style.display) {
    scriptContent.style.display = 'block';
    scriptActions.style.display = 'flex';
    if (toggleIcon) toggleIcon.textContent = '▲';
    if (scriptHeader) scriptHeader.style.background = '#f0f9ff';
    if (scriptNumber) scriptNumber.style.background = '#2563eb';
  } else {
    scriptContent.style.display = 'none';
    scriptActions.style.display = 'none';
    if (toggleIcon) toggleIcon.textContent = '▼';
    if (scriptHeader) scriptHeader.style.background = '';
    if (scriptNumber) scriptNumber.style.background = '#3b82f6';
  }
}

// 編輯腳本名稱
window.editScriptNameForUserDB = function(scriptId, event) {
  if (event) event.stopPropagation();
  
  console.log('🔍 editScriptNameForUserDB 被調用，scriptId:', scriptId, '類型:', typeof scriptId);
  
  // 驗證 scriptId
  if (!scriptId && scriptId !== 0) {
    console.error('❌ 無效的 scriptId:', scriptId);
    return;
  }
  
  const scriptIdStr = String(scriptId);
  console.log('📝 轉換為字符串:', scriptIdStr);
  
  // 先嘗試使用原始 ID 查找（一鍵生成列表使用原始 ID）
  let scriptNameElement = document.querySelector(`[data-script-id="${scriptIdStr}"] h4`);
  
  // 如果找不到，嘗試查找 .script-name（我的腳本列表）
  if (!scriptNameElement) {
    scriptNameElement = document.querySelector(`[data-script-id="${scriptIdStr}"] .script-name`);
  }
  
  // 如果還是找不到，嘗試清理後的 ID
  if (!scriptNameElement) {
    const safeScriptId = scriptIdStr.replace(/[^a-zA-Z0-9_-]/g, '');
    scriptNameElement = document.querySelector(`[data-script-id="${safeScriptId}"] h4`) ||
                       document.querySelector(`[data-script-id="${safeScriptId}"] .script-name`);
  }
  
  if (!scriptNameElement) {
    console.error('❌ 找不到腳本名稱元素，scriptId:', scriptIdStr);
    // 調試：列出所有可能的元素
    const allScriptItems = document.querySelectorAll('[data-script-id]');
    console.log('📋 所有腳本項目:', Array.from(allScriptItems).map(el => ({
      id: el.getAttribute('data-script-id'),
      idType: typeof el.getAttribute('data-script-id'),
      hasH4: !!el.querySelector('h4'),
      hasScriptName: !!el.querySelector('.script-name'),
      h4Text: el.querySelector('h4')?.textContent?.substring(0, 20)
    })));
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('無法找到標題元素，請刷新頁面後再試', 3000);
    }
    return;
  }
  
  console.log('✅ 找到標題元素:', scriptNameElement);
  const currentName = scriptNameElement.textContent.trim();
  console.log('📝 當前標題:', currentName);
  
  // 使用自定義輸入框代替 prompt()
  showEditTitleModal('腳本名稱', currentName, (newName) => {
    if (newName && newName.trim() !== '' && newName !== currentName) {
      console.log('💾 更新標題為:', newName.trim());
      updateScriptNameForUserDB(scriptId, newName.trim());
    }
  });
}

// 顯示編輯標題的 Modal
function showEditTitleModal(titleLabel, currentValue, onConfirm) {
  // 移除現有的 modal（如果存在）
  const existingModal = document.getElementById('edit-title-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 創建 modal
  const modal = document.createElement('div');
  modal.id = 'edit-title-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100000;
    animation: fadeIn 0.2s ease;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    min-width: 400px;
    max-width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
  `;
  
  modalContent.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1F2937;">編輯${titleLabel}</h3>
    <input type="text" id="edit-title-input" value="${escapeHtml(currentValue)}" style="width: 100%; padding: 10px 12px; border: 2px solid #E5E7EB; border-radius: 8px; font-size: 14px; margin-bottom: 16px; box-sizing: border-box; outline: none;" 
           onkeypress="if(event.key === 'Enter') { document.getElementById('edit-title-confirm-btn').click(); }">
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="edit-title-cancel-btn" style="padding: 8px 16px; border: 1px solid #D1D5DB; background: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151;">取消</button>
      <button id="edit-title-confirm-btn" style="padding: 8px 16px; border: none; background: #3B82F6; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">確認</button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // 聚焦輸入框
  const input = document.getElementById('edit-title-input');
  input.focus();
  input.select();
  
  // 確認按鈕
  document.getElementById('edit-title-confirm-btn').onclick = () => {
    const newValue = input.value.trim();
    modal.remove();
    if (onConfirm) {
      onConfirm(newValue);
    }
  };
  
  // 取消按鈕
  document.getElementById('edit-title-cancel-btn').onclick = () => {
    modal.remove();
  };
  
  // 點擊背景關閉
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  
  // ESC 鍵關閉
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// 更新腳本名稱
async function updateScriptNameForUserDB(scriptId, newName) {
  try {
    console.log('💾 updateScriptNameForUserDB 被調用，scriptId:', scriptId, 'newName:', newName);
    const scriptIdStr = String(scriptId);
    
    // 更新一鍵生成腳本列表中的標題（h4）- 優先更新
    let h4Element = document.querySelector(`[data-script-id="${scriptIdStr}"] h4`);
    if (h4Element) {
      console.log('✅ 更新 h4 標題');
      h4Element.textContent = newName;
    }
    
    // 更新我的腳本列表中的標題
    let scriptNameElement = document.querySelector(`[data-script-id="${scriptIdStr}"] .script-name`);
    if (scriptNameElement) {
      console.log('✅ 更新 .script-name 標題');
      scriptNameElement.textContent = newName;
    }
    
    // 如果都找不到，嘗試清理後的 ID
    if (!h4Element && !scriptNameElement) {
      const safeScriptId = scriptIdStr.replace(/[^a-zA-Z0-9_-]/g, '');
      h4Element = document.querySelector(`[data-script-id="${safeScriptId}"] h4`);
      scriptNameElement = document.querySelector(`[data-script-id="${safeScriptId}"] .script-name`);
      if (h4Element) {
        h4Element.textContent = newName;
      }
      if (scriptNameElement) {
        scriptNameElement.textContent = newName;
      }
    }
    
    if (!h4Element && !scriptNameElement) {
      console.warn('⚠️ 找不到要更新的元素');
    }
    
    // 更新本地儲存
    const localScripts = getLocalScripts();
    const scriptIndex = localScripts.findIndex(script => script.id == scriptId);
    if (scriptIndex !== -1) {
      localScripts[scriptIndex].name = newName;
      localStorage.setItem('user_scripts', JSON.stringify(localScripts));
    }
    
    // 嘗試更新後端
    try {
      const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
      const response = await fetch(`${API_URL}/api/scripts/${scriptId}/name`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('腳本名稱已更新', 3000);
        }
      } else {
        console.log('後端更新失敗，但本地已更新');
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('腳本名稱已更新（本地）', 3000);
        }
      }
    } catch (apiError) {
      console.log('API不存在或網路錯誤，但本地已更新');
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('腳本名稱已更新（本地）', 3000);
      }
    }
    
  } catch (error) {
    console.error('Update script name error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('更新失敗，請稍後再試', 3000);
    }
  }
}

// 編輯 IP Planning 標題（帳號定位/選題方向）
window.editIpPlanningTitleForUserDB = function(resultId, event) {
  if (event) event.stopPropagation();
  
  if (!resultId || (typeof resultId !== 'string' && typeof resultId !== 'number')) {
    console.error('無效的 resultId:', resultId);
    return;
  }
  const safeResultId = String(resultId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeResultId) {
    console.error('清理後的 resultId 為空:', resultId);
    return;
  }
  
  const titleElement = document.querySelector(`[data-result-id="${safeResultId}"] h4`);
  if (!titleElement) {
    // 嘗試使用原始 ID
    const titleElement2 = document.querySelector(`[data-result-id="${resultId}"] h4`);
    if (!titleElement2) {
      console.error('找不到標題元素:', safeResultId);
      return;
    }
    const currentTitle = titleElement2.textContent.trim();
    showEditTitleModal('標題', currentTitle, (newTitle) => {
      if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
        updateIpPlanningTitleForUserDB(resultId, newTitle.trim());
      }
    });
    return;
  }
  
  const currentTitle = titleElement.textContent.trim();
  
  // 使用自定義輸入框代替 prompt()
  showEditTitleModal('標題', currentTitle, (newTitle) => {
    if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
      updateIpPlanningTitleForUserDB(resultId, newTitle.trim());
    }
  });
}

// 更新 IP Planning 標題
async function updateIpPlanningTitleForUserDB(resultId, newTitle) {
  try {
    const safeResultId = String(resultId).replace(/[^a-zA-Z0-9_-]/g, '');
    const titleElement = document.querySelector(`[data-result-id="${safeResultId}"] h4`) ||
      document.querySelector(`[data-result-id="${resultId}"] h4`);
    if (titleElement) {
      titleElement.textContent = newTitle;
    }
    
    // 嘗試更新後端
    try {
      const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
      const response = await fetch(`${API_URL}/api/ip-planning/${resultId}/title`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      
      if (response.ok) {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('標題已更新', 3000);
        }
      } else {
        console.log('後端更新失敗，但本地已更新');
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('標題已更新（本地）', 3000);
        }
      }
    } catch (apiError) {
      console.log('API不存在或網路錯誤，但本地已更新');
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('標題已更新（本地）', 3000);
      }
    }
  } catch (error) {
    console.error('Update IP planning title error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('更新失敗，請稍後再試', 3000);
    }
  }
}

// 查看腳本詳細（一鍵生成分類使用）
window.viewScriptDetailForUserDB = function(scriptId) {
  console.log('查看腳本詳細，ID:', scriptId);
  
  // 先嘗試從本地儲存查找
  const localScripts = getLocalScripts();
  let script = localScripts.find(s => String(s.id) === String(scriptId));
  
  if (script) {
    // 如果本地有，直接使用
    if (window.viewFullScriptForUserDB) {
      window.viewFullScriptForUserDB(scriptId);
      return;
    }
  }
  
  // 如果本地沒有，從 API 獲取
  viewScriptDetailFromAPI(scriptId);
};

// 從 API 獲取腳本詳細
async function viewScriptDetailFromAPI(scriptId) {
  try {
    console.log('🔍 開始從 API 獲取腳本詳細，ID:', scriptId);
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    
    // 先嘗試從列表 API 獲取（更可靠）
    let response = await fetch(`${API_URL}/api/scripts/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    let script = null;
    if (response.ok) {
      const data = await response.json();
      console.log('📋 獲取到的腳本列表:', data);
      script = data.scripts?.find(s => String(s.id) === String(scriptId));
      console.log('✅ 找到腳本:', script ? '是' : '否');
    } else {
      console.warn('⚠️ 列表 API 失敗，狀態碼:', response.status);
    }
    
    // 如果列表 API 沒找到，嘗試單個腳本 API
    if (!script) {
      console.log('🔄 嘗試單個腳本 API...');
      response = await fetch(`${API_URL}/api/scripts/${scriptId}`, {
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        script = data.script || data;
        console.log('✅ 從單個 API 找到腳本:', script ? '是' : '否');
      } else {
        console.warn('⚠️ 單個腳本 API 失敗，狀態碼:', response.status);
      }
    }
    
    if (script) {
      console.log('📝 處理腳本數據:', script);
      // 轉換格式
      let scriptData = {};
      try {
        scriptData = typeof script.script_data === 'string' 
          ? JSON.parse(script.script_data) 
          : (script.script_data || {});
      } catch (e) {
        console.error('❌ 解析 script_data 失敗:', e);
        scriptData = {};
      }
      
      const formattedScript = {
        id: script.id,
        name: script.script_name || script.name || script.title || DEFAULT_SCRIPT_TITLE,
        created_at: script.created_at || '',
        script_data: scriptData,
        content: script.content || ''
      };
      
      console.log('✅ 格式化後的腳本:', formattedScript);
      
      // 臨時添加到本地儲存以便 viewFullScriptForUserDB 可以找到
      const localScripts = getLocalScripts();
      const existingIndex = localScripts.findIndex(s => String(s.id) === String(scriptId));
      if (existingIndex !== -1) {
        localScripts[existingIndex] = formattedScript;
      } else {
        localScripts.push(formattedScript);
      }
      localStorage.setItem('user_scripts', JSON.stringify(localScripts));
      console.log('💾 已保存到本地儲存');
      
      // 顯示腳本詳細
      if (window.viewFullScriptForUserDB) {
        console.log('📖 調用 viewFullScriptForUserDB');
        window.viewFullScriptForUserDB(scriptId);
      } else {
        console.error('❌ viewFullScriptForUserDB 函數不存在');
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('找不到腳本數據', 3000);
        }
      }
    } else {
      console.error('❌ 找不到腳本，ID:', scriptId);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到腳本數據', 3000);
      }
    }
  } catch (error) {
    console.error('❌ 獲取腳本詳細錯誤:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
}

// 查看完整腳本
window.viewFullScriptForUserDB = function(scriptId) {
  const scripts = getLocalScripts();
  let script = scripts.find(s => s.id == scriptId);
  
  if (!script) {
    const scriptItem = document.querySelector(`[data-script-id="${scriptId}"]`);
    if (scriptItem) {
      const scriptName = scriptItem.querySelector('.script-name')?.textContent || DEFAULT_SCRIPT_TITLE;
      const scriptDate = scriptItem.querySelector('.script-date')?.textContent || '';
      const scriptTable = scriptItem.querySelector('table');
      
      if (scriptTable) {
        const rows = Array.from(scriptTable.querySelectorAll('tbody tr'));
        const scriptData = {
          rows: rows.map(row => {
            const cells = row.querySelectorAll('td');
            return {
              time: cells[0]?.textContent || '-',
              section: cells[1]?.textContent || '-',
              shot_desc: cells[2]?.textContent || '-',
              dialogue: cells[3]?.textContent || '-',
              subtitle: cells[4]?.textContent || '-',
              sfx: cells[5]?.textContent || '-'
            };
          })
        };
        
        script = {
          id: scriptId,
          name: scriptName,
          created_at: scriptDate,
          script_data: scriptData
        };
      }
    }
  }
  
  if (!script) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('找不到腳本數據', 3000);
    }
    return;
  }
  
  // 創建彈出視窗
  const modal = document.createElement('div');
  modal.className = 'script-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100000 !important;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 95%;
    max-height: 95%;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    position: relative;
  `;
  
  let fullContent = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 600;">${escapeHtml(script.name || DEFAULT_SCRIPT_TITLE)}</h2>
        ${script.created_at ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${escapeHtml(script.created_at)}</p>` : ''}
      </div>
      <button onclick="this.closest('.script-modal-overlay').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">×</button>
    </div>
  `;
  
  if (script.script_data && script.script_data.rows && script.script_data.rows.length > 0) {
    fullContent += `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; white-space: nowrap;">時間</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">段落</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">鏡頭/畫面</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">台詞 (演員口白)</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">字幕文字 (可動畫)</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">音效與轉場</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    script.script_data.rows.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
      let timeDisplay = '-';
      if (row.time && row.time !== 'undefined-undefineds' && row.time !== '-') {
        timeDisplay = escapeHtml(row.time);
      } else if (row.start_sec !== undefined && row.end_sec !== undefined) {
        timeDisplay = `${row.start_sec}-${row.end_sec}s`;
      } else if (row.time && typeof row.time === 'string' && row.time.includes('-') && row.time.includes('s')) {
        timeDisplay = escapeHtml(row.time);
      }
      fullContent += `
        <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; color: #1f2937; white-space: nowrap; font-weight: 500;">${timeDisplay}</td>
          <td style="padding: 12px; color: #4b5563;">${escapeHtml(row.section || '-')}</td>
          <td style="padding: 12px; color: #4b5563; max-width: 200px;">${escapeHtml(row.shot_desc || '-')}</td>
          <td style="padding: 12px; color: #4b5563; max-width: 300px;">${escapeHtml(row.dialogue || '-')}</td>
          <td style="padding: 12px; color: #4b5563; max-width: 300px;">${escapeHtml(row.subtitle || '-')}</td>
          <td style="padding: 12px; color: #4b5563;">${escapeHtml(row.sfx || '-')}</td>
        </tr>
      `;
    });
    
    fullContent += `
          </tbody>
        </table>
      </div>
    `;
  } else if (script.script_data && script.script_data.sections && script.script_data.sections.length > 0) {
    fullContent += '<div style="margin-top: 16px;">';
    script.script_data.sections.forEach((section, index) => {
      fullContent += `
        <div style="margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px; font-weight: 600;">${escapeHtml(section.type || '內容段落')}</h3>
          <div style="color: #4b5563; line-height: 1.8;">
            ${section.content ? section.content.map(content => `<p style="margin: 8px 0;">${escapeHtml(content)}</p>`).join('') : '<p>無內容</p>'}
          </div>
        </div>
      `;
    });
    fullContent += '</div>';
  } else {
    fullContent += `
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; white-space: pre-wrap; line-height: 1.8; color: #4b5563; margin-top: 16px;">
        ${escapeHtml(script.content || script.script_data || '無內容')}
      </div>
    `;
  }
  
  modalContent.innerHTML = fullContent;
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

// 刪除腳本
window.deleteScriptForUserDB = async function(scriptId) {
  if (!confirm('確定要刪除這個腳本嗎？此操作無法復原。')) {
    return;
  }
  
  try {
    // 先從本地儲存中移除（立即更新 UI）
    const localScripts = getLocalScripts();
    const updatedScripts = localScripts.filter(script => script.id != scriptId);
    localStorage.setItem('user_scripts', JSON.stringify(updatedScripts));
    
    // 立即更新顯示，避免閃爍
    const container = document.querySelector('#db-myScripts .section-content');
    if (container && updatedScripts.length > 0) {
      displayScriptsForUserDB(updatedScripts);
    } else if (container) {
      container.innerHTML = '<div class="loading-text">還沒有儲存的腳本，請先使用一鍵生成功能創建腳本</div>';
    }
    
    // 清除一鍵生成快取，確保數據一致性
    if (window.cachedOneClickScripts) {
      window.cachedOneClickScripts = window.cachedOneClickScripts.filter(s => String(s.id) !== String(scriptId));
    }
    
    // 同時更新一鍵生成分類的顯示（如果當前在該分類）
    const oneClickContent = document.getElementById('one-click-content');
    if (oneClickContent) {
      // 檢查當前是否在腳本標籤頁
      const activeTab = document.querySelector('.one-click-tab.active');
      if (activeTab && activeTab.textContent.includes('腳本')) {
        // 清除快取後重新載入
        window.cachedOneClickScripts = null;
        await loadOneClickGenerationForUserDB();
      }
    }
    
    // 嘗試從後端刪除（如果失敗也不影響本地刪除）
    try {
      const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
      // 確保 scriptId 是數字類型
      const numericScriptId = parseInt(scriptId, 10);
      if (isNaN(numericScriptId)) {
        throw new Error('無效的腳本 ID');
      }
      
      // 使用完整的 URL，避免被 api.js 攔截時使用錯誤的 BASE
      const deleteUrl = `${API_URL}/api/scripts/${numericScriptId}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`,
          'Content-Type': 'application/json'
        }
      });
    
      if (response.ok) {
        console.log('後端腳本刪除成功');
        // 清除快取後重新載入
        window.cachedOneClickScripts = null;
        // 重新載入以同步後端數據
        await loadMyScriptsForUserDB();
        // 如果在一鍵生成分類，也重新載入
        if (oneClickContent) {
          await loadOneClickGenerationForUserDB();
        }
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('腳本已刪除', 3000);
        }
      } else if (response.status === 404) {
        // 後端找不到腳本（可能已經刪除或不存在），但本地已刪除，視為成功
        console.log('後端腳本不存在（可能已刪除），本地已刪除');
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('腳本已刪除', 3000);
        }
        // 清除快取後重新載入
        window.cachedOneClickScripts = null;
        // 重新載入以同步後端數據
        await loadMyScriptsForUserDB();
        // 如果在一鍵生成分類，也重新載入
        if (oneClickContent) {
          await loadOneClickGenerationForUserDB();
        }
      } else {
        // 其他錯誤，但本地已刪除，記錄錯誤但不影響用戶體驗
        const errorData = await response.json().catch(() => ({}));
        console.warn('後端刪除失敗，但本地已刪除:', errorData);
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('腳本已從本地刪除', 3000);
        }
        // 清除快取後重新載入
        window.cachedOneClickScripts = null;
        // 重新載入以同步後端數據
        await loadMyScriptsForUserDB();
        // 如果在一鍵生成分類，也重新載入
        if (oneClickContent) {
          await loadOneClickGenerationForUserDB();
        }
      }
    } catch (apiError) {
      // API 調用失敗，但本地已刪除，記錄錯誤但不影響用戶體驗
      console.warn('後端刪除 API 調用失敗，但本地已刪除:', apiError);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('腳本已從本地刪除', 3000);
      }
      // 重新載入以同步後端數據
      await loadMyScriptsForUserDB();
      // 如果在一鍵生成分類，也重新載入
      if (oneClickContent) {
        await loadOneClickGenerationForUserDB();
      }
    }
  } catch (error) {
    console.error('Delete script error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('刪除失敗，請稍後再試', 3000);
    }
  }
}

// 記錄使用事件（下載、功能使用等）
async function recordUsageEvent(eventType, eventCategory, resourceId, resourceType, metadata = {}) {
  try {
    // 優先使用 ipPlanningToken，如果沒有則嘗試其他 token
    const token = ipPlanningToken || localStorage.getItem('ipPlanningToken') || localStorage.getItem('token');
    if (!token) {
      // 靜默失敗，不顯示警告（因為這不是關鍵功能）
      return;
    }
    
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    
    const response = await fetch(`${API_URL}/api/user/usage-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        event_type: eventType,
        event_category: eventCategory,
        resource_id: resourceId ? String(resourceId) : null,
        resource_type: resourceType,
        metadata: JSON.stringify({
          ...metadata,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href
        })
      })
    });
    
    if (!response.ok) {
      console.warn('記錄使用事件失敗:', await response.text());
    }
  } catch (error) {
    // 靜默失敗，不影響用戶體驗
    console.warn('記錄使用事件時出錯:', error);
  }
}

// 下載PDF
window.downloadScriptPDF = function(scriptId) {
  const scripts = getLocalScripts();
  let script = scripts.find(s => s.id == scriptId);
  
  if (!script) {
    const scriptItem = document.querySelector(`[data-script-id="${scriptId}"]`);
    if (scriptItem) {
      const scriptName = scriptItem.querySelector('.script-name')?.textContent || DEFAULT_SCRIPT_TITLE;
      const scriptDate = scriptItem.querySelector('.script-date')?.textContent || '';
      const scriptTable = scriptItem.querySelector('table');
      
      if (scriptTable) {
        const rows = Array.from(scriptTable.querySelectorAll('tbody tr'));
        const scriptData = {
          rows: rows.map(row => {
            const cells = row.querySelectorAll('td');
            return {
              time: cells[0]?.textContent || '-',
              section: cells[1]?.textContent || '-',
              shot_desc: cells[2]?.textContent || '-',
              dialogue: cells[3]?.textContent || '-',
              subtitle: cells[4]?.textContent || '-',
              sfx: cells[5]?.textContent || '-'
            };
          })
        };
        
        script = {
          id: scriptId,
          name: scriptName,
          created_at: scriptDate,
          script_data: scriptData
        };
      }
    }
  }
  
  if (!script) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('找不到腳本數據', 3000);
    }
    return;
  }
  
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(script.name || DEFAULT_SCRIPT_TITLE)}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          .no-print { display: none; }
        }
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1f2937; margin-bottom: 10px; }
        .meta { color: #6b7280; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
        tr:nth-child(even) { background: #f9fafb; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(script.name || DEFAULT_SCRIPT_TITLE)}</h1>
      ${script.created_at ? `<div class="meta">建立時間：${escapeHtml(script.created_at)}</div>` : ''}
  `;
  
  if (script.script_data && script.script_data.rows && script.script_data.rows.length > 0) {
    printContent += `
      <table>
        <thead>
          <tr>
            <th>時間</th>
            <th>段落</th>
            <th>鏡頭/畫面</th>
            <th>台詞 (演員口白)</th>
            <th>字幕文字 (可動畫)</th>
            <th>音效與轉場</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    script.script_data.rows.forEach(row => {
      let timeDisplay = '-';
      if (row.time && row.time !== 'undefined-undefineds' && row.time !== '-') {
        timeDisplay = escapeHtml(row.time);
      } else if (row.start_sec !== undefined && row.end_sec !== undefined) {
        timeDisplay = `${row.start_sec}-${row.end_sec}s`;
      } else if (row.time && typeof row.time === 'string' && row.time.includes('-') && row.time.includes('s')) {
        timeDisplay = escapeHtml(row.time);
      }
      printContent += `
        <tr>
          <td>${timeDisplay}</td>
          <td>${escapeHtml(row.section || '-')}</td>
          <td>${escapeHtml(row.shot_desc || '-')}</td>
          <td>${escapeHtml(row.dialogue || '-')}</td>
          <td>${escapeHtml(row.subtitle || '-')}</td>
          <td>${escapeHtml(row.sfx || '-')}</td>
        </tr>
      `;
    });
    
    printContent += `
        </tbody>
      </table>
    `;
  } else if (script.script_data && script.script_data.sections) {
    script.script_data.sections.forEach(section => {
      printContent += `
        <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 12px 0; color: #374151;">${escapeHtml(section.type || '內容段落')}</h3>
          <div style="color: #4b5563; line-height: 1.8;">
            ${section.content ? section.content.map(content => `<p style="margin: 8px 0;">${escapeHtml(content)}</p>`).join('') : '<p>無內容</p>'}
          </div>
        </div>
      `;
    });
  } else {
    printContent += `<div style="padding: 16px; background: #f8fafc; white-space: pre-wrap;">${escapeHtml(script.content || '無內容')}</div>`;
  }
  
  printContent += `
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // 記錄下載事件
      recordUsageEvent('download_pdf', 'script', scriptId, 'script', {
        script_name: script.name || DEFAULT_SCRIPT_TITLE,
        script_created_at: script.created_at
      });
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('PDF 準備就緒，請使用瀏覽器的列印功能儲存為 PDF', 3000);
      }
    }, 250);
  };
}

// 下載CSV
window.downloadScriptCSV = function(scriptId) {
  const scripts = getLocalScripts();
  let script = scripts.find(s => s.id == scriptId);
  
  if (!script) {
    const scriptItem = document.querySelector(`[data-script-id="${scriptId}"]`);
    if (scriptItem) {
      const scriptName = scriptItem.querySelector('.script-name')?.textContent || DEFAULT_SCRIPT_TITLE;
      const scriptDate = scriptItem.querySelector('.script-date')?.textContent || '';
      const scriptTable = scriptItem.querySelector('table');
      
      if (scriptTable) {
        const rows = Array.from(scriptTable.querySelectorAll('tbody tr'));
        const scriptData = {
          rows: rows.map(row => {
            const cells = row.querySelectorAll('td');
            return {
              time: cells[0]?.textContent || '-',
              section: cells[1]?.textContent || '-',
              shot_desc: cells[2]?.textContent || '-',
              dialogue: cells[3]?.textContent || '-',
              subtitle: cells[4]?.textContent || '-',
              sfx: cells[5]?.textContent || '-'
            };
          })
        };
        
        script = {
          id: scriptId,
          name: scriptName,
          created_at: scriptDate,
          script_data: scriptData
        };
      }
    }
  }
  
  if (!script) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('找不到腳本數據', 3000);
    }
    return;
  }
  
  let csvContent = '\uFEFF';
  csvContent += `腳本名稱,${escapeHtml(script.name || DEFAULT_SCRIPT_TITLE)}\n`;
  csvContent += `建立時間,${escapeHtml(script.created_at || '-')}\n`;
  csvContent += '\n';
  csvContent += '時間,段落,鏡頭/畫面,台詞 (演員口白),字幕文字 (可動畫),音效與轉場\n';
  
  const escapeCSV = (str) => {
    if (!str) return '-';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  
  if (script.script_data && script.script_data.rows && script.script_data.rows.length > 0) {
    script.script_data.rows.forEach(row => {
      let timeDisplay = '-';
      if (row.time && row.time !== 'undefined-undefineds' && row.time !== '-') {
        timeDisplay = row.time;
      } else if (row.start_sec !== undefined && row.end_sec !== undefined) {
        timeDisplay = `${row.start_sec}-${row.end_sec}s`;
      } else if (row.time && typeof row.time === 'string' && row.time.includes('-') && row.time.includes('s')) {
        timeDisplay = row.time;
      }
      csvContent += `${escapeCSV(timeDisplay)},${escapeCSV(row.section)},${escapeCSV(row.shot_desc)},${escapeCSV(row.dialogue)},${escapeCSV(row.subtitle)},${escapeCSV(row.sfx)}\n`;
    });
  } else if (script.script_data && script.script_data.sections) {
    script.script_data.sections.forEach(section => {
      if (section.content && section.content.length > 0) {
        section.content.forEach(content => {
          csvContent += `-,${escapeCSV(section.type || '內容段落')},-,${escapeCSV(content)},-,-\n`;
        });
      }
    });
  } else {
    csvContent += `-,全部內容,,-,${escapeCSV(script.content || '無內容')},-\n`;
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${script.name || '腳本'}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  // 記錄下載事件
  recordUsageEvent('download_csv', 'script', scriptId, 'script', {
    script_name: script.name || DEFAULT_SCRIPT_TITLE,
    script_created_at: script.created_at
  });
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast('CSV 檔案下載成功！', 2000);
  }
}

// ===== 個人資料管理函數 =====

// 載入個人資料
async function loadPersonalInfoForUserDB() {
  const content = document.querySelector('#db-personalInfo .section-content');
  if (!content) return;
  
  if (!ipPlanningUser) {
    content.innerHTML = '<div class="loading-text">請先登入以查看個人資料</div>';
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入以查看個人資料', 3000);
    }
    return;
  }
  
  // 如果用戶資料已經完整，直接渲染，不需要 loading 和延遲
  if (ipPlanningUser && (ipPlanningUser.name || ipPlanningUser.email) && ipPlanningUser.created_at) {
      await renderPersonalInfoContent();
    return;
  }
  
  // 只有在需要載入資料時才顯示 loading
  showLoadingAnimation(content, '載入個人資料中...');
  
  // 如果用戶資料不完整，先嘗試從 API 獲取
  if (ipPlanningToken && !ipPlanningUser.created_at) {
    try {
      await fetchUserInfo();
      // API 請求完成後再渲染
      await renderPersonalInfoContent();
    } catch (error) {
      console.warn('無法從伺服器獲取最新資訊，使用本地資料');
      // 即使 API 失敗，也嘗試用本地資料渲染
      if (ipPlanningUser && (ipPlanningUser.name || ipPlanningUser.email)) {
        await renderPersonalInfoContent();
      } else {
        content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
      }
    }
  } else if (ipPlanningUser && (ipPlanningUser.name || ipPlanningUser.email)) {
    // 有本地資料但沒有 created_at，直接渲染（不需要等待）
    await renderPersonalInfoContent();
  } else {
    content.innerHTML = '<div class="loading-text">暫無個人資料</div>';
  }
}

// 渲染個人資料內容
async function renderPersonalInfoContent() {
  const content = document.querySelector('#db-personalInfo .section-content');
  if (!content || !ipPlanningUser) return;
  
  let registrationTime = '未知';
  if (ipPlanningUser.created_at) {
    try {
      const date = new Date(ipPlanningUser.created_at);
      if (!isNaN(date.getTime())) {
        registrationTime = date.toLocaleString('zh-TW', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {
      registrationTime = ipPlanningUser.created_at;
    }
  }
  
  const isSubscribed = ipPlanningUser.is_subscribed !== false;
  const subscriptionStatus = isSubscribed ? 
    '<span style="color: #10b981; font-weight: bold;">✅ 已訂閱</span>' : 
    '<span style="color: #ef4444; font-weight: bold;">❌ 未訂閱</span>';
  
  let expiresAt = null;
  let daysLeft = null;
  let expiresAtText = '未知';
  let daysLeftText = '';
  let expirationWarning = '';
  let autoRenew = true; // 預設為 true
  
  if (ipPlanningToken && ipPlanningUser?.user_id) {
    try {
      const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
      const subResponse = await fetch(`${API_URL}/api/user/subscription`, {
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`
        }
      });
      
      if (subResponse.ok) {
        const subData = await subResponse.json();
        // 獲取自動續費狀態
        autoRenew = subData.auto_renew !== false; // 預設為 true
        
        if (subData.expires_at) {
          expiresAt = new Date(subData.expires_at);
          const now = new Date();
          daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
          
          expiresAtText = expiresAt.toLocaleString('zh-TW', {
            hour12: false,
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          if (daysLeft < 0) {
            daysLeftText = `<span style="color: #ef4444; font-weight: bold;">（已過期 ${Math.abs(daysLeft)} 天）</span>`;
            expirationWarning = '<div style="margin-top: 12px; padding: 12px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b;"><strong>⚠️ 訂閱已過期</strong><br>請前往訂閱頁面續費以繼續使用服務。</div>';
          } else if (daysLeft <= 3) {
            daysLeftText = `<span style="color: #ef4444; font-weight: bold;">（剩餘 ${daysLeft} 天）</span>`;
            expirationWarning = '<div style="margin-top: 12px; padding: 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; color: #92400e;"><strong>⚠️ 訂閱即將到期</strong><br>請盡快前往訂閱頁面續費。</div>';
          } else if (daysLeft <= 7) {
            daysLeftText = `<span style="color: #f59e0b; font-weight: bold;">（剩餘 ${daysLeft} 天）</span>`;
            expirationWarning = '<div style="margin-top: 12px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #92400e;"><strong>提醒</strong><br>您的訂閱將在 7 天內到期，請記得續費。</div>';
          } else {
            daysLeftText = `<span style="color: #10b981;">（剩餘 ${daysLeft} 天）</span>`;
          }
        }
      }
    } catch (e) {
      console.warn('載入訂閱詳情失敗:', e);
      // 如果 API 失敗，嘗試從 ipPlanningUser 獲取 auto_renew
      autoRenew = ipPlanningUser.auto_renew !== false;
    }
  } else {
    // 如果沒有 token，嘗試從 ipPlanningUser 獲取 auto_renew
    autoRenew = ipPlanningUser?.auto_renew !== false;
  }
  
  content.innerHTML = `
    <div class="profile-details">
      <div class="detail-item">
        <label>姓名：</label>
        <span>${escapeHtml(ipPlanningUser.name || '未設定')}</span>
      </div>
      <div class="detail-item">
        <label>Email：</label>
        <span>${escapeHtml(ipPlanningUser.email || '未設定')}</span>
      </div>
      <div class="detail-item">
        <label>用戶ID：</label>
        <span>${escapeHtml(ipPlanningUser.user_id || '未生成')}</span>
      </div>
      <div class="detail-item">
        <label>註冊時間：</label>
        <span>${escapeHtml(registrationTime)}</span>
      </div>
      <div class="detail-item">
        <label>訂閱狀態：</label>
        <span>${subscriptionStatus}</span>
      </div>
      ${isSubscribed ? `
      <div class="detail-item">
        <label>到期日期：</label>
        <span>${escapeHtml(expiresAtText)} ${daysLeftText}</span>
      </div>
      ${expirationWarning}
      ${autoRenew === false ? `
      <div style="margin-top: 12px; padding: 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; color: #92400e;">
        <strong>ℹ️ 自動續費已取消</strong><br>
        <span style="font-size: 14px;">您的訂閱到期後將不會自動續費，請記得手動續費以繼續使用服務。</span>
      </div>
      ` : ''}
      <div class="detail-actions" style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
        <a href="/subscription.html" style="display: inline-flex; align-items: center; justify-content: center; padding: 10px 16px; min-height: 44px; background: #3B82F6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
          <i class="fas fa-credit-card" style="margin-right: 4px;"></i>續費訂閱
        </a>
        ${autoRenew !== false ? `
        <button onclick="cancelAutoRenewForUserDB()" style="display: inline-flex; align-items: center; justify-content: center; padding: 10px 16px; min-height: 44px; background: #EF4444; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px;">
          <i class="fas fa-ban" style="margin-right: 4px;"></i>取消自動續費
        </button>
        ` : `
        <div style="display: inline-flex; align-items: center; justify-content: center; padding: 10px 16px; min-height: 44px; background: #F3F4F6; color: #6B7280; border-radius: 6px; font-weight: 500; font-size: 14px;">
          <i class="fas fa-check-circle" style="margin-right: 4px;"></i>已取消自動續費
        </div>
        `}
      </div>
      ` : `
      <div class="detail-actions">
        <a href="/subscription.html" style="display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
          ✨ 啟用訂閱
        </a>
      </div>
      `}
    </div>
  `;
}

// 獲取用戶資訊
async function fetchUserInfo() {
  if (!ipPlanningToken) return;
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    
    // 同時獲取用戶基本資訊和訂閱狀態
    const [userResponse, subscriptionResponse] = await Promise.all([
      fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`
        }
      }),
      fetch(`${API_URL}/api/user/subscription`, {
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`
        }
      }).catch(() => null) // 如果訂閱 API 失敗，不影響基本資訊
    ]);
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      
      // 如果訂閱 API 成功，合併 auto_renew 資訊
      if (subscriptionResponse && subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        userData.auto_renew = subscriptionData.auto_renew !== false; // 預設為 true
      } else {
        userData.auto_renew = true; // 預設值
      }
      
      ipPlanningUser = userData;
      localStorage.setItem('ipPlanningUser', JSON.stringify(userData));
      updateUserInfo();
    } else if (userResponse.status === 401) {
      if (window.Api && window.Api.refreshTokenIfNeeded) {
        await window.Api.refreshTokenIfNeeded();
        if (ipPlanningToken) {
          return fetchUserInfo();
        }
      }
    }
  } catch (error) {
    console.error('獲取用戶資訊失敗:', error);
  }
}

// 取消自動續費
async function cancelAutoRenewForUserDB() {
  if (!ipPlanningToken) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  if (!confirm('確定要取消自動續費嗎？\n\n取消後，訂閱到期時將不會自動續費，您需要手動續費以繼續使用服務。')) {
    return;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/subscription/auto-renew`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auto_renew: false
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // 更新本地用戶資訊
      if (ipPlanningUser) {
        ipPlanningUser.auto_renew = false;
        localStorage.setItem('ipPlanningUser', JSON.stringify(ipPlanningUser));
      }
      
      // 重新載入個人資料區塊以更新顯示
      if (typeof loadPersonalInfoForUserDB === 'function') {
        loadPersonalInfoForUserDB();
      }
      
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ 已成功取消自動續費', 3000);
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }));
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('❌ 取消自動續費失敗：' + (errorData.error || '請稍後再試'), 3000);
      }
    }
  } catch (error) {
    console.error('取消自動續費失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('❌ 取消自動續費失敗，請稍後再試', 3000);
    }
  }
}

// 更新用戶資訊顯示（使用 common.js 的統一函數，但保留部分自定義邏輯）
function updateUserInfo() {
  // 優先使用 common.js 的統一函數
  if (window.ReelMindCommon && window.ReelMindCommon.updateUserInfo) {
    window.ReelMindCommon.updateUserInfo();
    return;
  }
  
  // 降級處理：直接更新元素
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

// ===== 分區切換函數 =====

// 顯示資料庫分區
function showDbSection(sectionName) {
  document.querySelectorAll('.db-section').forEach(section => {
    section.classList.remove('active');
  });
  
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const targetSection = document.getElementById(`db-${sectionName}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  const targetMenuItem = document.querySelector(`[onclick="showDbSection('${sectionName}')"]`);
  if (targetMenuItem) {
    targetMenuItem.classList.add('active');
  }
  
  switch(sectionName) {
    case 'personalInfo':
      loadPersonalInfoForUserDB();
      break;
    case 'settings':
      loadSavedApiKey();
      break;
    case 'ipPlanning':
      loadIpPlanningResultsForUserDB();
      break;
    case 'oneClickGeneration':
      {
        const defaultType = window.currentOneClickType || 'profile';
        window.currentOneClickType = defaultType;
        setOneClickTabActive(defaultType);
        loadOneClickGenerationForUserDB();
      }
      break;
    case 'myOrders':
      loadMyOrdersForUserDB();
      break;
    case 'usageStats':
      loadUsageStatsForUserDB();
      break;
  }
}

// ===== 帳號定位管理函數 =====

// 載入帳號定位記錄
async function loadPositioningRecordsForUserDB() {
  const content = document.querySelector('#db-accountPositioning .section-content');
  
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (content) {
      content.innerHTML = '<div class="loading-text">請先登入以查看帳號定位記錄</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入以查看帳號定位記錄', 3000);
    }
    return;
  }
  
  if (content) {
    showLoadingAnimation(content, '載入帳號定位記錄中...');
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/positioning/${ipPlanningUser.user_id}`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const records = data.records || [];
      // 更新緩存
      cachedPositioningRecords = records;
      displayPositioningRecordsForUserDB(records);
    } else if (response.status === 401) {
      if (content) {
        content.innerHTML = '<div class="loading-text">請先登入</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入以查看帳號定位記錄', 3000);
      }
    } else if (response.status === 404) {
      if (content) {
        content.innerHTML = '<div class="loading-text">帳號定位功能即將上線，請稍後再試</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('帳號定位功能即將上線，請稍後再試', 3000);
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '載入失敗');
    }
  } catch (error) {
    console.error('Load positioning records error:', error);
    if (content) {
      content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
}

// 顯示帳號定位記錄
function displayPositioningRecordsForUserDB(records) {
  const container = document.querySelector('#db-accountPositioning .section-content');
  
  if (!container) return;
  
  if (records.length === 0) {
    container.innerHTML = '<div class="loading-text">尚無帳號定位記錄</div>';
    return;
  }
  
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
  
  container.innerHTML = sortedRecords.map((record, index) => {
    const recordNumber = String(index + 1).padStart(2, '0');
    const date = formatTaiwanTime(record.created_at);
    const preview = escapeHtml(record.content.substring(0, 100) + (record.content.length > 100 ? '...' : ''));
    
    return `
      <div class="positioning-record-item" data-record-id="${escapeHtml(String(record.id || ''))}">
        <div class="record-header">
          <span class="record-number">編號 ${recordNumber}</span>
          <span class="record-date">${date}</span>
        </div>
        <div class="record-preview">${preview}</div>
        <div class="record-actions">
          <button class="action-btn view-btn" onclick="viewPositioningDetailForUserDB('${String(record.id).replace(/'/g, "\\'")}', '${String(recordNumber).replace(/'/g, "\\'")}')" data-record-id="${escapeHtml(String(record.id || ''))}">
            <i class="fas fa-eye" style="font-size: 12px;"></i>
            查看完整結果
          </button>
          <button class="action-btn delete-btn" onclick="deletePositioningRecordForUserDB('${String(record.id).replace(/'/g, "\\'")}')" data-record-id="${escapeHtml(String(record.id || ''))}">
            <i class="fas fa-trash" style="font-size: 12px;"></i>
            刪除
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 緩存定位記錄數據（避免重複 API 請求）
let cachedPositioningRecords = null;

// 查看帳號定位詳細內容（優化版：優先使用緩存數據）
window.viewPositioningDetailForUserDB = async function(recordId, recordNumber) {
  try {
  if (!ipPlanningUser?.user_id) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  // 驗證和清理參數
  if (!recordId) {
    console.error('無效的 recordId:', recordId);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('無效的記錄 ID', 3000);
    }
    return;
  }
  
    // 先嘗試從緩存中獲取記錄
    let record = null;
    if (cachedPositioningRecords && cachedPositioningRecords.length > 0) {
      record = cachedPositioningRecords.find(r => {
        const rId = String(r.id || '');
        const searchId = String(recordId || '');
        return rId === searchId || r.id == recordId;
      });
    }
    
    // 如果緩存中沒有，才發送 API 請求
    if (!record) {
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/positioning/${ipPlanningUser.user_id}`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const records = data.records || [];
          // 更新緩存
          cachedPositioningRecords = records;
      
          // 查找記錄
          record = records.find(r => {
        const rId = String(r.id || '');
        const searchId = String(recordId || '');
            return rId === searchId || r.id == recordId;
          });
        } else {
          throw new Error('載入失敗');
        }
      } catch (error) {
        console.error('載入定位記錄失敗:', error);
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
        }
        return;
      }
    }
    
    // 如果找到記錄，立即顯示 modal（不需要等待）
      if (record) {
        // 創建彈出視窗（使用內聯樣式確保顯示）
        const modal = document.createElement('div');
        modal.className = 'positioning-detail-modal-overlay';
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100000 !important;
          padding: 20px;
          box-sizing: border-box;
        `;
        
        // 點擊背景關閉
        modal.onclick = function(e) {
          if (e.target === modal) {
            modal.remove();
          }
        };
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
          background: white;
          border-radius: 12px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
        `;
        
        modalContent.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 600;">帳號定位詳細內容 - 編號 ${recordNumber}</h3>
            <button class="positioning-modal-close-btn" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">×</button>
          </div>
          <div style="padding: 24px; overflow-y: auto; flex: 1;">
            <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280; font-size: 14px;">建立時間：</span>
              <span style="color: #1f2937; font-size: 14px; margin-left: 8px;">${formatTaiwanTime(record.created_at)}</span>
            </div>
            <div style="color: #374151; line-height: 1.8; font-size: 15px; white-space: pre-wrap;">${escapeHtml(record.content).replace(/\n/g, '<br>')}</div>
          </div>
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
            <button class="positioning-modal-close-btn" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">關閉</button>
          </div>
        `;
        
        // 阻止點擊內容區域關閉
        modalContent.onclick = function(e) {
          e.stopPropagation();
        };
        
        // 為關閉按鈕添加事件監聽器（避免 onclick 中的語法錯誤）
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // 使用事件委派處理關閉按鈕
        const closeButtons = modalContent.querySelectorAll('.positioning-modal-close-btn');
        closeButtons.forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            modal.remove();
          });
        });
      } else {
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('找不到該記錄', 3000);
        }
    }
  } catch (error) {
    console.error('View positioning detail error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
}

// 刪除帳號定位記錄
window.deletePositioningRecordForUserDB = async function(recordId) {
  if (!confirm('確定要刪除這筆帳號定位記錄嗎？')) return;
  
  const cleanRecordId = String(recordId).split(':')[0].trim();
  
  if (!cleanRecordId) {
    console.error('無效的記錄ID:', recordId);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('刪除失敗：無效的記錄ID', 3000);
    }
    return;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/positioning/${cleanRecordId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('記錄已刪除', 2000);
      }
      await loadPositioningRecordsForUserDB();
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `刪除失敗 (${response.status})`);
    }
  } catch (error) {
    console.error('Delete positioning record error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('刪除失敗，請稍後再試', 3000);
    }
  }
}

// ===== 選題管理函數 =====

// 解析選題內容為5個欄位
function parseTopicContent(content) {
  if (!content) {
    return {
      hotTopics: '',
      specificSuggestions: '',
      strategies: '',
      contentPlanning: '',
      timeline: ''
    };
  }
  
  const sections = {
    hotTopics: '',
    specificSuggestions: '',
    strategies: '',
    contentPlanning: '',
    timeline: ''
  };
  
  const patterns = {
    hotTopics: /(熱門選題方向|選題方向|熱門話題|熱門選題)[:：]?\s*([\s\S]*?)(?=(選題的具體建議|選題策略|內容規劃|執行時程|$))/i,
    specificSuggestions: /(選題的具體建議|具體建議|每個選題的具體建議|選題建議)[:：]?\s*([\s\S]*?)(?=(選題策略|內容規劃|執行時程|$))/i,
    strategies: /(選題策略和技巧|選題策略|策略和技巧|選題技巧)[:：]?\s*([\s\S]*?)(?=(內容規劃|執行時程|$))/i,
    contentPlanning: /(內容規劃建議|內容規劃|規劃建議)[:：]?\s*([\s\S]*?)(?=(執行時程|時程建議|$))/i,
    timeline: /(執行時程建議|時程建議|執行時程|時程)[:：]?\s*([\s\S]*?)$/i
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match && match[2]) {
      let extracted = match[2].trim();
      extracted = extracted.replace(/^(1|一)[\.、]?\s*(熱門選題方向|選題方向|熱門話題|熱門選題)[:：]?\s*/i, '');
      extracted = extracted.replace(/^(2|二)[\.、]?\s*(具體建議|選題的具體建議|選題建議)[:：]?\s*/i, '');
      extracted = extracted.replace(/^(3|三)[\.、]?\s*(策略|選題策略|技巧)[:：]?\s*/i, '');
      extracted = extracted.replace(/^(4|四)[\.、]?\s*(內容規劃)[:：]?\s*/i, '');
      extracted = extracted.replace(/^(5|五)[\.、]?\s*(時程|執行時程)[:：]?\s*/i, '');
      extracted = extracted.replace(/^\d+[\.、]\s*/, '');
      extracted = extracted.replace(/\n{3,}/g, '\n\n');
      extracted = extracted.trim();
      sections[key] = extracted;
    }
  }
  
  if (!sections.hotTopics && !sections.specificSuggestions) {
    const lines = content.split(/\n/);
    let currentSection = '';
    let currentKey = '';
    
    for (const line of lines) {
      if (/^(1|一)[\.、]?\s*(熱門選題|選題方向)/i.test(line)) {
        currentKey = 'hotTopics';
        currentSection = line.replace(/^(1|一)[\.、]?\s*(熱門選題|選題方向)[:：]?\s*/i, '').trim() + '\n';
      } else if (/^(2|二)[\.、]?\s*(具體建議|選題的具體)/i.test(line)) {
        currentKey = 'specificSuggestions';
        currentSection = line.replace(/^(2|二)[\.、]?\s*(具體建議|選題的具體)[:：]?\s*/i, '').trim() + '\n';
      } else if (/^(3|三)[\.、]?\s*(策略|技巧)/i.test(line)) {
        currentKey = 'strategies';
        currentSection = line.replace(/^(3|三)[\.、]?\s*(策略|技巧)[:：]?\s*/i, '').trim() + '\n';
      } else if (/^(4|四)[\.、]?\s*(內容規劃)/i.test(line)) {
        currentKey = 'contentPlanning';
        currentSection = line.replace(/^(4|四)[\.、]?\s*(內容規劃)[:：]?\s*/i, '').trim() + '\n';
      } else if (/^(5|五)[\.、]?\s*(時程|執行)/i.test(line)) {
        currentKey = 'timeline';
        currentSection = line.replace(/^(5|五)[\.、]?\s*(時程|執行)[:：]?\s*/i, '').trim() + '\n';
      } else if (currentKey && line.trim()) {
        currentSection += line + '\n';
      }
      
      if (currentKey && currentSection) {
        sections[currentKey] = currentSection.trim();
      }
    }
  }
  
  if (!sections.hotTopics && !sections.specificSuggestions && !sections.strategies && !sections.contentPlanning && !sections.timeline) {
    sections.hotTopics = content;
  }
  
  return sections;
}

// 載入選題內容
async function loadTopicHistoryForUserDB() {
  const content = document.querySelector('#db-topicRecords .section-content');
  
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (content) {
      content.innerHTML = '<div class="loading-text">請先登入以查看選題內容</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入以查看選題內容', 3000);
    }
    return;
  }
  
  if (content) {
    showLoadingAnimation(content, '載入選題內容中...');
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/generations/${ipPlanningUser.user_id}?limit=100`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const topicGenerations = (data.generations || []).filter(gen => {
        return gen.topic || 
               (gen.content && (
                 gen.content.includes('選題') || 
                 gen.content.includes('主題') ||
                 gen.content.includes('推薦') ||
                 gen.content.includes('熱門')
               ));
      });
      displayTopicRecordsForUserDB(topicGenerations);
    } else if (response.status === 401) {
      if (content) {
        content.innerHTML = '<div class="loading-text">請先登入</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入以查看選題內容', 3000);
      }
    } else {
      if (content) {
        content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
      }
    }
  } catch (error) {
    console.error('載入選題內容錯誤:', error);
    if (content) {
      content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
}

// 顯示選題記錄
function displayTopicRecordsForUserDB(generations) {
  const container = document.querySelector('#db-topicRecords .section-content');
  
  if (!container) return;
  
  if (generations.length === 0) {
    container.innerHTML = '<div class="loading-text">尚無選題內容</div>';
    return;
  }
  
  const sortedGenerations = [...generations].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
  
  const formatText = (text) => {
    if (!text) return '無內容';
    
    let cleaned = text;
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    cleaned = cleaned.replace(/`([^`]+)`/g, '<code>$1</code>');
    cleaned = cleaned.replace(/^#{1,6}\s*(.+)$/gm, '<strong>$1</strong>');
    cleaned = cleaned.replace(/^(\d+)[\.、]\s*(.+)$/gm, '<div style="margin: 6px 0; padding-left: 8px;">$1. $2</div>');
    cleaned = cleaned.replace(/^[-*•]\s*(.+)$/gm, '<div style="margin: 6px 0; padding-left: 8px;">• $1</div>');
    cleaned = cleaned.replace(/^[-=*]{3,}$/gm, '');
    cleaned = cleaned.replace(/^[●○■□]\s*/gm, '');
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/\n\n+/g, '</p><p style="margin: 8px 0;">');
    cleaned = cleaned.replace(/\n/g, '<br>');
    
    if (cleaned && !cleaned.startsWith('<')) {
      cleaned = '<p style="margin: 4px 0;">' + cleaned + '</p>';
    }
    
    return cleaned;
  };
  
  container.innerHTML = sortedGenerations.map((gen, index) => {
    const date = formatTaiwanTime(gen.created_at);
    const platform = escapeHtml(gen.platform || '');
    const topic = escapeHtml(gen.topic || '');
    const sections = parseTopicContent(gen.content);
    const itemTitleKey = `topic-item-title-${gen.id || gen.created_at || index}`;
    const savedItemTitle = localStorage.getItem(itemTitleKey);
    const itemTitle = escapeHtml(savedItemTitle || '在此輸入你的標題');
    
    // 轉義 gen.id 以防止 XSS
    const safeGenId = String(gen.id || gen.created_at || index).replace(/['"\\]/g, '');
    const escapedGenId = escapeHtml(safeGenId);
    
    return `
      <div class="topic-item" data-topic-id="${escapedGenId}" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div class="topic-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            <span class="topic-number" style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; width: 60px; min-width: 60px; max-width: 60px; text-align: center; white-space: nowrap; display: inline-block; box-sizing: border-box;">編號${String(index + 1).padStart(2, '0')}</span>
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
              <h4 class="topic-item-title" data-title-key="${escapeHtml(itemTitleKey).replace(/'/g, "\\'")}" style="margin: 0; color: #1f2937; font-size: 1rem; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" onclick="editTopicItemTitle(this, '${escapeHtml(itemTitleKey).replace(/'/g, "\\'")}')" title="點擊編輯標題">${itemTitle}</h4>
              <span class="topic-edit-icon" style="cursor: pointer; color: #6B7280; font-size: 0.8rem; opacity: 0.6; transition: opacity 0.2s;" onclick="editTopicItemTitle(this.previousElementSibling, '${escapeHtml(itemTitleKey).replace(/'/g, "\\'")}')" title="編輯標題" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">✏️</span>
            </div>
          </div>
          <span class="topic-date" style="color: #6b7280; font-size: 14px;">${date}</span>
        </div>
        ${platform || topic ? `
        <div class="topic-meta" style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          ${platform ? `<span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 4px; font-size: 12px;">平台：${platform}</span>` : ''}
          ${topic ? `<span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 4px; font-size: 12px;">主題：${topic}</span>` : ''}
        </div>
        ` : ''}
        <div class="topic-content-sections" style="display: flex; flex-direction: column; gap: 16px;">
          ${sections.hotTopics ? `
          <div class="topic-section" data-section-id="hotTopics-${escapeHtml(String(gen.id || index))}" style="background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px; overflow: hidden;">
            <div class="topic-section-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; cursor: pointer; user-select: none;" onclick="toggleTopicSection('hotTopics-${String(gen.id || index).replace(/'/g, "\\'")}')">
              <h5 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">🔥 熱門選題方向</h5>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="topic-section-toggle" style="font-size: 12px; color: #6b7280;">▼</span>
              </div>
            </div>
            <div class="topic-section-content" id="hotTopics-${escapeHtml(String(gen.id || index))}-content" style="padding: 0 12px 12px 12px; color: #374151; line-height: 1.6; font-size: 14px; display: block;">${formatText(sections.hotTopics)}</div>
          </div>
          ` : ''}
          ${sections.specificSuggestions ? `
          <div class="topic-section" data-section-id="specificSuggestions-${escapeHtml(String(gen.id || index))}" style="background: #f9fafb; border-left: 3px solid #10b981; border-radius: 4px; overflow: hidden;">
            <div class="topic-section-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; cursor: pointer; user-select: none;" onclick="toggleTopicSection('specificSuggestions-${String(gen.id || index).replace(/'/g, "\\'")}')">
              <h5 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">💡 選題的具體建議</h5>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="topic-section-toggle" style="font-size: 12px; color: #6b7280;">▼</span>
              </div>
            </div>
            <div class="topic-section-content" id="specificSuggestions-${escapeHtml(String(gen.id || index))}-content" style="padding: 0 12px 12px 12px; color: #374151; line-height: 1.6; font-size: 14px; display: block;">${formatText(sections.specificSuggestions)}</div>
          </div>
          ` : ''}
          ${sections.strategies ? `
          <div class="topic-section" data-section-id="strategies-${escapeHtml(String(gen.id || index))}" style="background: #f9fafb; border-left: 3px solid #f59e0b; border-radius: 4px; overflow: hidden;">
            <div class="topic-section-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; cursor: pointer; user-select: none;" onclick="toggleTopicSection('strategies-${String(gen.id || index).replace(/'/g, "\\'")}')">
              <h5 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">📋 選題策略和技巧</h5>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="topic-section-toggle" style="font-size: 12px; color: #6b7280;">▼</span>
              </div>
            </div>
            <div class="topic-section-content" id="strategies-${escapeHtml(String(gen.id || index))}-content" style="padding: 0 12px 12px 12px; color: #374151; line-height: 1.6; font-size: 14px; display: block;">${formatText(sections.strategies)}</div>
          </div>
          ` : ''}
          ${sections.contentPlanning ? `
          <div class="topic-section" data-section-id="contentPlanning-${escapeHtml(String(gen.id || index))}" style="background: #f9fafb; border-left: 3px solid #8b5cf6; border-radius: 4px; overflow: hidden;">
            <div class="topic-section-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; cursor: pointer; user-select: none;" onclick="toggleTopicSection('contentPlanning-${String(gen.id || index).replace(/'/g, "\\'")}')">
              <h5 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">📅 內容規劃建議</h5>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="topic-section-toggle" style="font-size: 12px; color: #6b7280;">▼</span>
              </div>
            </div>
            <div class="topic-section-content" id="contentPlanning-${escapeHtml(String(gen.id || index))}-content" style="padding: 0 12px 12px 12px; color: #374151; line-height: 1.6; font-size: 14px; display: block;">${formatText(sections.contentPlanning)}</div>
          </div>
          ` : ''}
          ${sections.timeline ? `
          <div class="topic-section" data-section-id="timeline-${escapeHtml(String(gen.id || index))}" style="background: #f9fafb; border-left: 3px solid #ef4444; border-radius: 4px; overflow: hidden;">
            <div class="topic-section-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; cursor: pointer; user-select: none;" onclick="toggleTopicSection('timeline-${String(gen.id || index).replace(/'/g, "\\'")}')">
              <h5 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">⏰ 執行時程建議</h5>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="topic-section-toggle" style="font-size: 12px; color: #6b7280;">▼</span>
              </div>
            </div>
            <div class="topic-section-content" id="timeline-${gen.id || index}-content" style="padding: 0 12px 12px 12px; color: #374151; line-height: 1.6; font-size: 14px; display: block;">${formatText(sections.timeline)}</div>
          </div>
          ` : ''}
          ${!sections.hotTopics && !sections.specificSuggestions && !sections.strategies && !sections.contentPlanning && !sections.timeline ? `
          <div class="topic-section" data-section-id="default-${escapedGenId}" style="background: #f9fafb; border-left: 3px solid #6b7280; border-radius: 4px; overflow: hidden;">
            <div class="topic-section-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; cursor: pointer; user-select: none;" onclick="toggleTopicSection('default-${safeGenId.replace(/'/g, "\\'")}')">
              <h5 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;"><i class="fas fa-file-alt" style="margin-right: 6px;"></i>內容</h5>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="topic-section-toggle" style="font-size: 12px; color: #6b7280;">▼</span>
              </div>
            </div>
            <div class="topic-section-content" id="default-${escapedGenId}-content" style="padding: 0 12px 12px 12px; color: #374151; line-height: 1.6; font-size: 14px; display: block;">${formatText(gen.content)}</div>
          </div>
          ` : ''}
        </div>
        <div class="topic-item-actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <button class="action-btn delete-btn" onclick="deleteTopicRecordForUserDB('${safeGenId.replace(/'/g, "\\'")}', '${itemTitle.replace(/'/g, "\\'")}')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'"><i class="fas fa-trash-alt"></i> 刪除</button>
        </div>
      </div>
    `;
  }).join('');
}

// 編輯選題項目標題
window.editTopicItemTitle = function(titleElement, titleKey) {
  if (!titleElement || !titleKey) return;
  
  const currentTitle = titleElement.textContent.trim();
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.style.cssText = 'padding: 4px 8px; border: 2px solid #3B82F6; border-radius: 4px; font-size: 1rem; font-weight: 600; outline: none; width: 100%; max-width: 300px;';
  
  const saveTitle = () => {
    const newTitle = input.value.trim() || '在此輸入你的標題';
    titleElement.textContent = newTitle;
    localStorage.setItem(titleKey, newTitle);
    input.replaceWith(titleElement);
    if (input.value.trim()) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ 標題已更新', 2000);
      }
    }
  };
  
  input.addEventListener('blur', saveTitle);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveTitle();
    }
  });
  
  titleElement.replaceWith(input);
  input.focus();
  input.select();
}

// 切換選題欄位的展開/收起狀態
window.toggleTopicSection = function(sectionId) {
  const contentElement = document.getElementById(`${sectionId}-content`);
  const toggleElement = document.querySelector(`[data-section-id="${sectionId}"] .topic-section-toggle`);
  
  if (!contentElement || !toggleElement) return;
  
  const isExpanded = contentElement.style.display !== 'none';
  
  if (isExpanded) {
    contentElement.style.display = 'none';
    toggleElement.textContent = '▶';
  } else {
    contentElement.style.display = 'block';
    toggleElement.textContent = '▼';
  }
}

// 刪除選題記錄
window.deleteTopicRecordForUserDB = async function(genId, itemTitle) {
  const confirmMessage = `確定要刪除「${itemTitle}」這個選題記錄嗎？此操作無法復原。`;
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // 查找要刪除的項目
  const topicItem = document.querySelector(`[data-topic-id="${genId}"]`) || 
                   document.querySelector(`.topic-item:has([onclick*="${genId}"])`);
  
  // 檢查 genId 是否為有效的整數
  // 後端 API 期望 gen_id 為整數，如果不是整數，則僅從前端移除
  const cleanGenId = String(genId).trim();
  const isNumericId = /^\d+$/.test(cleanGenId);
  const numericGenId = isNumericId ? parseInt(cleanGenId, 10) : null;
  
  // 如果不是有效的數字 ID，僅從前端移除
  if (!isNumericId || !numericGenId) {
    if (topicItem) {
      topicItem.remove();
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('選題記錄已從列表中移除', 3000);
      }
    }
    return;
  }
  
  // 先從前端移除，提供即時反饋
  let itemRemoved = false;
  if (topicItem) {
    topicItem.remove();
    itemRemoved = true;
  }
  
  try {
    if (ipPlanningToken && ipPlanningUser && ipPlanningUser.user_id) {
      const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
      const response = await fetch(`${API_URL}/api/generations/${numericGenId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast(data.message || '選題記錄已刪除', 3000);
        }
        // 如果前端還沒移除，重新載入列表
        if (!itemRemoved) {
          await loadTopicHistoryForUserDB();
        }
        // 檢查是否在一鍵生成分類，如果是則重新載入
        const oneClickContent = document.getElementById('one-click-content');
        if (oneClickContent && oneClickContent.style.display !== 'none') {
          const activeTab = document.querySelector('.one-click-tab.active');
          if (activeTab && (activeTab.textContent.includes('選題方向') || activeTab.textContent.includes('帳號定位'))) {
            await loadOneClickGenerationForUserDB();
          }
        }
        return;
      } else {
        // 處理錯誤響應
        const errorData = await response.json().catch(() => ({ error: '刪除失敗' }));
        if (response.status === 404) {
          // 記錄不存在，已經從前端移除了，顯示成功訊息
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('選題記錄已從列表中移除', 3000);
          }
        } else if (response.status === 422) {
          // 422 Unprocessable Content - 通常是 ID 格式問題或驗證失敗
          // 已經從前端移除了，顯示成功訊息（從用戶角度，項目已經被移除）
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('選題記錄已從列表中移除', 3000);
          }
        } else if (response.status === 403) {
          // 如果沒有權限，恢復顯示
          if (itemRemoved) {
            await loadTopicHistoryForUserDB();
          }
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('無權限刪除此選題記錄', 3000);
          }
        } else {
          // 其他錯誤，恢復顯示
          if (itemRemoved) {
            await loadTopicHistoryForUserDB();
          }
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast(errorData.error || '刪除失敗，請稍後再試', 3000);
          }
        }
        return;
      }
    } else {
      // 如果沒有 token，已經從前端移除了，顯示成功訊息
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('選題記錄已從列表中移除', 3000);
      }
      return;
    }
  } catch (error) {
    console.error('Delete topic record error:', error);
    // 錯誤時，如果前端已經移除，就保持移除狀態（從用戶角度，項目已經被移除）
    // 如果還沒移除，則重新載入列表
    if (!itemRemoved) {
      await loadTopicHistoryForUserDB();
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('選題記錄已從列表中移除', 3000);
    }
  }
}

// ===== IP规划管理函數 =====

// 載入 IP 人設規劃結果
async function loadIpPlanningResultsForUserDB() {
  const content = document.getElementById('ip-planning-content');
  
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (content) {
      content.innerHTML = '<div class="loading-text">請先登入以查看 IP 人設規劃結果</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入以查看 IP 人設規劃結果', 3000);
    }
    return;
  }
  
  // 先檢查是否有快取數據，如果有就先顯示（提升響應速度）
  if (window.currentIpPlanningResults && window.currentIpPlanningResults.length > 0) {
    if (content) {
      displayIpPlanningResultsForUserDB(window.currentIpPlanningResults);
    }
  } else if (content) {
    showLoadingAnimation(content, '載入 IP 人設規劃結果中...');
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/ip-planning/my`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results) {
        // 只顯示 mode1 的結果（過濾掉 source='mode3' 的結果）
        // 並且只顯示有 saved_to_userdb 標記的記錄（從 userDB 儲存的）
        const mode1Results = data.results.filter(r => {
          try {
            const metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {});
            // 只顯示：1. source 不是 'mode3'，2. 有 saved_to_userdb 標記（表示是從 userDB 儲存的）
            return metadata.source !== 'mode3' && metadata.saved_to_userdb === true;
          } catch (e) {
            // 如果 metadata 解析失敗，預設不顯示（因為無法確認是否應該顯示）
            return false;
          }
        });
        // 更新快取數據，供下次使用
        window.currentIpPlanningResults = mode1Results;
        displayIpPlanningResultsForUserDB(mode1Results);
      } else {
        if (content) {
          content.innerHTML = '<div class="loading-text">尚無 IP 人設規劃結果</div>';
        }
      }
    } else if (response.status === 401) {
      if (content) {
        content.innerHTML = '<div class="loading-text">請先登入</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入以查看 IP 人設規劃結果', 3000);
      }
    } else {
      if (content) {
        content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
      }
    }
  } catch (error) {
    console.error('載入 IP 人設規劃結果錯誤:', error);
    if (content) {
      content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
}

// 顯示 IP 人設規劃結果
function displayIpPlanningResultsForUserDB(results) {
  const content = document.getElementById('ip-planning-content');
  
  if (!content) return;
  
  if (results.length === 0) {
    content.innerHTML = '<div class="loading-text">尚無 IP 人設規劃結果</div>';
    return;
  }
  
  const sortedResults = [...results].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
  
  const groupedResults = {
    profile: sortedResults.filter(r => r.result_type === 'profile'),
    plan: sortedResults.filter(r => r.result_type === 'plan'),
    scripts: sortedResults.filter(r => r.result_type === 'scripts')
  };
  
  const activeTab = document.querySelector('.ip-planning-tab.active');
  let currentType = 'profile';
  if (activeTab) {
    if (activeTab.textContent.includes('帳號定位')) {
      currentType = 'profile';
    } else if (activeTab.textContent.includes('選題方向')) {
      currentType = 'plan';
    } else if (activeTab.textContent.includes('一週腳本')) {
      currentType = 'scripts';
    }
    // 保留舊的匹配邏輯作為備用
    else if (activeTab.textContent.includes('Profile')) {
      currentType = 'profile';
    } else if (activeTab.textContent.includes('規劃')) {
      currentType = 'plan';
    } else if (activeTab.textContent.includes('腳本')) {
      currentType = 'scripts';
    }
  }
  
  const currentResults = groupedResults[currentType] || [];
  
  if (currentResults.length === 0) {
    const typeText = currentType === 'profile' ? '帳號定位' : currentType === 'plan' ? '選題方向（影片類型配比）' : '一週腳本';
    content.innerHTML = `<div class="loading-text">尚無${escapeHtml(typeText)}記錄</div>`;
    return;
  }
  
  content.innerHTML = currentResults.map((result, index) => {
    const date = formatTaiwanTime(result.created_at);
    let savedTitle = '';
    if (ipPlanningUser && ipPlanningUser.user_id) {
      savedTitle = localStorage.getItem(`ip-planning-item-title-${ipPlanningUser.user_id}-${result.id}`);
    }
    const defaultTitle = currentType === 'profile' ? '帳號定位' : currentType === 'plan' ? '選題方向（影片類型配比）' : '一週腳本';
    // 如果沒有儲存的標題且 result.title 為空或預設值，使用預設標題
    const finalTitle = savedTitle || (result.title && result.title !== '請在此編輯你的標題' ? result.title : defaultTitle);
    const title = escapeHtml(finalTitle);
    
    // 轉義 result.id 以防止 XSS
    const safeResultId = String(result.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const displayResultId = safeResultId || String(result.id || '');
    
    // 處理 result.content：統一使用與 mode1.js 相同的 Markdown 渲染函數
    // 由於儲存時已經是 HTML 格式，直接使用 DOMPurify 清理即可
    let safeContent = '';
    if (result.content) {
      const contentStr = String(result.content);
      
      // 優先使用與 mode1.js 相同的渲染邏輯
      // 如果內容已經是 HTML（包含標籤），直接使用 DOMPurify 清理
      if (/<[^>]+>/.test(contentStr)) {
        // 內容已經是 HTML，使用 DOMPurify 清理（與 mode1.js 的 renderMode3Markdown 保持一致）
        if (typeof DOMPurify !== 'undefined') {
          safeContent = DOMPurify.sanitize(contentStr, {
            ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td'],  // 允許表格標籤
            ADD_ATTR: ['colspan', 'rowspan']  // 允許表格屬性
          });
        } else {
          // 如果 DOMPurify 不可用，使用基本清理
          const parser = new DOMParser();
          const doc = parser.parseFromString(contentStr, 'text/html');
          const body = doc.body;
          
          // 只允許安全的 HTML 標籤（包含表格標籤以支援 Markdown 表格）
          const allowedTags = ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'span', 'div', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td'];
          const allowedAttributes = ['style', 'class', 'colspan', 'rowspan'];
          
          // 清理所有不允許的標籤和屬性
          const cleanNode = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName.toLowerCase();
              if (!allowedTags.includes(tagName)) {
                // 替換為文本節點
                const textNode = document.createTextNode(node.textContent);
                node.parentNode?.replaceChild(textNode, node);
                return;
              }
              
              // 清理屬性
              const attrs = Array.from(node.attributes);
              attrs.forEach(attr => {
                if (!allowedAttributes.includes(attr.name.toLowerCase())) {
                  node.removeAttribute(attr.name);
                }
              });
              
              // 遞歸處理子節點
              Array.from(node.childNodes).forEach(child => cleanNode(child));
            }
          };
          
          Array.from(body.childNodes).forEach(child => cleanNode(child));
          safeContent = body.innerHTML;
        }
      } else {
        // 純文本，使用統一的 Markdown 渲染函數（與 mode1.js 保持一致）
        if (window.safeRenderMarkdown) {
          safeContent = window.safeRenderMarkdown(contentStr);
        } else if (typeof marked !== 'undefined') {
          // 確保 marked 支援表格和換行
          if (typeof marked.setOptions === 'function') {
            marked.setOptions({ 
              gfm: true,  // GitHub Flavored Markdown（支援表格）
              breaks: true,  // 支援換行
              headerIds: false,
              mangle: false
            });
          }
          const html = marked.parse(contentStr);
          // 使用 DOMPurify 清理（如果可用）
          if (typeof DOMPurify !== 'undefined') {
            safeContent = DOMPurify.sanitize(html, {
              USE_PROFILES: { html: true },
              FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
              ADD_TAGS: ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'a', 'img'],
              ADD_ATTR: ['target', 'colspan', 'rowspan', 'class', 'href', 'src', 'alt', 'title'],
              KEEP_CONTENT: true
            });
          } else {
            safeContent = html;
          }
        } else {
          // 最後使用轉義的純文字模式
          safeContent = escapeHtml(contentStr).replace(/\n/g, '<br>');
        }
      }
    }
    
    return `
      <div class="ip-planning-item" data-result-id="${displayResultId}" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: hidden; box-sizing: border-box;">
        <!-- 手機版：標題在上方 -->
        <div class="ip-planning-header-mobile" style="display: none; flex-direction: column; gap: 8px; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
          <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <h4 class="ip-planning-item-title" data-result-id="${displayResultId}" style="margin: 0; color: #1F2937; font-size: 1.1rem; cursor: pointer; flex: 1; padding-right: 24px; word-break: break-word; overflow-wrap: break-word;" onclick="editIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}', event)" title="點擊編輯標題">${title}</h4>
            <span class="ip-planning-item-edit-icon" data-result-id="${displayResultId}" style="cursor: pointer; color: #6B7280; font-size: 0.9rem; opacity: 0.6; transition: opacity 0.2s; display: none; flex-shrink: 0;" onclick="editIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}', event)" title="編輯標題" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'"><i class="fas fa-edit"></i></span>
          </div>
          <input type="text" class="ip-planning-item-title-input" data-result-id="${displayResultId}" style="display: none; width: 100%; padding: 6px 12px; border: 2px solid #3B82F6; border-radius: 6px; font-size: 1.1rem; font-weight: 600; outline: none; box-sizing: border-box;" onblur="saveIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}')" onkeypress="if(event.key === 'Enter') saveIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}')">
          <span style="color: #6B7280; font-size: 0.9rem;">${date}</span>
        </div>
        
        <!-- 桌面版：標題和日期在同一行 -->
        <div class="ip-planning-header-desktop" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            <h4 class="ip-planning-item-title" data-result-id="${displayResultId}" style="margin: 0; color: #1F2937; font-size: 1.1rem; cursor: pointer; position: relative; padding-right: 24px; word-break: break-word; overflow-wrap: break-word;" onclick="editIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}', event)" title="點擊編輯標題">${title}</h4>
            <span class="ip-planning-item-edit-icon" data-result-id="${displayResultId}" style="cursor: pointer; color: #6B7280; font-size: 0.9rem; opacity: 0.6; transition: opacity 0.2s; display: none;" onclick="editIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}', event)" title="編輯標題" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'"><i class="fas fa-edit"></i></span>
            <input type="text" class="ip-planning-item-title-input" data-result-id="${displayResultId}" style="display: none; flex: 1; padding: 6px 12px; border: 2px solid #3B82F6; border-radius: 6px; font-size: 1.1rem; font-weight: 600; outline: none; max-width: 300px; box-sizing: border-box;" onblur="saveIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}')" onkeypress="if(event.key === 'Enter') saveIpPlanningItemTitle('${safeResultId.replace(/'/g, "\\'")}')">
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="color: #6B7280; font-size: 0.9rem;">${date}</span>
          </div>
        </div>
        
        <div class="ip-planning-content-item" style="color: #374151; line-height: 1.6; max-height: 300px; overflow-y: auto; overflow-x: hidden; margin-bottom: 12px; word-wrap: break-word; overflow-wrap: break-word;">
          ${safeContent}
        </div>
        
        <!-- 手機版：按鈕在下方，使用 flex-wrap -->
        <div class="ip-planning-actions-mobile" style="display: none; flex-wrap: wrap; gap: 8px; width: 100%; box-sizing: border-box;">
          <button class="action-btn view-btn" onclick="viewIpPlanningDetailForUserDB('${safeResultId.replace(/'/g, "\\'")}')" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; flex: 1; min-width: calc(50% - 4px); display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; white-space: nowrap; -webkit-tap-highlight-color: transparent; touch-action: manipulation;" title="查看完整結果"><i class="fas fa-eye"></i> 查看完整</button>
          <button class="action-btn pdf-btn" onclick="downloadIpPlanningPDF('${safeResultId.replace(/'/g, "\\'")}')" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; flex: 1; min-width: calc(50% - 4px); display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; white-space: nowrap; -webkit-tap-highlight-color: transparent; touch-action: manipulation;" title="匯出PDF"><i class="fas fa-file-pdf"></i> PDF</button>
          <button class="action-btn delete-btn" onclick="deleteIpPlanningResultForUserDB('${safeResultId.replace(/'/g, "\\'")}')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; white-space: nowrap; -webkit-tap-highlight-color: transparent; touch-action: manipulation;" title="刪除此項目"><i class="fas fa-trash-alt"></i> 刪除</button>
        </div>
        
        <!-- 桌面版：按鈕在右側 -->
        <div class="ip-planning-actions-desktop" style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">
          <button class="action-btn view-btn" onclick="viewIpPlanningDetailForUserDB('${safeResultId.replace(/'/g, "\\'")}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" title="查看完整結果"><i class="fas fa-eye"></i> 查看完整</button>
          <button class="action-btn pdf-btn" onclick="downloadIpPlanningPDF('${safeResultId.replace(/'/g, "\\'")}')" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'" title="匯出PDF"><i class="fas fa-file-pdf"></i> PDF</button>
          <button class="action-btn delete-btn" onclick="deleteIpPlanningResultForUserDB('${safeResultId.replace(/'/g, "\\'")}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'" title="刪除此項目"><i class="fas fa-trash-alt"></i> 刪除</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 為每個項目添加 hover 效果顯示編輯圖標
  document.querySelectorAll('.ip-planning-item').forEach(item => {
    const titleEl = item.querySelector('.ip-planning-item-title');
    const editIcon = item.querySelector('.ip-planning-item-edit-icon');
    if (titleEl && editIcon) {
      item.addEventListener('mouseenter', () => {
        editIcon.style.display = 'inline-block';
      });
      item.addEventListener('mouseleave', () => {
        const inputEl = item.querySelector('.ip-planning-item-title-input');
        if (!inputEl || inputEl.style.display === 'none') {
          editIcon.style.display = 'none';
        }
      });
    }
  });
}

// 切換 IP 人設規劃類型（更新版本，包含樣式設置）
function showIpPlanningType(type) {
  document.querySelectorAll('.ip-planning-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.style.borderBottom = 'none';
    tab.style.color = '#6B7280';
    tab.style.fontWeight = 'normal';
  });
  
  const tabs = document.querySelectorAll('.ip-planning-tab');
  let targetTab = null;
  if (type === 'profile') {
    targetTab = Array.from(tabs).find(tab => tab.textContent.includes('帳號定位'));
    // 備用匹配
    if (!targetTab) {
      targetTab = Array.from(tabs).find(tab => tab.textContent.includes('Profile'));
    }
  } else if (type === 'plan') {
    targetTab = Array.from(tabs).find(tab => tab.textContent.includes('選題方向'));
    // 備用匹配
    if (!targetTab) {
      targetTab = Array.from(tabs).find(tab => tab.textContent.includes('規劃'));
    }
  } else if (type === 'scripts') {
    targetTab = Array.from(tabs).find(tab => tab.textContent.includes('一週腳本'));
    // 備用匹配
    if (!targetTab) {
      targetTab = Array.from(tabs).find(tab => tab.textContent.includes('腳本'));
    }
  }
  
  if (targetTab) {
    targetTab.classList.add('active');
    targetTab.style.borderBottom = '2px solid #3B82F6';
    targetTab.style.color = '#3B82F6';
    targetTab.style.fontWeight = '600';
  }
  
  if (window.currentIpPlanningResults) {
    displayIpPlanningResultsForUserDB(window.currentIpPlanningResults);
  } else {
    loadIpPlanningResultsForUserDB();
  }
}

// 匯出 IP 人設規劃結果
function exportIpPlanningResults() {
  if (!window.currentIpPlanningResults || window.currentIpPlanningResults.length === 0) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('沒有可匯出的內容', 3000);
    }
    return;
  }
  
  try {
    const activeTab = document.querySelector('.ip-planning-tab.active');
    let currentType = 'all';
    if (activeTab) {
      if (activeTab.textContent.includes('Profile')) {
        currentType = 'profile';
      } else if (activeTab.textContent.includes('規劃')) {
        currentType = 'plan';
      } else if (activeTab.textContent.includes('腳本')) {
        currentType = 'scripts';
      }
    }
    
    const filteredResults = currentType === 'all' 
      ? window.currentIpPlanningResults 
      : window.currentIpPlanningResults.filter(r => r.result_type === currentType);
    
    if (filteredResults.length === 0) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('當前類型沒有可匯出的內容', 3000);
      }
      return;
    }
    
    let csvContent = '類型,標題,內容,創建時間\n';
    filteredResults.forEach(result => {
      const typeName = result.result_type === 'profile' ? '帳號定位' : 
                     result.result_type === 'plan' ? '選題方向（影片類型配比）' : '一週腳本';
      const textContent = (result.content || '').replace(/<[^>]*>/g, '').replace(/"/g, '""').replace(/\n/g, ' ');
      const title = (result.title || typeName).replace(/"/g, '""');
      const date = result.created_at ? formatTaiwanTime(result.created_at) : '';
      csvContent += `"${typeName}","${title}","${textContent}","${date}"\n`;
    });
    
    const csvBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `ip-planning-${currentType}-${Date.now()}.csv`;
    csvLink.click();
    URL.revokeObjectURL(csvUrl);
    
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('✅ 結果已匯出為 CSV 檔案', 3000);
    }
  } catch (error) {
    console.error('匯出失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('❌ 匯出失敗，請稍後再試', 3000);
    }
  }
}

// 刪除 IP 人設規劃結果
window.deleteIpPlanningResultForUserDB = async function(resultId) {
  // 驗證和清理 resultId 參數以防止 XSS
  if (!resultId || (typeof resultId !== 'string' && typeof resultId !== 'number')) {
    console.error('無效的 resultId:', resultId);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('刪除失敗：無效的記錄ID', 3000);
    }
    return;
  }
  const safeResultId = String(resultId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeResultId) {
    console.error('清理後的 resultId 為空:', resultId);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('刪除失敗：無效的記錄ID', 3000);
    }
    return;
  }
  
  const confirmMessage = '確定要刪除此 IP 人設規劃結果嗎？此操作無法復原。';
  if (!confirm(confirmMessage)) return;
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/ip-planning/results/${safeResultId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // 從本地結果中移除
      if (window.currentIpPlanningResults) {
        window.currentIpPlanningResults = window.currentIpPlanningResults.filter(r => String(r.id) !== String(safeResultId));
      }
      
      // 清除一鍵生成快取，確保數據一致性
      if (window.cachedOneClickResults) {
        window.cachedOneClickResults = window.cachedOneClickResults.filter(r => String(r.id) !== String(safeResultId));
      }
      
      // 重新顯示結果
      if (window.currentIpPlanningResults) {
        displayIpPlanningResultsForUserDB(window.currentIpPlanningResults);
      } else {
        loadIpPlanningResultsForUserDB();
      }
      
      // 檢查是否在一鍵生成分類，如果是則重新載入
      const oneClickContent = document.getElementById('one-click-content');
      if (oneClickContent && oneClickContent.style.display !== 'none') {
        const activeTab = document.querySelector('.one-click-tab.active');
        if (activeTab && (activeTab.textContent.includes('選題方向') || activeTab.textContent.includes('帳號定位'))) {
          // 清除快取後重新載入
          window.cachedOneClickResults = null;
          window.cachedOneClickScripts = null;
          await loadOneClickGenerationForUserDB();
        }
      }
      
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(data.message || '✅ 記錄已刪除', 3000);
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '刪除失敗' }));
      throw new Error(errorData.error || `刪除失敗 (${response.status})`);
    }
  } catch (error) {
    console.error('Delete IP planning result error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('❌ 刪除失敗：' + (error.message || '請稍後再試'), 3000);
    }
  }
};

// 編輯 IP 人設規劃項目標題
window.editIpPlanningItemTitle = function(resultId, event) {
  if (event) event.stopPropagation();
  
  // 驗證和清理 resultId 參數以防止 XSS
  if (!resultId || (typeof resultId !== 'string' && typeof resultId !== 'number')) {
    console.error('無效的 resultId:', resultId);
    return;
  }
  const safeResultId = String(resultId).replace(/[^a-zA-Z0-9_-]/g, '');
  const originalResultId = String(resultId);
  
  // 先嘗試使用 safeResultId 查找（如果 safeResultId 不為空）
  let titleElement = null;
  let inputElement = null;
  let editIcon = null;
  
  if (safeResultId) {
    titleElement = document.querySelector(`.ip-planning-item-title[data-result-id="${safeResultId}"]`);
    inputElement = document.querySelector(`.ip-planning-item-title-input[data-result-id="${safeResultId}"]`);
    editIcon = document.querySelector(`.ip-planning-item-edit-icon[data-result-id="${safeResultId}"]`);
  }
  
  // 如果找不到，嘗試使用原始 ID（因為 displayResultId 可能是原始 ID）
  if (!titleElement || !inputElement) {
    titleElement = document.querySelector(`.ip-planning-item-title[data-result-id="${originalResultId}"]`);
    inputElement = document.querySelector(`.ip-planning-item-title-input[data-result-id="${originalResultId}"]`);
    editIcon = document.querySelector(`.ip-planning-item-edit-icon[data-result-id="${originalResultId}"]`);
  }
  
  // 如果還是找不到，嘗試使用 escapeHtml 轉義後的 ID
  if (!titleElement || !inputElement) {
    const escapedResultId = escapeHtml(originalResultId);
    titleElement = document.querySelector(`.ip-planning-item-title[data-result-id="${escapedResultId}"]`);
    inputElement = document.querySelector(`.ip-planning-item-title-input[data-result-id="${escapedResultId}"]`);
    editIcon = document.querySelector(`.ip-planning-item-edit-icon[data-result-id="${escapedResultId}"]`);
  }
  
  if (titleElement && inputElement) {
    const currentTitle = titleElement.textContent.trim();
    inputElement.value = currentTitle;
    titleElement.style.display = 'none';
    if (editIcon) editIcon.style.display = 'none';
    inputElement.style.display = 'block';
    inputElement.focus();
    inputElement.select();
  } else {
    console.error('找不到標題元素或輸入框:', { resultId, safeResultId, originalResultId });
  }
}

// 保存 IP 人設規劃項目標題
window.saveIpPlanningItemTitle = async function(resultId) {
  if (!resultId) {
    console.error('無效的 resultId:', resultId);
    return;
  }
  
  const safeResultId = String(resultId).replace(/[^a-zA-Z0-9_-]/g, '');
  const originalResultId = String(resultId);
  
  // 先嘗試使用 safeResultId 查找（如果 safeResultId 不為空）
  let titleElement = null;
  let inputElement = null;
  let editIcon = null;
  
  if (safeResultId) {
    titleElement = document.querySelector(`.ip-planning-item-title[data-result-id="${safeResultId}"]`);
    inputElement = document.querySelector(`.ip-planning-item-title-input[data-result-id="${safeResultId}"]`);
    editIcon = document.querySelector(`.ip-planning-item-edit-icon[data-result-id="${safeResultId}"]`);
  }
  
  // 如果找不到，嘗試使用原始 ID
  if (!titleElement || !inputElement) {
    titleElement = document.querySelector(`.ip-planning-item-title[data-result-id="${originalResultId}"]`);
    inputElement = document.querySelector(`.ip-planning-item-title-input[data-result-id="${originalResultId}"]`);
    editIcon = document.querySelector(`.ip-planning-item-edit-icon[data-result-id="${originalResultId}"]`);
  }
  
  // 如果還是找不到，嘗試使用 escapeHtml 轉義後的 ID
  if (!titleElement || !inputElement) {
    const escapedResultId = escapeHtml(originalResultId);
    titleElement = document.querySelector(`.ip-planning-item-title[data-result-id="${escapedResultId}"]`);
    inputElement = document.querySelector(`.ip-planning-item-title-input[data-result-id="${escapedResultId}"]`);
    editIcon = document.querySelector(`.ip-planning-item-edit-icon[data-result-id="${escapedResultId}"]`);
  }
  
  if (titleElement && inputElement) {
    const newTitle = inputElement.value.trim();
    const originalTitle = titleElement.textContent.trim(); // 保存原始標題
    
    // 查找 item 元素（使用相同的邏輯）
    let item = null;
    if (safeResultId) {
      item = document.querySelector(`.ip-planning-item[data-result-id="${safeResultId}"]`);
    }
    if (!item) {
      item = document.querySelector(`.ip-planning-item[data-result-id="${originalResultId}"]`);
    }
    if (!item) {
      const escapedResultId = escapeHtml(originalResultId);
      item = document.querySelector(`.ip-planning-item[data-result-id="${escapedResultId}"]`);
    }
    
    let defaultTitle = 'IP Profile';
    if (item) {
      const activeTab = document.querySelector('.ip-planning-tab.active');
      if (activeTab) {
        if (activeTab.textContent.includes('規劃')) {
          defaultTitle = '14天規劃';
        } else if (activeTab.textContent.includes('腳本')) {
          defaultTitle = '今日腳本';
        }
      }
    }
    
    const finalTitle = newTitle || defaultTitle;
    
    // 先更新 UI
    titleElement.textContent = finalTitle;
    titleElement.style.display = '';
    if (editIcon) {
      editIcon.style.display = 'none';
      editIcon.style.opacity = '0.6';
    }
    inputElement.style.display = 'none';
    
    // 如果標題有變更，更新到後端
    if (newTitle && newTitle !== originalTitle) {
      try {
        const token = localStorage.getItem('ipPlanningToken');
        if (!token) {
          // 如果沒有 token，只更新 localStorage
          if (ipPlanningUser && ipPlanningUser.user_id) {
            localStorage.setItem(`ip-planning-item-title-${ipPlanningUser.user_id}-${resultId}`, finalTitle);
          }
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('請先登入', 3000);
          }
          return;
        }
        
        const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
        const response = await fetch(`${API_URL}/api/ip-planning/results/${resultId}/title`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: finalTitle
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          // 更新成功，同時更新 localStorage
          if (ipPlanningUser && ipPlanningUser.user_id) {
            localStorage.setItem(`ip-planning-item-title-${ipPlanningUser.user_id}-${resultId}`, finalTitle);
          }
          // 使用綠色通知顯示成功訊息
          if (window.ReelMindCommon && window.ReelMindCommon.showGreenToast) {
            window.ReelMindCommon.showGreenToast('✅ 標題已更新');
          } else if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast('✅ 標題已更新', 2000);
          }
        } else {
          const errorData = await response.json();
          // 更新失敗，恢復原標題
          titleElement.textContent = originalTitle;
          if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
            window.ReelMindCommon.showToast(`更新標題失敗: ${errorData.error || '未知錯誤'}`, 3000);
          }
        }
      } catch (error) {
        console.error('更新標題失敗:', error);
        // 更新失敗，恢復原標題
        titleElement.textContent = originalTitle;
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('更新標題失敗，請稍後再試', 3000);
        }
      }
    } else {
      // 如果沒有變更，只更新 localStorage
      if (ipPlanningUser && ipPlanningUser.user_id) {
        localStorage.setItem(`ip-planning-item-title-${ipPlanningUser.user_id}-${resultId}`, finalTitle);
      }
    }
  }
}

// 查看 IP 人設規劃詳細內容
window.viewIpPlanningDetailForUserDB = async function(resultId) {
  try {
    if (!ipPlanningUser?.user_id) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入', 3000);
      }
      return;
    }
    
    // 驗證和清理參數
    if (!resultId) {
      console.error('無效的 resultId:', resultId);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('無效的記錄 ID', 3000);
      }
      return;
    }
    
    // 先嘗試從緩存中獲取記錄
    let result = null;
    if (window.currentIpPlanningResults && window.currentIpPlanningResults.length > 0) {
      result = window.currentIpPlanningResults.find(r => {
        const rId = String(r.id || '');
        const searchId = String(resultId || '');
        return rId === searchId || r.id == resultId;
      });
    }
    
    // 如果緩存中沒有，才發送 API 請求
    if (!result) {
      try {
        const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
        const response = await fetch(`${API_URL}/api/ip-planning/my`, {
          headers: {
            'Authorization': `Bearer ${ipPlanningToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.results) {
            window.currentIpPlanningResults = data.results;
            result = data.results.find(r => {
              const rId = String(r.id || '');
              const searchId = String(resultId || '');
              return rId === searchId || r.id == resultId;
            });
          }
        }
      } catch (error) {
        console.error('載入 IP 人設規劃結果失敗:', error);
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
        }
        return;
      }
    }
    
    // 如果找到記錄，顯示 modal
    if (result) {
      // 獲取標題
      let savedTitle = '';
      if (ipPlanningUser && ipPlanningUser.user_id) {
        savedTitle = localStorage.getItem(`ip-planning-item-title-${ipPlanningUser.user_id}-${result.id}`);
      }
      const activeTab = document.querySelector('.ip-planning-tab.active');
      let defaultTitle = '帳號定位';
      if (activeTab) {
        if (activeTab.textContent.includes('帳號定位')) {
          defaultTitle = '帳號定位';
        } else if (activeTab.textContent.includes('選題方向')) {
          defaultTitle = '選題方向（影片類型配比）';
        } else if (activeTab.textContent.includes('一週腳本')) {
          defaultTitle = '一週腳本';
        }
      }
      const finalTitle = savedTitle || (result.title && result.title !== '請在此編輯你的標題' ? result.title : defaultTitle);
      
      // 處理內容（與 displayOneClickGenerationResults 保持一致）
      let safeContent = '';
      if (result.content) {
        let contentStr = String(result.content);
        
        // 先解碼 HTML 實體
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentStr;
        contentStr = tempDiv.textContent || tempDiv.innerText || contentStr;
        
        // 檢查是否為 HTML
        if (/<[^>]+>/.test(contentStr)) {
          // 已經是 HTML，使用 DOMPurify 清理
          if (typeof DOMPurify !== 'undefined') {
            safeContent = DOMPurify.sanitize(contentStr, {
              ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
              ADD_ATTR: ['colspan', 'rowspan', 'style']
            });
          } else {
            safeContent = escapeHtml(contentStr);
          }
        } else {
          // 純文本，使用 Markdown 轉譯
          if (window.safeRenderMarkdown) {
            safeContent = window.safeRenderMarkdown(contentStr);
          } else if (typeof marked !== 'undefined') {
            // 確保 marked 支援表格和換行
            if (typeof marked.setOptions === 'function') {
              marked.setOptions({ 
                gfm: true,  // GitHub Flavored Markdown（支援表格）
                breaks: true,  // 支援換行
                headerIds: false,
                mangle: false
              });
            }
            const html = marked.parse(contentStr);
            // 使用 DOMPurify 清理（如果可用）
            if (typeof DOMPurify !== 'undefined') {
              safeContent = DOMPurify.sanitize(html, {
                USE_PROFILES: { html: true },
                FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
                ADD_TAGS: ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'a', 'img'],
                ADD_ATTR: ['target', 'colspan', 'rowspan', 'class', 'href', 'src', 'alt', 'title'],
                KEEP_CONTENT: true
              });
            } else {
              safeContent = html;
            }
          } else {
            // 最後使用轉義的純文字模式
            safeContent = escapeHtml(contentStr).replace(/\n/g, '<br>');
          }
        }
      }
      
      // 創建彈出視窗
      const modal = document.createElement('div');
      modal.className = 'ip-planning-detail-modal-overlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100000 !important;
        padding: 20px;
        box-sizing: border-box;
      `;
      
      // 點擊背景關閉
      modal.onclick = function(e) {
        if (e.target === modal) {
          modal.remove();
        }
      };
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
      `;
      
      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; background: white; z-index: 10; border-radius: 12px 12px 0 0; box-sizing: border-box;">
          <h3 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 600; flex: 1; padding-right: 12px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box;">${escapeHtml(finalTitle)}</h3>
          <button class="ip-planning-modal-close-btn" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s; flex-shrink: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; touch-action: manipulation;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">×</button>
        </div>
        <div style="padding: 24px; overflow-y: auto; overflow-x: hidden; flex: 1; -webkit-overflow-scrolling: touch; box-sizing: border-box;">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280; font-size: 14px;">建立時間：</span>
            <span style="color: #1f2937; font-size: 14px; margin-left: 8px;">${formatTaiwanTime(result.created_at)}</span>
          </div>
          <div style="color: #374151; line-height: 1.8; font-size: 15px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box;">${safeContent}</div>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; position: sticky; bottom: 0; background: white; z-index: 10; border-radius: 0 0 12px 12px; box-sizing: border-box;">
          <button class="ip-planning-modal-close-btn" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; width: 100%; max-width: 200px; box-sizing: border-box; -webkit-tap-highlight-color: transparent; touch-action: manipulation;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">關閉</button>
        </div>
      `;
      
      // 阻止點擊內容區域關閉
      modalContent.onclick = function(e) {
        e.stopPropagation();
      };
      
      // 為關閉按鈕添加事件監聽器
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      const closeButtons = modalContent.querySelectorAll('.ip-planning-modal-close-btn');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          modal.remove();
        });
      });
    } else {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到該記錄', 3000);
      }
    }
  } catch (error) {
    console.error('View IP planning detail error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
};

// 匯出 IP 人設規劃結果為 PDF
window.downloadIpPlanningPDF = function(resultId) {
  try {
    // 驗證和清理 resultId
    if (!resultId || (typeof resultId !== 'string' && typeof resultId !== 'number')) {
      console.error('無效的 resultId:', resultId);
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('無效的記錄 ID', 3000);
      }
      return;
    }
    
    // 從緩存中獲取結果
    let result = null;
    if (window.currentIpPlanningResults && window.currentIpPlanningResults.length > 0) {
      result = window.currentIpPlanningResults.find(r => {
        const rId = String(r.id || '');
        const searchId = String(resultId || '');
        return rId === searchId || r.id == resultId;
      });
    }
    
    if (!result) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('找不到該記錄', 3000);
      }
      return;
    }
    
    // 獲取標題
    let savedTitle = '';
    if (ipPlanningUser && ipPlanningUser.user_id) {
      savedTitle = localStorage.getItem(`ip-planning-item-title-${ipPlanningUser.user_id}-${result.id}`);
    }
    const activeTab = document.querySelector('.ip-planning-tab.active');
    let defaultTitle = '帳號定位';
    if (activeTab) {
      if (activeTab.textContent.includes('帳號定位')) {
        defaultTitle = '帳號定位';
      } else if (activeTab.textContent.includes('選題方向')) {
        defaultTitle = '選題方向（影片類型配比）';
      } else if (activeTab.textContent.includes('一週腳本')) {
        defaultTitle = '一週腳本';
      }
    }
    const finalTitle = savedTitle || (result.title && result.title !== '請在此編輯你的標題' ? result.title : defaultTitle);
    
    // 處理內容（移除 HTML 標籤，保留純文字和基本格式）
    let printContent = result.content || '';
    // 移除 HTML 標籤，但保留換行
    printContent = printContent.replace(/<br\s*\/?>/gi, '\n');
    printContent = printContent.replace(/<\/p>/gi, '\n\n');
    printContent = printContent.replace(/<\/div>/gi, '\n');
    printContent = printContent.replace(/<\/li>/gi, '\n');
    printContent = printContent.replace(/<li>/gi, '• ');
    printContent = printContent.replace(/<[^>]+>/g, '');
    printContent = printContent.replace(/&nbsp;/g, ' ');
    printContent = printContent.replace(/&amp;/g, '&');
    printContent = printContent.replace(/&lt;/g, '<');
    printContent = printContent.replace(/&gt;/g, '>');
    printContent = printContent.replace(/&quot;/g, '"');
    printContent = printContent.replace(/&#039;/g, "'");
    
    // 構建 PDF 內容
    let pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(finalTitle)}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
          h1 { color: #1f2937; margin-bottom: 10px; font-size: 24px; }
          .meta { color: #6b7280; margin-bottom: 20px; font-size: 14px; }
          .content { color: #374151; white-space: pre-wrap; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
          tr:nth-child(even) { background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(finalTitle)}</h1>
        <div class="meta">建立時間：${formatTaiwanTime(result.created_at)}</div>
        <div class="content">${escapeHtml(printContent)}</div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // 記錄下載事件
        recordUsageEvent('download_pdf', 'ip_planning', String(resultId), 'ip_planning_result', {
          result_title: finalTitle,
          result_type: result.type || 'unknown'
        });
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('PDF 準備就緒，請使用瀏覽器的列印功能儲存為 PDF', 3000);
        }
      }, 250);
    };
  } catch (error) {
    console.error('Download IP planning PDF error:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('❌ 匯出失敗，請稍後再試', 3000);
    }
  }
};

// ===== 一鍵生成管理函數 =====

// 載入一鍵生成結果（整合 mode3 的所有結果）
async function loadOneClickGenerationForUserDB() {
  const content = document.getElementById('one-click-content');
  
  if (!ipPlanningUser?.user_id) {
    if (content) {
      content.innerHTML = '<div class="loading-text">請先登入以查看一鍵生成結果</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入以查看一鍵生成結果', 3000);
    }
    return;
  }
  
  // 先檢查是否有快取數據，如果有就先顯示（提升響應速度）
  if (window.cachedOneClickResults && window.cachedOneClickScripts) {
    if (content) {
      displayOneClickGenerationResults(window.cachedOneClickResults, window.cachedOneClickScripts);
    }
  } else if (content) {
    showLoadingAnimation(content, '載入一鍵生成結果中...');
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    
    // 並行執行兩個 API 請求，而不是順序執行（減少等待時間）
    const [response, scriptsResponse] = await Promise.all([
      fetch(`${API_URL}/api/ip-planning/my`, {
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${API_URL}/api/scripts/my`, {
        headers: {
          'Authorization': `Bearer ${ipPlanningToken}`,
          'Content-Type': 'application/json'
        }
      })
    ]);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results) {
        // 只顯示 mode3 的結果
        const mode3Results = data.results.filter(r => {
          try {
            const metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {});
            return metadata.source === 'mode3';
          } catch (e) {
            // 如果 metadata 解析失敗，檢查是否為舊的 positioning_records 遷移資料
            return false;
          }
        });
        
        let scripts = [];
        if (scriptsResponse.ok) {
          const scriptsData = await scriptsResponse.json();
          if (scriptsData.scripts) {
            // 只顯示 mode3 的腳本（script_data.source === 'mode3' 或沒有 source 標記的舊腳本）
            scripts = scriptsData.scripts.filter(s => {
              try {
                const scriptData = typeof s.script_data === 'string' ? JSON.parse(s.script_data) : (s.script_data || {});
                return scriptData.source === 'mode3' || !scriptData.source;
              } catch (e) {
                return true; // 舊資料預設顯示
              }
            });
          }
        }
        
        // 更新快取數據，供下次使用
        window.cachedOneClickResults = mode3Results;
        window.cachedOneClickScripts = scripts;
        
        displayOneClickGenerationResults(mode3Results, scripts);
      } else {
        if (content) {
          content.innerHTML = '<div class="loading-text">尚無一鍵生成結果</div>';
        }
      }
    } else if (response.status === 401) {
      if (content) {
        content.innerHTML = '<div class="loading-text">請先登入</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入以查看一鍵生成結果', 3000);
      }
    } else {
      if (content) {
        content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
      }
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
      }
    }
  } catch (error) {
    console.error('載入一鍵生成結果錯誤:', error);
    if (content) {
      content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
    }
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
}

// 顯示一鍵生成結果
function displayOneClickGenerationResults(mode3Results, scripts) {
  const content = document.getElementById('one-click-content');
  
  if (!content) return;
  
  // 使用保存的類型，如果沒有則從 active tab 獲取（預設為帳號定位）
  let currentType = window.currentOneClickType || 'profile';
  const activeTab = document.querySelector('.one-click-tab.active');
  if (activeTab && !window.currentOneClickType) {
    if (activeTab.textContent.includes('帳號定位')) {
      currentType = 'profile';
    } else if (activeTab.textContent.includes('選題方向')) {
      currentType = 'plan';
    } else if (activeTab.textContent.includes('腳本')) {
      currentType = 'scripts';
    }
  }
  
  if (currentType === 'scripts') {
    // 顯示腳本
    if (scripts.length === 0) {
      content.innerHTML = '<div class="loading-text">尚無腳本</div>';
      return;
    }
    
    const sortedScripts = [...scripts].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
    
    content.innerHTML = sortedScripts.map((script, index) => {
      const date = script.created_at ? formatTaiwanTime(script.created_at) : (script.created_at || '');
      const scriptName = escapeHtml(script.script_name || script.name || script.title || DEFAULT_SCRIPT_TITLE);
      const scriptId = String(script.id || '');
      // 使用原始 ID，不進行過度轉義，確保查找時能匹配
      const safeScriptId = scriptId.replace(/['"\\]/g, '');
      const escapedScriptId = escapeHtml(scriptId);
      
      return `
        <div class="script-item" data-script-id="${scriptId}" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; color: #1F2937; font-size: 1.1rem; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" 
                onclick="editScriptNameForUserDB('${scriptId.replace(/'/g, "\\'")}', event)"
                onmouseover="this.style.background='#f3f4f6'"
                onmouseout="this.style.background='transparent'"
                title="點擊編輯標題">${scriptName}</h4>
            <span style="color: #6B7280; font-size: 0.9rem;">${date}</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="action-btn" onclick="viewScriptDetailForUserDB('${safeScriptId.replace(/'/g, "\\'")}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-eye"></i> 查看完整</button>
            <button class="action-btn" onclick="downloadScriptPDF('${safeScriptId.replace(/'/g, "\\'")}')" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-file-pdf"></i> PDF</button>
            <button class="action-btn" onclick="downloadScriptCSV('${safeScriptId.replace(/'/g, "\\'")}')" style="background: #6366f1; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-file-alt"></i> CSV</button>
            <button class="action-btn delete-btn" onclick="deleteScriptForUserDB('${safeScriptId.replace(/'/g, "\\'")}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-trash-alt"></i> 刪除</button>
          </div>
        </div>
      `;
    }).join('');
  } else {
    // 顯示帳號定位或選題方向（從 mode3Results 過濾）
    const filteredResults = mode3Results.filter(r => {
      if (currentType === 'profile') {
        return r.result_type === 'profile';
      } else if (currentType === 'plan') {
        return r.result_type === 'plan';
      }
      return false;
    });
    
    if (filteredResults.length === 0) {
      content.innerHTML = `<div class="loading-text">尚無${currentType === 'profile' ? '帳號定位' : '選題方向'}結果</div>`;
      return;
    }
    
    const sortedResults = [...filteredResults].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
    
    content.innerHTML = sortedResults.map((result, index) => {
      const date = formatTaiwanTime(result.created_at);
      const title = escapeHtml(result.title || (currentType === 'profile' ? '帳號定位' : '選題方向'));
      const safeResultId = String(result.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      const displayResultId = safeResultId || String(result.id || '');
      
      let safeContent = '';
      if (result.content) {
        const contentStr = String(result.content);
        
        // ✅ 使用與 mode1.js 相同的 renderMode1Markdown 邏輯
        if (window.renderMode1Markdown) {
          // 如果有統一的渲染函數，直接使用
          safeContent = window.renderMode1Markdown(contentStr);
        } else {
          // 先清理可能的編碼問題（HTML 實體解碼）
          let cleanedText = contentStr
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ');
          
          // 檢查是否包含 HTML 標籤
          const hasHtmlTags = /<[a-z][\s\S]*>/i.test(cleanedText);
          
          if (hasHtmlTags) {
            // 如果包含 HTML，使用 DOMPurify 清理（與 mode1.js 保持一致）
            if (window.DOMPurify) {
              safeContent = window.DOMPurify.sanitize(cleanedText, {
                USE_PROFILES: { html: true },
                FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
                ADD_TAGS: [
                  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
                  'strong', 'em', 'b', 'i', 'u', 's', 'strike', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
                  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
                  'p', 'br', 'div', 'span', 'hr',
                  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                  'blockquote', 'pre', 'code', 'kbd', 'samp',
                  'a', 'img',
                  'abbr', 'address', 'cite', 'q', 'time'
                ],
                ADD_ATTR: ['target', 'colspan', 'rowspan', 'class', 'style', 'href', 'src', 'alt', 'title', 'width', 'height'],
                KEEP_CONTENT: true,
                ALLOW_DATA_ATTR: false
              });
            } else {
              safeContent = escapeHtml(cleanedText);
            }
          } else {
            // 純文本，使用 Markdown 解析（與 mode1.js 保持一致）
            if (window.marked && window.DOMPurify) {
              try {
                // 確保 marked 支援所有需要的功能
                const rawHtml = marked.parse(cleanedText, {
                  breaks: true,  // 單個換行符轉換為 <br>
                  gfm: true,     // GitHub Flavored Markdown
                  tables: true,  // 表格支援
                  headerIds: false, // 不生成標題 ID
                  mangle: false  // 不混淆 email
                });
                
                // 使用 DOMPurify 清理 Markdown 轉換後的 HTML
                safeContent = window.DOMPurify.sanitize(rawHtml, {
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
              } catch (e) {
                console.error('Markdown 渲染錯誤:', e);
                // 降級處理：如果渲染失敗，轉義並保留換行
                safeContent = escapeHtml(cleanedText).replace(/\n/g, '<br>');
              }
            } else if (window.safeRenderMarkdown) {
              safeContent = window.safeRenderMarkdown(cleanedText);
            } else {
              // 最終降級處理：轉義 HTML 並保留換行
              safeContent = escapeHtml(cleanedText).replace(/\n/g, '<br>');
            }
          }
        }
      }
      
      return `
        <div class="one-click-item" data-result-id="${displayResultId}" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; color: #1F2937; font-size: 1.1rem; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" 
                onclick="editIpPlanningTitleForUserDB('${safeResultId.replace(/'/g, "\\'")}', event)"
                onmouseover="this.style.background='#f3f4f6'"
                onmouseout="this.style.background='transparent'"
                title="點擊編輯標題">${title}</h4>
            <span style="color: #6B7280; font-size: 0.9rem;">${date}</span>
          </div>
          <div style="color: #374151; line-height: 1.6; max-height: 300px; overflow-y: auto; margin-bottom: 12px;">
            ${safeContent}
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="action-btn" onclick="viewIpPlanningDetailForUserDB('${safeResultId.replace(/'/g, "\\'")}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-eye"></i> 查看完整</button>
            <button class="action-btn" onclick="downloadIpPlanningPDF('${safeResultId.replace(/'/g, "\\'")}')" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-file-pdf"></i> PDF</button>
            <button class="action-btn delete-btn" onclick="deleteIpPlanningResultForUserDB('${safeResultId.replace(/'/g, "\\'")}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-trash-alt"></i> 刪除</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

function setOneClickTabActive(type) {
  document.querySelectorAll('.one-click-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.style.borderBottom = 'none';
    tab.style.color = '#6B7280';
    tab.style.fontWeight = 'normal';
  });
  
  const tabs = document.querySelectorAll('.one-click-tab');
  let targetTab = null;
  if (type === 'scripts') {
    targetTab = Array.from(tabs).find(tab => tab.textContent.includes('腳本'));
  } else if (type === 'profile') {
    targetTab = Array.from(tabs).find(tab => tab.textContent.includes('帳號定位'));
  } else if (type === 'plan') {
    targetTab = Array.from(tabs).find(tab => tab.textContent.includes('選題方向'));
  }
  
  if (targetTab) {
    targetTab.classList.add('active');
    targetTab.style.borderBottom = '2px solid #3B82F6';
    targetTab.style.color = '#3B82F6';
    targetTab.style.fontWeight = '600';
  }
}

// 切換一鍵生成類型
window.showOneClickType = function(type) {
  window.currentOneClickType = type;
  setOneClickTabActive(type);
  
  // 如果有快取數據，直接顯示（提升響應速度）
  if (window.cachedOneClickResults && window.cachedOneClickScripts) {
    displayOneClickGenerationResults(window.cachedOneClickResults, window.cachedOneClickScripts);
  } else {
    // 沒有快取時才載入
    loadOneClickGenerationForUserDB();
  }
};

// 匯出一鍵生成結果
window.exportOneClickGenerationResults = function() {
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast('匯出功能開發中', 3000);
  }
};

// ===== 權限檢查函數 =====

// 檢查 IP 人設規劃權限並顯示/隱藏選單
async function checkIpPlanningPermission() {
  if (!ipPlanningUser?.user_id) {
    // 未登入，隱藏 IP 人設規劃選單
    const menuItem = document.getElementById('menu-ipPlanning');
    const section = document.getElementById('db-ipPlanning');
    if (menuItem) menuItem.style.display = 'none';
    if (section) section.style.display = 'none';
    return;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/ip-planning/permission`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const hasPermission = data.has_permission || false;
      
      const menuItem = document.getElementById('menu-ipPlanning');
      const section = document.getElementById('db-ipPlanning');
      
      if (hasPermission) {
        // 有權限，顯示選單
        if (menuItem) menuItem.style.display = '';
        if (section) section.style.display = '';
      } else {
        // 無權限，隱藏選單
        if (menuItem) menuItem.style.display = 'none';
        if (section) section.style.display = 'none';
      }
    } else {
      // API 錯誤，隱藏選單
      const menuItem = document.getElementById('menu-ipPlanning');
      const section = document.getElementById('db-ipPlanning');
      if (menuItem) menuItem.style.display = 'none';
      if (section) section.style.display = 'none';
    }
  } catch (error) {
    console.error('檢查 IP 人設規劃權限錯誤:', error);
    // 錯誤時隱藏選單
    const menuItem = document.getElementById('menu-ipPlanning');
    const section = document.getElementById('db-ipPlanning');
    if (menuItem) menuItem.style.display = 'none';
    if (section) section.style.display = 'none';
  }
}

// 確保函數在全局作用域中可用
window.loadOneClickGenerationForUserDB = loadOneClickGenerationForUserDB;
window.showOneClickType = showOneClickType;
window.checkIpPlanningPermission = checkIpPlanningPermission;

// ===== 訂單管理函數 =====

// 載入我的訂單
async function loadMyOrdersForUserDB() {
  const content = document.querySelector('#myOrdersContent');
  if (!content) return;
  
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    content.innerHTML = '<div class="loading-text">請先登入以查看訂單記錄</div>';
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入以查看訂單記錄', 3000);
    }
    return;
  }
  
  showLoadingAnimation(content, '載入訂單記錄中...');
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/orders`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const orders = data.orders || [];
      displayOrdersForUserDB(orders);
    } else if (response.status === 401) {
      content.innerHTML = '<div class="loading-text">請先登入</div>';
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入以查看訂單記錄', 3000);
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '載入失敗' }));
      throw new Error(errorData.error || '載入失敗');
    }
  } catch (error) {
    console.error('載入訂單失敗:', error);
    content.innerHTML = '<div class="loading-text">載入失敗，請稍後再試</div>';
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('載入失敗，請稍後再試', 3000);
    }
  }
}

// 顯示訂單列表
function displayOrdersForUserDB(orders) {
  const container = document.querySelector('#myOrdersContent');
  if (!container) return;
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
        <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">尚無訂單記錄</p>
        <a href="/subscription.html" style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
          前往訂閱
        </a>
      </div>
    `;
    return;
  }
  
  const sortedOrders = [...orders].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
  
  container.innerHTML = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">訂單編號</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">方案</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">金額</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">狀態</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">付款時間</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">到期日期</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">發票號碼</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${sortedOrders.map(order => {
            const orderDate = formatTaiwanTime(order.created_at);
            const paidDate = order.paid_at ? formatTaiwanTime(order.paid_at) : '-';
            const expiresDate = order.expires_at ? new Date(order.expires_at).toLocaleString('zh-TW', {
              hour12: false,
              timeZone: 'Asia/Taipei',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }) : '-';
            
            const statusBadge = order.payment_status === 'paid' 
              ? '<span style="display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ 已付款</span>'
              : '<span style="display: inline-block; padding: 4px 12px; background: #fee2e2; color: #991b1b; border-radius: 12px; font-size: 12px; font-weight: 600;">⏳ 待付款</span>';
            
            const planText = order.plan_type === 'two_year' ? 'Creator Pro 雙年方案' : 
                             order.plan_type === 'yearly' ? 'Script Lite 入門版' : 
                             order.plan_type === 'lifetime' ? '永久使用方案' : order.plan_type || '-';
            const orderId = order.order_id || order.id;
            
            // 操作按鈕：待付款訂單顯示「繼續付款」按鈕
            let actionButton = '';
            if (order.payment_status === 'pending') {
              const planParam = order.plan_type === 'two_year' ? 'two_year' : 
                                order.plan_type === 'lifetime' ? 'lifetime' : 'yearly';
              const amountParam = order.amount || '';
              actionButton = `<a href="/checkout.html?plan=${planParam}&amount=${amountParam}" style="display: inline-block; padding: 6px 12px; background: #3B82F6; color: white; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; transition: background 0.2s;" onmouseover="this.style.background='#2563EB'" onmouseout="this.style.background='#3B82F6'" onclick="event.stopPropagation()">繼續付款</a>`;
            } else {
              actionButton = '<span style="color: #9ca3af;">-</span>';
            }
            
            return `
              <tr style="border-bottom: 1px solid #e5e7eb; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                <td style="padding: 12px; color: #1f2937; font-weight: 500; cursor: pointer;" onclick="showOrderDetail('${orderId}')">${escapeHtml(orderId || '-')}</td>
                <td style="padding: 12px; color: #4b5563; cursor: pointer;" onclick="showOrderDetail('${orderId}')">${escapeHtml(planText)}</td>
                <td style="padding: 12px; text-align: right; color: #1f2937; font-weight: 600; cursor: pointer;" onclick="showOrderDetail('${orderId}')">NT$${order.amount?.toLocaleString() || 0}</td>
                <td style="padding: 12px; text-align: center; cursor: pointer;" onclick="showOrderDetail('${orderId}')">${statusBadge}</td>
                <td style="padding: 12px; color: #6b7280; font-size: 14px; cursor: pointer;" onclick="showOrderDetail('${orderId}')">${escapeHtml(paidDate)}</td>
                <td style="padding: 12px; color: #6b7280; font-size: 14px; cursor: pointer;" onclick="showOrderDetail('${orderId}')">${escapeHtml(expiresDate)}</td>
                <td style="padding: 12px; color: #6b7280; font-size: 14px; cursor: pointer;" onclick="showOrderDetail('${orderId}')">${escapeHtml(order.invoice_number || '-')}</td>
                <td style="padding: 12px; text-align: center;" onclick="event.stopPropagation()">${actionButton}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 刪除訂單
// 刪除訂單功能已停用 - 訂單將由系統自動清理（超過24小時的待付款訂單）
// window.deleteOrder 函數已移除

// 顯示訂單詳情
window.showOrderDetail = async function(orderId) {
  if (!ipPlanningToken || !orderId) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('無法載入訂單詳情', 3000);
    }
    return;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '載入失敗' }));
      throw new Error(errorData.error || '載入訂單詳情失敗');
    }
    
    const data = await response.json();
    const order = data.order;
    
    if (!order) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('訂單不存在', 3000);
      }
      return;
    }
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return formatTaiwanTime(dateStr);
      } catch (e) {
        return dateStr;
      }
    };
    
    const formatDateOnly = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return new Date(dateStr).toLocaleDateString('zh-TW', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (e) {
        return dateStr;
      }
    };
    
    const paymentMethodText = {
      'ecpay': 'ECPay 綠界',
      'credit': '信用卡',
      'atm': 'ATM 轉帳',
      'cvs': '超商代碼',
      'barcode': '超商條碼'
    }[order.payment_method] || order.payment_method || '-';
    
    const planText = order.plan_type === 'lifetime' ? '永久使用方案' : 
                    order.plan_type === 'yearly' ? '年費方案' : 
                    order.plan_type || '-';
    
    const statusText = order.payment_status === 'paid' ? '✅ 已付款' : 
                      order.payment_status === 'pending' ? '⏳ 待付款' : 
                      order.payment_status || '-';
    
    const statusColor = order.payment_status === 'paid' ? '#065f46' : 
                       order.payment_status === 'pending' ? '#991b1b' : '#6b7280';
    
    const invoiceTypeText = order.invoice_type === 'personal' ? '個人' : 
                           order.invoice_type === 'company' ? '公司' : 
                           order.invoice_type || '-';
    
    const detailHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000 !important; display: flex; align-items: center; justify-content: center; padding: 20px;" onclick="closeOrderDetail(event)">
        <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">
          <div style="padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1f2937;">📋 訂單詳情</h2>
            <button onclick="closeOrderDetail()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">×</button>
          </div>
          <div style="padding: 24px;">
            <div style="display: grid; gap: 20px;">
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">訂單資訊</h3>
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">訂單編號：</span>
                    <span style="color: #1f2937; font-weight: 600;">${escapeHtml(order.order_id || '-')}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">方案類型：</span>
                    <span style="color: #1f2937; font-weight: 600;">${escapeHtml(planText)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">金額：</span>
                    <span style="color: #1f2937; font-weight: 700; font-size: 18px;">NT$${order.amount?.toLocaleString() || 0}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">付款狀態：</span>
                    <span style="color: ${statusColor}; font-weight: 600;">${escapeHtml(statusText)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">付款方式：</span>
                    <span style="color: #1f2937;">${escapeHtml(paymentMethodText)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">建立時間：</span>
                    <span style="color: #1f2937;">${escapeHtml(formatDate(order.created_at))}</span>
                  </div>
                  ${order.paid_at ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">付款時間：</span>
                    <span style="color: #1f2937;">${escapeHtml(formatDate(order.paid_at))}</span>
                  </div>
                  ` : ''}
                  ${order.expires_at ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">到期日期：</span>
                    <span style="color: #1f2937;">${escapeHtml(formatDateOnly(order.expires_at))}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              ${order.name || order.email || order.phone ? `
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">帳務資訊</h3>
                <div style="display: grid; gap: 12px;">
                  ${order.name ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">姓名：</span>
                    <span style="color: #1f2937;">${escapeHtml(order.name)}</span>
                  </div>
                  ` : ''}
                  ${order.email ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">Email：</span>
                    <span style="color: #1f2937;">${escapeHtml(order.email)}</span>
                  </div>
                  ` : ''}
                  ${order.phone ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">電話：</span>
                    <span style="color: #1f2937;">${escapeHtml(order.phone)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              ` : ''}
              
              ${order.invoice_number || order.invoice_type || order.vat_number ? `
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">發票資訊</h3>
                <div style="display: grid; gap: 12px;">
                  ${order.invoice_type ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">發票類型：</span>
                    <span style="color: #1f2937;">${escapeHtml(invoiceTypeText)}</span>
                  </div>
                  ` : ''}
                  ${order.vat_number ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">統一編號：</span>
                    <span style="color: #1f2937; font-weight: 600;">${escapeHtml(order.vat_number)}</span>
                  </div>
                  ` : ''}
                  ${order.invoice_number ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">發票號碼：</span>
                    <span style="color: #1f2937; font-weight: 600;">${escapeHtml(order.invoice_number)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              ` : ''}
              
              ${order.note ? `
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">備註</h3>
                <p style="margin: 0; color: #1f2937; padding: 12px; background: #f9fafb; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(order.note)}</p>
              </div>
              ` : ''}
            </div>
            
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;">
              <button onclick="closeOrderDetail()" style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">關閉</button>
              ${order.payment_status === 'pending' ? `
              <a href="/subscription.html" style="padding: 10px 20px; background: #3B82F6; color: white; border: none; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block; transition: background 0.2s;" onmouseover="this.style.background='#2563EB'" onmouseout="this.style.background='#3B82F6'">前往付款</a>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', detailHTML);
  } catch (error) {
    console.error('載入訂單詳情失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast(error.message || '載入訂單詳情失敗', 3000);
    }
  }
}

// 關閉訂單詳情
window.closeOrderDetail = function(event) {
  if (event && event.target !== event.currentTarget) {
    return;
  }
  const modal = document.querySelector('[style*="z-index: 100000"]');
  if (modal) {
    modal.remove();
  }
}

// ===== API Key 管理函數 =====

// 載入已保存的 API Key
async function loadSavedApiKey() {
  const llmProvider = document.getElementById('llmProvider');
  const llmModel = document.getElementById('llmModel');
  
  // 如果沒有登入，仍然初始化模型選項（使用預設提供商）
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    // 使用預設提供商（gemini）初始化模型選項
    if (llmProvider && llmModel) {
      llmProvider.value = 'gemini';
      await updateModelOptions();
    }
    return;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/llm-keys/${ipPlanningUser.user_id}`, {
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const savedKeyDisplay = document.getElementById('savedKeyDisplay');
      const savedKeyLast4 = document.getElementById('savedKeyLast4');
      
      if (data.keys && data.keys.length > 0) {
        const key = data.keys[0];
        if (key.provider && llmProvider) {
          llmProvider.value = key.provider;
          // 更新模型選項以匹配 provider（等待完成後再設置模型值）
          await updateModelOptions();
        } else if (llmProvider) {
          // 如果沒有已保存的提供商，使用預設（gemini）
          llmProvider.value = 'gemini';
          await updateModelOptions();
        }
        
        if (key.last4) {
          if (savedKeyLast4) savedKeyLast4.textContent = `****${key.last4}`;
          if (savedKeyDisplay) savedKeyDisplay.style.display = 'block';
        }
        
        // 載入用戶選擇的模型（在 updateModelOptions 完成後）
        if (llmModel && key.model_name) {
          // 等待一小段時間確保選項已載入
          setTimeout(() => {
            const optionExists = Array.from(llmModel.options).some(opt => opt.value === key.model_name);
            if (optionExists) {
              llmModel.value = key.model_name;
            } else {
              llmModel.value = ''; // 如果模型不存在，使用系統預設
            }
          }, 100);
        } else if (llmModel) {
          llmModel.value = ''; // 使用系統預設
        }
      } else {
        // 如果沒有已保存的 key，使用預設提供商初始化模型選項
        if (llmProvider) {
          llmProvider.value = 'gemini';
          await updateModelOptions();
        }
      }
    } else {
      // API 請求失敗，使用預設提供商初始化模型選項
      if (llmProvider) {
        llmProvider.value = 'gemini';
        await updateModelOptions();
      }
    }
  } catch (error) {
    console.error('載入已保存的 API Key 失敗:', error);
    // 發生錯誤時，使用預設提供商初始化模型選項
    if (llmProvider) {
      llmProvider.value = 'gemini';
      await updateModelOptions();
    }
  }
}

// 保存 API Key
async function saveApiKey() {
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  const apiKeyInput = document.getElementById('llmApiKey');
  const providerSelect = document.getElementById('llmProvider');
  
  if (!apiKeyInput || !providerSelect) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('找不到輸入欄位', 3000);
    }
    return;
  }
  
  const apiKey = apiKeyInput.value.trim();
  const provider = providerSelect.value;
  
  if (!apiKey) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請輸入 API 金鑰', 3000);
    }
    return;
  }
  
  if (provider === 'gemini' && !apiKey.startsWith('AI')) {
    if (!confirm('Gemini API Key 通常以 "AI" 開頭，您確定要繼續嗎？')) {
      return;
    }
  }
  
  if (provider === 'openai' && !apiKey.startsWith('sk-')) {
    if (!confirm('OpenAI API Key 通常以 "sk-" 開頭，您確定要繼續嗎？')) {
      return;
    }
  }
  
  try {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在保存金鑰...', 2000);
    }
    
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/llm-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: ipPlanningUser.user_id,
        provider: provider,
        api_key: apiKey,
        model_name: document.getElementById('llmModel')?.value || null  // 新增：保存用戶選擇的模型
      })
    });
    
    if (response.ok) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ API 金鑰已安全保存', 3000);
      }
      apiKeyInput.value = '';
      await loadSavedApiKey();
    } else if (response.status === 401) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('請先登入', 3000);
      }
    } else {
      const errorData = await response.json();
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`保存失敗: ${errorData.error || '未知錯誤'}`, 3000);
      }
    }
  } catch (error) {
    console.error('保存 API Key 錯誤:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('保存失敗，請稍後再試', 3000);
    }
  }
}

// 測試 API Key
async function testApiKey() {
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  const apiKeyInput = document.getElementById('llmApiKey');
  const providerSelect = document.getElementById('llmProvider');
  const testResultDiv = document.getElementById('testKeyResult');
  
  if (!apiKeyInput || !providerSelect || !testResultDiv) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('找不到輸入欄位', 3000);
    }
    return;
  }
  
  const apiKey = apiKeyInput.value.trim();
  const provider = providerSelect.value;
  const modelSelect = document.getElementById('llmModel');
  const modelName = modelSelect ? modelSelect.value.trim() : '';
  
  if (!apiKey) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先輸入 API 金鑰', 3000);
    }
    testResultDiv.style.display = 'none';
    return;
  }
  
  testResultDiv.style.display = 'block';
  testResultDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span style="color: #6b7280;">正在測試金鑰...</span>
    </div>
  `;
  testResultDiv.style.background = '#f3f4f6';
  testResultDiv.style.border = '1px solid #e5e7eb';
  testResultDiv.style.color = '#6b7280';
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/llm-keys/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: provider,
        api_key: apiKey,
        model_name: modelName || null  // 發送用戶選擇的模型，如果沒有選擇則為 null
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.valid) {
        testResultDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #10b981; font-size: 18px;">✅</span>
            <div>
              <div style="font-weight: 500; color: #10b981; margin-bottom: 4px;">API 金鑰測試成功</div>
              <div style="color: #6b7280; font-size: 13px;">${result.message || '金鑰有效，可以使用'}</div>
            </div>
          </div>
        `;
        testResultDiv.style.background = '#ecfdf5';
        testResultDiv.style.border = '1px solid #10b981';
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('✅ API 金鑰測試成功，金鑰有效！', 3000);
        }
      } else {
        testResultDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #ef4444; font-size: 18px;">❌</span>
            <div>
              <div style="font-weight: 500; color: #ef4444; margin-bottom: 4px;">API 金鑰測試失敗</div>
              <div style="color: #6b7280; font-size: 13px;">${result.error || '金鑰無效，請檢查是否正確'}</div>
            </div>
          </div>
        `;
        testResultDiv.style.background = '#fef2f2';
        testResultDiv.style.border = '1px solid #ef4444';
        if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
          window.ReelMindCommon.showToast('❌ API 金鑰測試失敗: ' + (result.error || '金鑰無效'), 3000);
        }
      }
    } else {
      // 處理 HTTP 錯誤狀態碼
      let errorMessage = '未知錯誤，請稍後再試';
      
      if (response.status === 429) {
        // 速率限制錯誤 - 嘗試從後端獲取中文錯誤訊息
        try {
      const errorData = await response.json();
          errorMessage = errorData.error || '測試請求過於頻繁，請等待 1 分鐘後再試（每分鐘最多測試 3 次）';
        } catch (e) {
          // 如果無法解析 JSON，使用預設訊息
          errorMessage = '測試請求過於頻繁，請等待 1 分鐘後再試（每分鐘最多測試 3 次）';
        }
        
        testResultDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #f59e0b; font-size: 18px;">⚠️</span>
            <div>
              <div style="font-weight: 500; color: #f59e0b; margin-bottom: 4px;">測試請求過於頻繁</div>
              <div style="color: #6b7280; font-size: 13px;">${errorMessage}</div>
            </div>
          </div>
        `;
        testResultDiv.style.background = '#fffbeb';
        testResultDiv.style.border = '1px solid #f59e0b';
      } else {
        // 其他錯誤
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // 無法解析 JSON，使用狀態碼訊息
          if (response.status === 401) {
            errorMessage = '請先登入';
          } else if (response.status === 403) {
            errorMessage = '無權限訪問';
          } else if (response.status === 500) {
            errorMessage = '伺服器錯誤，請稍後再試';
          }
        }
        
      testResultDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #ef4444; font-size: 18px;">❌</span>
          <div>
            <div style="font-weight: 500; color: #ef4444; margin-bottom: 4px;">測試失敗</div>
              <div style="color: #6b7280; font-size: 13px;">${errorMessage}</div>
          </div>
        </div>
      `;
      testResultDiv.style.background = '#fef2f2';
      testResultDiv.style.border = '1px solid #ef4444';
      }
      
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('❌ API 金鑰測試失敗: ' + errorMessage, 3000);
      }
    }
  } catch (error) {
    console.error('測試 API Key 錯誤:', error);
    testResultDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #ef4444; font-size: 18px;">❌</span>
        <div>
          <div style="font-weight: 500; color: #ef4444; margin-bottom: 4px;">測試失敗</div>
          <div style="color: #6b7280; font-size: 13px;">網路錯誤，請檢查連線後再試</div>
        </div>
      </div>
    `;
    testResultDiv.style.background = '#fef2f2';
    testResultDiv.style.border = '1px solid #ef4444';
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('測試失敗，請稍後再試', 3000);
    }
  }
}

// 切換 API Key 顯示/隱藏
function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById('llmApiKey');
  const toggleIcon = document.getElementById('toggleKeyIcon');
  
  if (apiKeyInput && toggleIcon) {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleIcon.className = 'fas fa-eye-slash';
    } else {
      apiKeyInput.type = 'password';
      toggleIcon.className = 'fas fa-eye';
    }
  }
}

// 更新模型選項（根據 provider 顯示對應的模型，從後端動態載入）
async function updateModelOptions() {
  const providerSelect = document.getElementById('llmProvider');
  const modelSelect = document.getElementById('llmModel');
  
  if (!providerSelect || !modelSelect) {
    return;
  }
  
  const selectedProvider = providerSelect.value;
  
  // 如果沒有選擇提供商，顯示提示
  if (!selectedProvider) {
    modelSelect.innerHTML = '<option value="">請先選擇提供商...</option>';
    return;
  }
  
  const currentValue = modelSelect.value;
  
  // 清空現有選項，顯示載入中
  modelSelect.innerHTML = '<option value="">載入中...</option>';
  modelSelect.disabled = true;
  
  try {
    // 從後端動態載入模型列表
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/llm/models`);
    
    if (response.ok) {
      const data = await response.json();
      const models = data[selectedProvider] || [];
      
      // 清空選項
      modelSelect.innerHTML = '';
      
      // 添加模型選項
      models.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        modelSelect.appendChild(optionElement);
      });
      
      modelSelect.disabled = false;
      
      // 嘗試恢復之前選擇的值（如果仍然有效）
      if (currentValue) {
        const optionExists = Array.from(modelSelect.options).some(opt => opt.value === currentValue);
        if (optionExists) {
          modelSelect.value = currentValue;
        } else {
          modelSelect.value = ''; // 如果之前的選擇無效，使用系統預設
    }
      } else {
        modelSelect.value = ''; // 使用系統預設
      }
    } else {
      // 如果後端載入失敗，使用預設選項（向後兼容）
      console.warn('無法從後端載入模型列表，使用預設選項');
      modelSelect.innerHTML = '';
      loadDefaultModelOptions(selectedProvider, modelSelect);
      modelSelect.disabled = false;
    }
  } catch (error) {
    console.error('載入模型列表失敗:', error);
    // 如果載入失敗，使用預設選項（向後兼容）
    modelSelect.innerHTML = '';
    loadDefaultModelOptions(selectedProvider, modelSelect);
    modelSelect.disabled = false;
  }
}

// 載入預設模型選項（向後兼容，當後端 API 不可用時使用）
function loadDefaultModelOptions(provider, modelSelect) {
  if (provider === 'gemini') {
    const geminiOptions = [
      { value: '', text: '使用系統預設 (gemini-2.5-flash)' },
      { value: 'gemini-2.5-pro', text: 'Gemini 2.5 Pro (最新)' },
      { value: 'gemini-2.5-flash', text: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-flash-lite', text: 'Gemini 2.5 Flash-Lite' },
      { value: 'gemini-2.0-flash-exp', text: 'Gemini 2.0 Flash (實驗版)' },
      { value: 'gemini-1.5-pro-latest', text: 'Gemini 1.5 Pro (最新版)' },
      { value: 'gemini-1.5-flash-latest', text: 'Gemini 1.5 Flash (最新版)' },
      { value: 'gemini-1.5-pro', text: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', text: 'Gemini 1.5 Flash' }
    ];
    
    geminiOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      modelSelect.appendChild(optionElement);
    });
  } else if (provider === 'openai') {
    const gptOptions = [
      { value: '', text: '使用系統預設' },
      { value: 'gpt-5.1', text: 'GPT-5.1 (最新)' },
      { value: 'gpt-5', text: 'GPT-5' },
      { value: 'gpt-4o', text: 'GPT-4o' },
      { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
      { value: 'gpt-4', text: 'GPT-4' },
      { value: 'gpt-4o-mini', text: 'GPT-4o Mini' },
      { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' },
      { value: 'o1-preview', text: 'O1 Preview' },
      { value: 'o1-mini', text: 'O1 Mini' }
    ];
    
    gptOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      modelSelect.appendChild(optionElement);
    });
  }
}

// 清除已保存的 API Key
async function clearSavedApiKey() {
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  const providerSelect = document.getElementById('llmProvider');
  if (!providerSelect) return;
  
  const provider = providerSelect.value;
  
  if (!confirm(`確定要清除 ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} 的 API 金鑰嗎？`)) {
    return;
  }
  
  try {
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    const response = await fetch(`${API_URL}/api/user/llm-keys/${ipPlanningUser.user_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ipPlanningToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: provider
      })
    });
    
    if (response.ok) {
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast('✅ API 金鑰已清除', 3000);
      }
      document.getElementById('savedKeyDisplay').style.display = 'none';
      const apiKeyInput = document.getElementById('llmApiKey');
      if (apiKeyInput) {
        apiKeyInput.value = '';
      }
    } else {
      const errorData = await response.json();
      if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
        window.ReelMindCommon.showToast(`清除失敗: ${errorData.error || '未知錯誤'}`, 3000);
      }
    }
  } catch (error) {
    console.error('清除 API Key 錯誤:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('清除失敗，請稍後再試', 3000);
    }
  }
}

// ===== 數據導出函數 =====

// 匯出用戶資料
async function exportUserData() {
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('請先登入', 3000);
    }
    return;
  }
  
  try {
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('正在匯出資料...', 3000);
    }
    
    const allData = {
      scripts: [],
      positioning: [],
      topics: [],
      conversations: [],
      ipPlanning: []
    };
    
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    
    try {
      const scriptsResponse = await fetch(`${API_URL}/api/scripts/my`, {
        headers: { 'Authorization': `Bearer ${ipPlanningToken}` }
      });
      if (scriptsResponse.ok) {
        const scriptsData = await scriptsResponse.json();
        allData.scripts = scriptsData.scripts || [];
      }
    } catch (e) {
      console.warn('獲取腳本失敗:', e);
    }
    
    try {
      const positioningResponse = await fetch(`${API_URL}/api/user/positioning/${ipPlanningUser.user_id}`, {
        headers: { 'Authorization': `Bearer ${ipPlanningToken}` }
      });
      if (positioningResponse.ok) {
        const positioningData = await positioningResponse.json();
        allData.positioning = positioningData.records || [];
      }
    } catch (e) {
      console.warn('獲取帳號定位失敗:', e);
    }
    
    try {
      const generationsResponse = await fetch(`${API_URL}/api/generations/${ipPlanningUser.user_id}`, {
        headers: { 'Authorization': `Bearer ${ipPlanningToken}` }
      });
      if (generationsResponse.ok) {
        const generationsData = await generationsResponse.json();
        allData.topics = generationsData.generations || [];
      }
    } catch (e) {
      console.warn('獲取選題數據失敗:', e);
    }
    
    try {
      const convResponse = await fetch(`${API_URL}/api/user/conversations/${ipPlanningUser.user_id}`, {
        headers: { 'Authorization': `Bearer ${ipPlanningToken}` }
      });
      if (convResponse.ok) {
        const convData = await convResponse.json();
        allData.conversations = convData.conversations || [];
      }
    } catch (e) {
      console.warn('獲取對話數據失敗:', e);
    }
    
    try {
      const ipPlanningResponse = await fetch(`${API_URL}/api/ip-planning/my`, {
        headers: { 'Authorization': `Bearer ${ipPlanningToken}` }
      });
      if (ipPlanningResponse.ok) {
        const ipPlanningData = await ipPlanningResponse.json();
        if (ipPlanningData.success && ipPlanningData.results) {
          allData.ipPlanning = ipPlanningData.results || [];
        }
      }
    } catch (e) {
      console.warn('獲取 IP 人設規劃數據失敗:', e);
    }
    
    // 生成 Excel 檔案（不同功能分不同分頁）
    generateUserDataExcel(allData, ipPlanningUser);
    
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('資料已匯出為 Excel 檔案', 3000);
    }
  } catch (error) {
    console.error('匯出資料失敗:', error);
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('匯出失敗，請稍後再試', 3000);
    }
  }
}

// 生成用戶數據 Excel（不同功能分不同分頁）
function generateUserDataExcel(data, userInfo) {
  // 檢查 SheetJS 是否可用
  if (typeof XLSX === 'undefined') {
    console.error('SheetJS 庫未載入，無法生成 Excel 檔案');
    if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
      window.ReelMindCommon.showToast('Excel 匯出功能需要載入額外庫，請稍後再試', 3000);
    }
    return;
  }
  
  // 創建工作簿
  const wb = XLSX.utils.book_new();
  
  // 1. 我的腳本分頁
  if (data.scripts && data.scripts.length > 0) {
    const scriptsData = data.scripts.map(script => ({
      'ID': script.id || '',
      '腳本名稱': script.title || script.script_name || '未命名',
      '平台': script.platform || '',
      '內容': script.content || '',
      '創建時間': formatTaiwanTime(script.created_at || '')
    }));
    const wsScripts = XLSX.utils.json_to_sheet(scriptsData);
    XLSX.utils.book_append_sheet(wb, wsScripts, '我的腳本');
  } else {
    // 即使沒有數據也創建分頁
    const wsScripts = XLSX.utils.aoa_to_sheet([['ID', '腳本名稱', '平台', '內容', '創建時間'], ['無數據']]);
    XLSX.utils.book_append_sheet(wb, wsScripts, '我的腳本');
  }
  
  // 2. 帳號定位分頁
  if (data.positioning && data.positioning.length > 0) {
    const positioningData = data.positioning.map(record => ({
      'ID': record.id || '',
      '編號': record.record_number || '',
      '內容': record.content || '',
      '創建時間': formatTaiwanTime(record.created_at || '')
    }));
    const wsPositioning = XLSX.utils.json_to_sheet(positioningData);
    XLSX.utils.book_append_sheet(wb, wsPositioning, '帳號定位');
  } else {
    const wsPositioning = XLSX.utils.aoa_to_sheet([['ID', '編號', '內容', '創建時間'], ['無數據']]);
    XLSX.utils.book_append_sheet(wb, wsPositioning, '帳號定位');
  }
  
  // 3. 選題內容分頁
  if (data.topics && data.topics.length > 0) {
    const topicsData = data.topics.map(topic => ({
      'ID': topic.id || '',
      '選題名稱': topic.topic || '',
      '平台': topic.platform || '',
      '內容': topic.content || '',
      '創建時間': formatTaiwanTime(topic.created_at || '')
    }));
    const wsTopics = XLSX.utils.json_to_sheet(topicsData);
    XLSX.utils.book_append_sheet(wb, wsTopics, '選題內容');
  } else {
    const wsTopics = XLSX.utils.aoa_to_sheet([['ID', '選題名稱', '平台', '內容', '創建時間'], ['無數據']]);
    XLSX.utils.book_append_sheet(wb, wsTopics, '選題內容');
  }
  
  // 4. 對話記錄分頁
  if (data.conversations && data.conversations.length > 0) {
    const conversationsData = data.conversations.map(conv => ({
      'ID': conv.id || '',
      '對話類型': conv.conversation_type || '',
      '摘要': conv.summary || '',
      '創建時間': formatTaiwanTime(conv.created_at || '')
    }));
    const wsConversations = XLSX.utils.json_to_sheet(conversationsData);
    XLSX.utils.book_append_sheet(wb, wsConversations, '對話記錄');
  } else {
    const wsConversations = XLSX.utils.aoa_to_sheet([['ID', '對話類型', '摘要', '創建時間'], ['無數據']]);
    XLSX.utils.book_append_sheet(wb, wsConversations, '對話記錄');
  }
  
  // 5. IP人設規劃分頁
  if (data.ipPlanning && data.ipPlanning.length > 0) {
    // 按類型分組
    const ipPlanningByType = {
      profile: [],
      plan: [],
      scripts: []
    };
    
    data.ipPlanning.forEach(result => {
      const type = result.result_type || 'profile';
      if (ipPlanningByType[type]) {
        ipPlanningByType[type].push(result);
      }
    });
    
    // 帳號定位 (Profile)
    if (ipPlanningByType.profile.length > 0) {
      const profileData = ipPlanningByType.profile.map(result => ({
        'ID': result.id || '',
        '標題': result.title || '帳號定位',
        '內容': (result.content || '').replace(/<[^>]*>/g, ''), // 移除 HTML 標籤
        '創建時間': formatTaiwanTime(result.created_at || '')
      }));
      const wsProfile = XLSX.utils.json_to_sheet(profileData);
      XLSX.utils.book_append_sheet(wb, wsProfile, 'IP-帳號定位');
    } else {
      const wsProfile = XLSX.utils.aoa_to_sheet([['ID', '標題', '內容', '創建時間'], ['無數據']]);
      XLSX.utils.book_append_sheet(wb, wsProfile, 'IP-帳號定位');
    }
    
    // 選題方向 (Plan)
    if (ipPlanningByType.plan.length > 0) {
      const planData = ipPlanningByType.plan.map(result => ({
        'ID': result.id || '',
        '標題': result.title || '選題方向（影片類型配比）',
        '內容': (result.content || '').replace(/<[^>]*>/g, ''),
        '創建時間': formatTaiwanTime(result.created_at || '')
      }));
      const wsPlan = XLSX.utils.json_to_sheet(planData);
      XLSX.utils.book_append_sheet(wb, wsPlan, 'IP-選題方向');
    } else {
      const wsPlan = XLSX.utils.aoa_to_sheet([['ID', '標題', '內容', '創建時間'], ['無數據']]);
      XLSX.utils.book_append_sheet(wb, wsPlan, 'IP-選題方向');
    }
    
    // 一週腳本 (Scripts)
    if (ipPlanningByType.scripts.length > 0) {
      const scriptsData = ipPlanningByType.scripts.map(result => ({
        'ID': result.id || '',
        '標題': result.title || '一週腳本',
        '內容': (result.content || '').replace(/<[^>]*>/g, ''),
        '創建時間': formatTaiwanTime(result.created_at || '')
      }));
      const wsScripts = XLSX.utils.json_to_sheet(scriptsData);
      XLSX.utils.book_append_sheet(wb, wsScripts, 'IP-一週腳本');
    } else {
      const wsScripts = XLSX.utils.aoa_to_sheet([['ID', '標題', '內容', '創建時間'], ['無數據']]);
      XLSX.utils.book_append_sheet(wb, wsScripts, 'IP-一週腳本');
    }
  } else {
    // 即使沒有數據也創建分頁
    const wsProfile = XLSX.utils.aoa_to_sheet([['ID', '標題', '內容', '創建時間'], ['無數據']]);
    XLSX.utils.book_append_sheet(wb, wsProfile, 'IP-帳號定位');
    const wsPlan = XLSX.utils.aoa_to_sheet([['ID', '標題', '內容', '創建時間'], ['無數據']]);
    XLSX.utils.book_append_sheet(wb, wsPlan, 'IP-選題方向');
    const wsScripts = XLSX.utils.aoa_to_sheet([['ID', '標題', '內容', '創建時間'], ['無數據']]);
    XLSX.utils.book_append_sheet(wb, wsScripts, 'IP-一週腳本');
  }
  
  // 生成 Excel 檔案並下載
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `aijob_user_data_${timestamp}.xlsx`);
}

// 清除本地快取
function clearUserData() {
  if (!confirm('確定要清除本地快取嗎？此操作無法復原。')) {
    return;
  }
  
  const token = localStorage.getItem('ipPlanningToken');
  const user = localStorage.getItem('ipPlanningUser');
  
  localStorage.clear();
  
  if (token) localStorage.setItem('ipPlanningToken', token);
  if (user) localStorage.setItem('ipPlanningUser', user);
  
  if (window.ReelMindCommon && window.ReelMindCommon.showToast) {
    window.ReelMindCommon.showToast('本地快取已清除', 3000);
  }
  
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// ===== 使用統計函數 =====

// 載入使用統計
async function loadUsageStatsForUserDB() {
  if (!ipPlanningToken || !ipPlanningUser || !ipPlanningUser.user_id) {
    return;
  }
  
  try {
    const scripts = getLocalScripts();
    const totalScriptsEl = document.getElementById('totalScripts');
    if (totalScriptsEl) {
      totalScriptsEl.textContent = scripts.length;
    }
    
    const API_URL = window.APP_CONFIG?.API_BASE || 'https://api.aijob.com.tw';
    
    try {
      const positioningResponse = await fetch(`${API_URL}/api/user/positioning/${ipPlanningUser.user_id}`, {
        headers: {'Authorization': `Bearer ${ipPlanningToken}`}
      });
      if (positioningResponse.ok) {
        const positioningData = await positioningResponse.json();
        const totalPositioningEl = document.getElementById('totalPositioning');
        if (totalPositioningEl) {
          totalPositioningEl.textContent = positioningData.records?.length || 0;
        }
      }
    } catch (e) {
      console.warn('獲取帳號定位數失敗:', e);
    }
    
    try {
      const convResponse = await fetch(`${API_URL}/api/user/conversations/${ipPlanningUser.user_id}`, {
        headers: {'Authorization': `Bearer ${ipPlanningToken}`}
      });
      if (convResponse.ok) {
        const convData = await convResponse.json();
        const topicRecords = convData.conversations?.filter(c => c.mode?.includes('選題') || c.conversation_type === 'topic_selection') || [];
        const totalTopicsEl = document.getElementById('totalTopics');
        const totalConversationsEl = document.getElementById('totalConversations');
        if (totalTopicsEl) {
          totalTopicsEl.textContent = topicRecords.length;
        }
        if (totalConversationsEl) {
          totalConversationsEl.textContent = convData.conversations?.length || 0;
        }
      }
    } catch (e) {
      console.warn('獲取對話數失敗:', e);
    }
  } catch (error) {
    console.error('載入統計失敗:', error);
  }
}

// 所有 userDB 相關函數已完成

