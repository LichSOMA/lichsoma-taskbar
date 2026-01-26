// LichSOMA's Taskbar - Screen (GM Screen / Player Screen)

// 스크린 데이터 저장
let screenTabs = [
  { id: 'tab-1', name: '기본', color: 'rgba(64, 64, 64, 0.5)', items: [] }
];
let activeTabId = 'tab-1';
let screenConfig = {
  columns: 20,
  rows: 12
};
let gridVisible = true; // 격자 표시 여부

// localStorage에서 스크린 탭 불러오기
function loadScreenItems() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  const saved = localStorage.getItem(`lichsoma-taskbar-screen-tabs-${worldId}-${userId}`);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      screenTabs = data.tabs || [{ id: 'tab-1', name: '기본', color: 'rgba(64, 64, 64, 0.5)', items: [] }];
      activeTabId = data.activeTabId || screenTabs[0].id;
      
      // 기존 탭에 color가 없으면 기본값 추가
      screenTabs.forEach(tab => {
        if (!tab.color) {
          tab.color = 'rgba(64, 64, 64, 0.5)';
        }
      });
    } catch (e) {
      screenTabs = [{ id: 'tab-1', name: '기본', color: 'rgba(64, 64, 64, 0.5)', items: [] }];
      activeTabId = 'tab-1';
    }
  }
}

// localStorage에 스크린 탭 저장
function saveScreenItems() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  const data = {
    tabs: screenTabs,
    activeTabId: activeTabId
  };
  localStorage.setItem(`lichsoma-taskbar-screen-tabs-${worldId}-${userId}`, JSON.stringify(data));
}

// 현재 활성 탭 가져오기
function getActiveTab() {
  return screenTabs.find(tab => tab.id === activeTabId) || screenTabs[0];
}

// localStorage에서 스크린 설정 불러오기
function loadScreenConfig() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  const saved = localStorage.getItem(`lichsoma-taskbar-screen-config-${worldId}-${userId}`);
  if (saved) {
    try {
      screenConfig = JSON.parse(saved);
    } catch (e) {
      screenConfig = { columns: 20, rows: 12 };
    }
  }
}

// localStorage에 스크린 설정 저장
function saveScreenConfig() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  localStorage.setItem(`lichsoma-taskbar-screen-config-${worldId}-${userId}`, JSON.stringify(screenConfig));
}

// localStorage에서 격자 표시 설정 불러오기
function loadGridVisible() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  const saved = localStorage.getItem(`lichsoma-taskbar-grid-visible-${worldId}-${userId}`);
  if (saved !== null) {
    try {
      gridVisible = JSON.parse(saved);
    } catch (e) {
      gridVisible = true;
    }
  }
}

// localStorage에 격자 표시 설정 저장
function saveGridVisible() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  localStorage.setItem(`lichsoma-taskbar-grid-visible-${worldId}-${userId}`, JSON.stringify(gridVisible));
}

Hooks.once('ready', () => {
  loadScreenItems();
  loadScreenConfig();
  loadGridVisible();
  
  // 저널 페이지 업데이트 감지 - 스크린이 열려있을 때만 즉시 갱신
  // (닫혀있을 때는 스크린을 열 때 자동으로 최신 데이터로 업데이트됨)
  Hooks.on('updateJournalEntryPage', (page, changes, options, userId) => {
    const panel = document.getElementById('taskbar-screen-panel');
    if (panel && !panel.classList.contains('hidden')) {
      updateScreenContent();
    }
  });
  
  // 액터 업데이트 감지 - 스크린이 열려있을 때만 즉시 갱신
  // (닫혀있을 때는 스크린을 열 때 자동으로 최신 데이터로 업데이트됨)
  Hooks.on('updateActor', (actor, changes, options, userId) => {
    const panel = document.getElementById('taskbar-screen-panel');
    if (panel && !panel.classList.contains('hidden')) {
      updateScreenContent();
    }
  });
  
  // 매크로 업데이트 감지 - 스크린이 열려있을 때만 즉시 갱신
  // (닫혀있을 때는 스크린을 열 때 자동으로 최신 데이터로 업데이트됨)
  Hooks.on('updateMacro', (macro, changes, options, userId) => {
    const panel = document.getElementById('taskbar-screen-panel');
    if (panel && !panel.classList.contains('hidden')) {
      updateScreenContent();
    }
  });
});

// 스크린 패널 생성
window.createScreenPanel = function() {
  const panel = document.createElement('div');
  panel.id = 'taskbar-screen-panel';
  panel.className = 'taskbar-screen-panel hidden';
  
  panel.innerHTML = `
    <div class="screen-tabs-sidebar" id="screen-tabs-sidebar">
      <div class="screen-tabs-list" id="screen-tabs-list"></div>
    </div>
    <div class="screen-main-content">
      <div class="screen-header">
        <h3 class="screen-title" id="screen-title">${game.user.isGM ? game.i18n.localize('Taskbar.GMScreen') : game.i18n.localize('Taskbar.PlayerScreen')}</h3>
        <div class="screen-header-controls">
          <button class="screen-grid-toggle-btn" id="screen-grid-toggle-btn" title="${game.i18n.localize('Taskbar.ToggleGrid')}">
            <i class="fa-solid fa-border-all"></i>
          </button>
          <button class="screen-config-btn" title="${game.i18n.localize('Taskbar.ScreenSizeSettings')}">
            <i class="fa-solid fa-gear"></i>
          </button>
          <button class="screen-clear-btn" title="${game.i18n.localize('Taskbar.ClearCurrentTab')}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="screen-content" id="screen-content">
        <div class="screen-empty-message">
          <i class="fa-solid fa-table-cells-large" style="font-size: 48px; opacity: 0.3; margin-bottom: 10px;"></i>
          <p>액터 시트나 저널을 드래그하여 추가하세요</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // 스크린 크기 적용
  applyScreenSize();
  
  // 탭 렌더링
  renderTabsSidebar();
  
  // 격자 토글 버튼
  const gridToggleBtn = panel.querySelector('#screen-grid-toggle-btn');
  
  // 초기 상태 적용
  const content = document.getElementById('screen-content');
  if (content && !gridVisible) {
    content.classList.add('force-show-grid');
    const icon = gridToggleBtn.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-border-none';
  }
  
  gridToggleBtn.addEventListener('click', () => {
    if (content) {
      gridVisible = !gridVisible;
      content.classList.toggle('force-show-grid');
      const icon = gridToggleBtn.querySelector('i');
      if (content.classList.contains('force-show-grid')) {
        icon.className = 'fa-solid fa-border-none';
      } else {
        icon.className = 'fa-solid fa-border-all';
      }
      saveGridVisible();
    }
  });
  
  // 스크린 크기 설정 버튼
  const configBtn = panel.querySelector('.screen-config-btn');
  configBtn.addEventListener('click', () => {
    openScreenConfigDialog();
  });
  
  // 모두 제거 버튼
  const clearBtn = panel.querySelector('.screen-clear-btn');
  clearBtn.addEventListener('click', () => {
    Dialog.confirm({
      title: game.i18n.localize('Taskbar.ClearCurrentTab'),
      content: `<p>${game.i18n.localize('Taskbar.ClearCurrentTab')}?</p>`,
      yes: () => {
        const activeTab = getActiveTab();
        if (activeTab) {
          activeTab.items = [];
          saveScreenItems();
          updateScreenContent();
        }
      },
      defaultYes: false
    });
    // 다이얼로그가 렌더링된 후 z-index 설정
    setTimeout(() => {
      const dialogs = document.querySelectorAll('.window-app');
      dialogs.forEach(dialog => {
        const title = dialog.querySelector('.window-header h4')?.textContent;
        if (title === game.i18n.localize('Taskbar.ClearCurrentTab')) {
          dialog.style.zIndex = '10000';
        }
      });
    }, 100);
  });
  
  // 드롭 이벤트 설정
  setupScreenDropZone(panel);
  
  // 초기 컨텐츠 업데이트
  updateScreenContent();
};

// 스크린 크기 적용
function applyScreenSize() {
  const content = document.getElementById('screen-content');
  if (!content) return;
  
  const width = screenConfig.columns * 50;
  const height = screenConfig.rows * 50;
  
  content.style.width = `${width}px`;
  content.style.height = `${height}px`;
  content.style.gridTemplateColumns = `repeat(${screenConfig.columns}, 50px)`;
  content.style.gridTemplateRows = `repeat(${screenConfig.rows}, 50px)`;
  
  // 헤더도 같은 너비로
  const header = document.querySelector('.screen-header');
  if (header) {
    header.style.width = `${width}px`;
  }
}

// 탭 사이드바 렌더링
function renderTabsSidebar() {
  const tabsList = document.getElementById('screen-tabs-list');
  if (!tabsList) return;
  
  tabsList.innerHTML = '';
  
  screenTabs.forEach((tab, index) => {
    const tabBtn = document.createElement('button');
    tabBtn.className = 'screen-tab-btn' + (tab.id === activeTabId ? ' active' : '');
    tabBtn.dataset.tabId = tab.id;
    
    // 활성 탭은 투명도 0.75로 강조
    if (tab.id === activeTabId) {
      const color = tab.color || 'rgba(64, 64, 64, 0.5)';
      const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (rgbaMatch) {
        tabBtn.style.background = `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, 0.85)`;
      } else {
        tabBtn.style.background = tab.color;
      }
    } else {
      tabBtn.style.background = tab.color || 'rgba(64, 64, 64, 0.5)';
    }
    
    tabBtn.innerHTML = `
      <span class="screen-tab-name">${tab.name}</span>
    `;
    
    // 탭 클릭 - 활성화
    tabBtn.addEventListener('click', () => {
      activeTabId = tab.id;
      saveScreenItems();
      renderTabsSidebar();
      updateScreenContent();
      updateScreenTitle();
    });
    
    // 우클릭 - 이름 수정/삭제
    tabBtn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openEditTabDialog(tab);
    });
    
    tabsList.appendChild(tabBtn);
  });
  
  // + 버튼 추가
  const addBtn = document.createElement('button');
  addBtn.className = 'screen-tab-add-btn';
  addBtn.title = game.i18n.localize('Taskbar.AddNewTab');
  addBtn.innerHTML = `
    <i class="fa-solid fa-plus"></i>
  `;
  addBtn.addEventListener('click', () => {
    openAddTabDialog();
  });
  tabsList.appendChild(addBtn);
  
  // 헤더 제목 업데이트
  updateScreenTitle();
}

// 스크린 제목 업데이트
function updateScreenTitle() {
  const titleElement = document.getElementById('screen-title');
  if (!titleElement) return;
  
  const activeTab = getActiveTab();
  const baseTitle = game.user.isGM ? game.i18n.localize('Taskbar.GMScreen') : game.i18n.localize('Taskbar.PlayerScreen');
  
  if (activeTab) {
    titleElement.textContent = `${baseTitle}: ${activeTab.name}`;
  } else {
    titleElement.textContent = baseTitle;
  }
}

// 새 탭 추가 다이얼로그
function openAddTabDialog() {
  new Dialog({
    title: game.i18n.localize('Taskbar.AddNewTab'),
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.TabName')}</label>
          <input type="text" name="tabName" value="${game.i18n.localize('Taskbar.NewTab')}" autofocus />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.TabColor')}</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="color" name="tabColor" value="#404040" style="width: 60px; height: 32px;" />
            <input type="text" name="tabColorCode" value="#404040" placeholder="#RRGGBB" style="flex: 1; font-family: monospace;" />
          </div>
          <p class="hint">${game.i18n.localize('Taskbar.TabColorHint')}</p>
        </div>
      </form>
    `,
    buttons: {
      add: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('Taskbar.Save'),
        callback: (html) => {
          const name = html.find('[name="tabName"]').val().trim();
          let color = html.find('[name="tabColorCode"]').val().trim();
          
          // 색상 코드 검증
          if (!color.startsWith('#')) {
            color = '#' + color;
          }
          if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            ui.notifications.warn(game.i18n.localize('Taskbar.InvalidColorCode'));
            return;
          }
          
          if (name) {
            // hex를 rgba로 변환하고 투명도 0.5 적용
            const rgba = hexToRgba(color, 0.5);
            const newTab = {
              id: `tab-${Date.now()}`,
              name: name,
              color: rgba,
              items: []
            };
            screenTabs.push(newTab);
            activeTabId = newTab.id;
            saveScreenItems();
            renderTabsSidebar();
            updateScreenContent();
          }
        }
      }
    },
    default: 'add',
    render: (html) => {
      // color picker와 텍스트 필드 동기화
      const colorPicker = html.find('[name="tabColor"]');
      const colorCode = html.find('[name="tabColorCode"]');
      
      colorPicker.on('input', (e) => {
        colorCode.val(e.target.value);
      });
      
      colorCode.on('input', (e) => {
        let value = e.target.value.trim();
        if (!value.startsWith('#')) {
          value = '#' + value;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          colorPicker.val(value);
        }
      });
    }
  }).render(true);
}

// 탭 수정 다이얼로그
function openEditTabDialog(tab) {
  // 현재 색상을 hex로 변환
  const currentColor = rgbaToHex(tab.color || 'rgba(64, 64, 64, 0.5)');
  
  new Dialog({
    title: game.i18n.localize('Taskbar.TabSettings'),
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.TabName')}</label>
          <input type="text" name="tabName" value="${tab.name}" autofocus />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.TabColor')}</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="color" name="tabColor" value="${currentColor}" style="width: 60px; height: 32px;" />
            <input type="text" name="tabColorCode" value="${currentColor}" placeholder="#RRGGBB" style="flex: 1; font-family: monospace;" />
          </div>
          <p class="hint">${game.i18n.localize('Taskbar.TabColorHint')}</p>
        </div>
      </form>
    `,
    buttons: {
      save: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('Taskbar.Save'),
        callback: (html) => {
          const name = html.find('[name="tabName"]').val().trim();
          let color = html.find('[name="tabColorCode"]').val().trim();
          
          // 색상 코드 검증
          if (!color.startsWith('#')) {
            color = '#' + color;
          }
          if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            ui.notifications.warn(game.i18n.localize('Taskbar.InvalidColorCode'));
            return;
          }
          
          if (name) {
            tab.name = name;
            tab.color = hexToRgba(color, 0.5);
            saveScreenItems();
            renderTabsSidebar();
          }
        }
      },
      delete: {
        icon: '<i class="fas fa-trash"></i>',
        label: game.i18n.localize('Taskbar.DeleteTab'),
        callback: () => {
          if (screenTabs.length <= 1) {
            ui.notifications.warn(game.i18n.localize('Taskbar.MinimumTabWarning'));
            return;
          }
          
          // 바로 삭제
          screenTabs = screenTabs.filter(t => t.id !== tab.id);
          if (activeTabId === tab.id) {
            activeTabId = screenTabs[0].id;
          }
          saveScreenItems();
          renderTabsSidebar();
          updateScreenContent();
        }
      }
    },
    default: 'save',
    render: (html) => {
      // color picker와 텍스트 필드 동기화
      const colorPicker = html.find('[name="tabColor"]');
      const colorCode = html.find('[name="tabColorCode"]');
      
      colorPicker.on('input', (e) => {
        colorCode.val(e.target.value);
      });
      
      colorCode.on('input', (e) => {
        let value = e.target.value.trim();
        if (!value.startsWith('#')) {
          value = '#' + value;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          colorPicker.val(value);
        }
      });
    }
  }).render(true);
}

// hex 색상을 rgba로 변환
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// rgba 색상을 hex로 변환
function rgbaToHex(rgba) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#404040';
  
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// 스크린 크기 설정 다이얼로그
function openScreenConfigDialog() {
  const dialogTitle = game.i18n.localize('Taskbar.ScreenSizeSettings');
  const dialog = new Dialog({
    title: dialogTitle,
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.ScreenColumns')}</label>
          <input type="number" name="columns" value="${screenConfig.columns}" min="10" max="40" step="1" />
          <p class="hint">${game.i18n.localize('Taskbar.ScreenColumnsHint')}</p>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.ScreenRows')}</label>
          <input type="number" name="rows" value="${screenConfig.rows}" min="8" max="24" step="1" />
          <p class="hint">${game.i18n.localize('Taskbar.ScreenRowsHint')}</p>
        </div>
      </form>
    `,
    buttons: {
      save: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('Taskbar.Save'),
        callback: (html) => {
          const newColumns = parseInt(html.find('[name="columns"]').val());
          const newRows = parseInt(html.find('[name="rows"]').val());
          
          screenConfig.columns = Math.max(10, Math.min(40, newColumns));
          screenConfig.rows = Math.max(8, Math.min(24, newRows));
          
          saveScreenConfig();
          applyScreenSize();
          updateScreenContent();
          
          ui.notifications.info(`${game.i18n.localize('Taskbar.ScreenSizeChanged')}: ${screenConfig.columns}×${screenConfig.rows} (${screenConfig.columns * 50}px × ${screenConfig.rows * 50}px)`);
        }
      }
    },
    default: 'save'
  });
  dialog.render(true);
  // 다이얼로그가 렌더링된 후 z-index 설정
  setTimeout(() => {
    const dialogs = document.querySelectorAll('.window-app');
    dialogs.forEach(dialogElement => {
      const title = dialogElement.querySelector('.window-header h4')?.textContent;
      if (title === dialogTitle) {
        dialogElement.style.zIndex = '10000';
      }
    });
  }, 100);
}

// 스크린 토글
window.toggleScreen = function(screenBtn) {
  const screenPanel = document.getElementById('taskbar-screen-panel');
  const systemPanel = document.getElementById('taskbar-system-menu-panel');
  const playerPanel = document.getElementById('taskbar-player-list-panel');
  const logoBtn = document.querySelector('.taskbar-logo');
  const playersBtn = document.querySelector('#taskbar-players-btn');
  
  if (screenPanel.classList.contains('hidden')) {
    // 스크린 열기
    screenPanel.classList.remove('hidden');
    if (screenBtn) {
      screenBtn.classList.add('active');
      // 아이콘 변경: book → book-open
      const icon = screenBtn.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid fa-book-open';
      }
    }
    
    // 다른 패널 닫기
    if (systemPanel && !systemPanel.classList.contains('hidden')) {
      systemPanel.classList.add('hidden');
      if (logoBtn) logoBtn.classList.remove('active');
    }
    if (playerPanel && !playerPanel.classList.contains('hidden')) {
      playerPanel.classList.add('hidden');
      if (playersBtn) playersBtn.classList.remove('active');
    }
    
    // 스크린을 열 때 최신 데이터로 업데이트 (저널/액터/매크로 수정 사항 반영)
    updateScreenContent();
  } else {
    // 스크린 닫기
    screenPanel.classList.add('hidden');
    if (screenBtn) {
      screenBtn.classList.remove('active');
      // 아이콘 변경: book-open → book
      const icon = screenBtn.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid fa-book';
      }
    }
  }
};

// 드롭존 설정
function setupScreenDropZone(panel) {
  const content = panel.querySelector('#screen-content');
  let dropPreview = null;
  let draggedItemType = null;
  
  // dragstart 이벤트로 타입 감지
  document.addEventListener('dragstart', (e) => {
    draggedItemType = null;
    
    // Actor 디렉토리에서 드래그 (클래스로 확인)
    const actorElement = e.target.closest('.directory-item.actor');
    if (actorElement) {
      draggedItemType = 'Actor';
      return;
    }
    
    // Journal 페이지에서 드래그
    const journalPageElement = e.target.closest('.directory-item.page-entry, .page-heading');
    if (journalPageElement) {
      draggedItemType = 'JournalEntryPage';
      return;
    }
    
    // Journal 디렉토리에서 드래그 (전체 저널)
    const journalElement = e.target.closest('.directory-item.journal');
    if (journalElement) {
      draggedItemType = 'JournalEntry';
      return;
    }
    
    // Macro 디렉토리에서 드래그
    const macroElement = e.target.closest('.directory-item.macro');
    if (macroElement) {
      draggedItemType = 'Macro';
      return;
    }
    
    // 시스템 메뉴나 즐겨찾기에서 드래그
    const searchItem = e.target.closest('.search-result-item, .favorite-item');
    if (searchItem) {
      const icon = searchItem.querySelector('i');
      if (icon && icon.classList.contains('fa-user')) {
        draggedItemType = 'Actor';
      } else if (icon && icon.classList.contains('fa-book')) {
        draggedItemType = 'JournalEntry';
      } else if (icon && icon.classList.contains('fa-code')) {
        draggedItemType = 'Macro';
      }
    }
  }, true);
  
  document.addEventListener('dragend', () => {
    draggedItemType = null;
  }, true);
  
  content.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // 드롭 위치 계산
    const rect = content.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 액터는 6x4, 저널은 5x5, 매크로는 1x1
    let colSpan = 5, rowSpan = 5;
    if (draggedItemType === 'Actor') {
      colSpan = 6;
      rowSpan = 4;
    } else if (draggedItemType === 'Macro') {
      colSpan = 1;
      rowSpan = 1;
    }
    
    const dropCol = Math.max(1, Math.min(screenConfig.columns - (colSpan - 1), Math.floor(x / 50) + 1));
    const dropRow = Math.max(1, Math.min(screenConfig.rows - (rowSpan - 1), Math.floor(y / 50) + 1));
    
    // 미리보기 오버레이 생성 또는 업데이트
    if (!dropPreview) {
      dropPreview = document.createElement('div');
      dropPreview.className = 'screen-drop-preview';
      content.appendChild(dropPreview);
    }
    
    dropPreview.style.gridColumn = `${dropCol} / span ${colSpan}`;
    dropPreview.style.gridRow = `${dropRow} / span ${rowSpan}`;
  });
  
  content.addEventListener('dragleave', (e) => {
    if (e.target === content) {
      if (dropPreview) {
        dropPreview.remove();
        dropPreview = null;
      }
    }
  });
  
  content.addEventListener('drop', async (e) => {
    e.preventDefault();
    
    // 미리보기 제거
    if (dropPreview) {
      dropPreview.remove();
      dropPreview = null;
    }
    
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    // 드롭 위치를 그리드 좌표로 변환
    const rect = content.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    try {
      const dragData = JSON.parse(data);
      
      // 액터는 6x4, 저널은 5x5, 매크로는 1x1
      let colSpan = 5, rowSpan = 5;
      if (dragData.type === 'Actor') {
        colSpan = 6;
        rowSpan = 4;
      } else if (dragData.type === 'Macro') {
        colSpan = 1;
        rowSpan = 1;
      }
      
      const dropCol = Math.max(1, Math.min(screenConfig.columns - (colSpan - 1), Math.floor(x / 50) + 1));
      const dropRow = Math.max(1, Math.min(screenConfig.rows - (rowSpan - 1), Math.floor(y / 50) + 1));
      
      // Actor, JournalEntry, JournalEntryPage, Macro 허용
      if (dragData.type === 'Actor') {
        const doc = await fromUuid(dragData.uuid);
        if (doc) {
          const gridPosition = { col: dropCol, row: dropRow, colSpan: 6, rowSpan: 4 };
          addItemToScreen(doc, null, gridPosition);
        }
      } else if (dragData.type === 'JournalEntry') {
        // 저널 전체를 드래그한 경우 - 첫 번째 페이지 자동 선택
        const journal = await fromUuid(dragData.uuid);
        if (journal && journal.pages && journal.pages.size > 0) {
          const firstPage = journal.pages.contents[0];
          const gridPosition = { col: dropCol, row: dropRow, colSpan: 5, rowSpan: 5 };
          addItemToScreen(journal, firstPage, gridPosition);
        } else {
          ui.notifications.warn('저널에 페이지가 없습니다');
        }
      } else if (dragData.type === 'JournalEntryPage') {
        // 저널 페이지를 직접 드래그한 경우
        const page = await fromUuid(dragData.uuid);
        if (page && page.parent) {
          // 페이지의 부모 저널 가져오기
          const journal = page.parent;
          // 드롭 위치에 5x5 크기로 추가
          const gridPosition = { col: dropCol, row: dropRow, colSpan: 5, rowSpan: 5 };
          addItemToScreen(journal, page, gridPosition);
        }
      } else if (dragData.type === 'Macro') {
        // 매크로 드래그
        const macro = await fromUuid(dragData.uuid);
        if (macro) {
          const gridPosition = { col: dropCol, row: dropRow, colSpan: 1, rowSpan: 1 };
          addItemToScreen(macro, null, gridPosition);
        }
      }
    } catch (e) {
    }
  });
  
  // 빈 그리드 드래그로 메모 카드 생성
  let isCreatingNote = false;
  let startCol, startRow;
  let selectionOverlay = null;
  
  content.addEventListener('mousedown', (e) => {
    // 카드나 다른 요소를 클릭한 경우 무시
    if (e.target !== content && !e.target.classList.contains('screen-empty-message')) {
      return;
    }
    
    isCreatingNote = true;
    
    // 클릭한 위치를 그리드 좌표로 변환
    const rect = content.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    startCol = Math.floor(x / 50) + 1;
    startRow = Math.floor(y / 50) + 1;
    
    // 선택 영역 표시용 오버레이 생성
    selectionOverlay = document.createElement('div');
    selectionOverlay.className = 'screen-selection-overlay';
    selectionOverlay.style.gridColumn = `${startCol} / span 1`;
    selectionOverlay.style.gridRow = `${startRow} / span 1`;
    content.appendChild(selectionOverlay);
    
    // 격자 표시
    content.classList.add('show-grid');
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isCreatingNote || !selectionOverlay) return;
    
    const rect = content.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const currentCol = Math.floor(x / 50) + 1;
    const currentRow = Math.floor(y / 50) + 1;
    
    const minCol = Math.min(startCol, currentCol);
    const maxCol = Math.max(startCol, currentCol);
    const minRow = Math.min(startRow, currentRow);
    const maxRow = Math.max(startRow, currentRow);
    
    const colSpan = maxCol - minCol + 1;
    const rowSpan = maxRow - minRow + 1;
    
    selectionOverlay.style.gridColumn = `${minCol} / span ${colSpan}`;
    selectionOverlay.style.gridRow = `${minRow} / span ${rowSpan}`;
  });
  
  document.addEventListener('mouseup', (e) => {
    if (!isCreatingNote) return;
    isCreatingNote = false;
    
    if (selectionOverlay) {
      const rect = content.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const currentCol = Math.floor(x / 50) + 1;
      const currentRow = Math.floor(y / 50) + 1;
      
      const minCol = Math.min(startCol, currentCol);
      const maxCol = Math.max(startCol, currentCol);
      const minRow = Math.min(startRow, currentRow);
      const maxRow = Math.max(startRow, currentRow);
      
      const colSpan = maxCol - minCol + 1;
      const rowSpan = maxRow - minRow + 1;
      
      // 최소 크기 2x2
      if (colSpan >= 2 && rowSpan >= 2) {
        createNoteCard(minCol, minRow, colSpan, rowSpan);
      }
      
      selectionOverlay.remove();
      selectionOverlay = null;
      
      // 격자 숨김
      content.classList.remove('show-grid');
    }
  });
}

// 메모 카드 생성
async function createNoteCard(col, row, colSpan, rowSpan) {
  const activeTab = getActiveTab();
  if (!activeTab) return;
  
  const noteItem = {
    uuid: `Note.${Date.now()}`,
    type: 'Note',
    name: game.i18n.localize('Taskbar.Note'),
    icon: 'fa-solid fa-note-sticky',
    content: '',
    col: col,
    row: row,
    colSpan: colSpan,
    rowSpan: rowSpan
  };
  
  activeTab.items.push(noteItem);
  saveScreenItems();
  await updateScreenContent();
  
  // 생성 직후 편집 모드 활성화
  setTimeout(() => {
    const editor = document.querySelector(`.screen-note-editor[data-uuid="${noteItem.uuid}"]`);
    if (editor) {
      editor.contentEditable = 'true';
      editor.focus();
    }
  }, 100);
}

// 저널 페이지 선택 다이얼로그
function openJournalPageSelectDialog(journal) {
  const pages = journal.pages?.contents || [];
  
  if (pages.length === 0) {
    ui.notifications.warn(game.i18n.localize('Taskbar.NoPages'));
    return;
  }
  
  const pageOptions = pages.map(page => 
    `<option value="${page.id}">${page.name}</option>`
  ).join('');
  
  new Dialog({
    title: `${game.i18n.localize('Taskbar.PageSelect')}: ${journal.name}`,
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.Page')}</label>
          <select name="pageId" style="width: 100%;">
            ${pageOptions}
          </select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.PositionColumn')}</label>
          <input type="number" name="col" value="1" min="1" max="${screenConfig.columns}" />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.PositionRow')}</label>
          <input type="number" name="row" value="1" min="1" max="${screenConfig.rows}" />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.SizeColumns')}</label>
          <input type="number" name="colSpan" value="8" min="1" max="${screenConfig.columns}" />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize('Taskbar.SizeRows')}</label>
          <input type="number" name="rowSpan" value="6" min="1" max="${screenConfig.rows}" />
        </div>
      </form>
    `,
    buttons: {
      add: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('Taskbar.Add'),
        callback: (html) => {
          const pageId = html.find('[name="pageId"]').val();
          const col = parseInt(html.find('[name="col"]').val());
          const row = parseInt(html.find('[name="row"]').val());
          const colSpan = parseInt(html.find('[name="colSpan"]').val());
          const rowSpan = parseInt(html.find('[name="rowSpan"]').val());
          
          const page = journal.pages.get(pageId);
          if (page) {
            addItemToScreen(journal, page, { col, row, colSpan, rowSpan });
          }
        }
      }
    },
    default: 'add'
  }).render(true);
}

// 스크린에 아이템 추가
function addItemToScreen(doc, page = null, gridPosition = null) {
  const activeTab = getActiveTab();
  if (!activeTab) return;
  
  // 기본 그리드 위치 (액터는 6x4, 저널은 5x5, 매크로는 1x1)
  if (!gridPosition) {
    if (doc.documentName === 'Actor') {
      gridPosition = { col: 1, row: 1, colSpan: 6, rowSpan: 4 };
    } else if (doc.documentName === 'Macro') {
      gridPosition = { col: 1, row: 1, colSpan: 1, rowSpan: 1 };
    } else {
      gridPosition = { col: 1, row: 1, colSpan: 5, rowSpan: 5 };
    }
  }
  
  const item = {
    uuid: doc.uuid,
    type: doc.documentName,
    name: doc.name,
    icon: getDocumentIcon(doc),
    ...gridPosition,
    notes: '' // 액터 메모용
  };
  
  // 저널 페이지 정보 추가
  if (page) {
    item.pageId = page.id;
    item.pageName = page.name;
    // 페이지별 고유 키 생성
    item.uuid = `${doc.uuid}.JournalEntryPage.${page.id}`;
  }
  
  // 이미 존재하는지 확인
  if (activeTab.items.some(existing => existing.uuid === item.uuid)) {
    ui.notifications.warn('이미 스크린에 추가된 아이템입니다');
    return;
  }
  
  activeTab.items.push(item);
  saveScreenItems();
  updateScreenContent();
  
  ui.notifications.info(`스크린에 추가: ${doc.name}${page ? ` (${page.name})` : ''}`);
}

// 문서 아이콘 가져오기
function getDocumentIcon(doc) {
  if (doc.documentName === 'Actor') {
    return 'fa-solid fa-user';
  } else if (doc.documentName === 'JournalEntry') {
    return 'fa-solid fa-book-open';
  } else if (doc.documentName === 'Macro') {
    return 'fa-solid fa-code';
  }
  return 'fa-solid fa-file';
}

// 스크린에서 아이템 제거
function removeItemFromScreen(uuid) {
  const activeTab = getActiveTab();
  if (!activeTab) return;
  
  activeTab.items = activeTab.items.filter(item => item.uuid !== uuid);
  saveScreenItems();
  updateScreenContent();
}

// 스크린 컨텐츠 업데이트
async function updateScreenContent() {
  const content = document.getElementById('screen-content');
  if (!content) return;
  
  const activeTab = getActiveTab();
  if (!activeTab) return;
  
  content.innerHTML = '';
  
  // 그리드 레이아웃으로 아이템 표시
  for (const item of activeTab.items) {
    const card = document.createElement('div');
    card.className = 'screen-item-card';
    card.dataset.uuid = item.uuid;
    
    // 그리드 위치 적용
    card.style.gridColumn = `${item.col} / span ${item.colSpan}`;
    card.style.gridRow = `${item.row} / span ${item.rowSpan}`;
    
    // 메모 카드인 경우
    if (item.type === 'Note') {
      card.classList.add('screen-note-card');
      const noteName = item.name || game.i18n.localize('Taskbar.Note');
      card.innerHTML = `
        <div class="screen-item-header">
          <i class="fa-solid fa-note-sticky" data-drag-handle="true"></i>
          <span class="screen-item-name screen-note-name" data-drag-handle="true" contenteditable="false">${noteName}</span>
          <button class="screen-item-remove-btn" title="제거">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="screen-item-content">
          <div class="screen-note-editor" contenteditable="false" data-uuid="${item.uuid}" data-placeholder="${game.i18n.localize('Taskbar.NotePlaceholder')}">${item.content || ''}</div>
        </div>
        <div class="screen-item-resize-handle"></div>
      `;
      
      // 제거 버튼
      card.querySelector('.screen-item-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        removeItemFromScreen(item.uuid);
      });
      
      // 메모 제목 편집
      const noteNameElement = card.querySelector('.screen-note-name');
      
      // 더블클릭으로 제목 편집 모드 활성화
      noteNameElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        noteNameElement.contentEditable = 'true';
        noteNameElement.focus();
        // 텍스트 전체 선택
        const range = document.createRange();
        range.selectNodeContents(noteNameElement);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      
      // 제목 blur 시 저장
      noteNameElement.addEventListener('blur', () => {
        const newName = noteNameElement.textContent.trim();
        if (newName) {
          item.name = newName;
        } else {
          // 빈 제목이면 기본값으로 복원
          item.name = game.i18n.localize('Taskbar.Note');
          noteNameElement.textContent = item.name;
        }
        noteNameElement.contentEditable = 'false';
        saveScreenItems();
      });
      
      // 제목 Enter 키로 저장
      noteNameElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          noteNameElement.blur();
        }
        // Escape 키로 취소
        if (e.key === 'Escape') {
          noteNameElement.textContent = item.name || game.i18n.localize('Taskbar.Note');
          noteNameElement.contentEditable = 'false';
        }
      });
      
      // 메모 에디터
      const editor = card.querySelector('.screen-note-editor');
      
      // 더블클릭으로 편집 모드 활성화
      editor.addEventListener('dblclick', () => {
        editor.contentEditable = 'true';
        editor.focus();
      });
      
      // blur 시 저장 및 편집 모드 종료
      editor.addEventListener('blur', () => {
        item.content = editor.innerHTML;
        saveScreenItems();
        editor.contentEditable = 'false';
      });
      
      // 엔터 키로 저장
      editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          editor.blur(); // blur 이벤트가 저장 처리
        }
      });
      
      // 드래그로 위치 이동
      setupCardDrag(card, item);
      
      // 리사이즈 핸들
      setupCardResize(card, item);
      
      content.appendChild(card);
      continue;
    }
    
    // 매크로 카드인 경우
    if (item.type === 'Macro') {
      const macro = await fromUuid(item.uuid);
      if (!macro) {
        removeItemFromScreen(item.uuid);
        continue;
      }
      
      card.classList.add('screen-macro-card');
      const imgPath = macro.img || 'icons/svg/dice-target.svg';
      
      card.innerHTML = `
        <img src="${imgPath}" alt="${macro.name}" class="screen-macro-image" draggable="false" 
             data-tooltip="${macro.name}" data-tooltip-direction="UP"/>
      `;
      
      const macroImg = card.querySelector('.screen-macro-image');
      
      // 우클릭: 매크로 편집
      macroImg.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        macro.sheet.render(true);
      });
      
      // 드래그로 위치 이동 또는 삭제, 클릭으로 실행
      setupMacroDrag(card, item, macroImg, macro);
      
      content.appendChild(card);
      continue;
    }
    
    // UUID에서 실제 문서 UUID 추출 (페이지 정보 제거)
    const baseUuid = item.uuid.split('.JournalEntryPage.')[0];
    const doc = await fromUuid(baseUuid);
    
    if (!doc) {
      // 문서가 삭제된 경우
      removeItemFromScreen(item.uuid);
      continue;
    }
    
    // 저널 페이지인 경우 페이지 가져오기
    let page = null;
    if (item.pageId && doc.documentName === 'JournalEntry') {
      page = doc.pages.get(item.pageId);
      if (!page) {
        // 페이지가 삭제된 경우
        removeItemFromScreen(item.uuid);
        continue;
      }
    }
    
    // 권한 체크
    const canEdit = doc.testUserPermission(game.user, 'OWNER');
    
     // 컨텐츠 렌더링
     let itemContent = '';
     if (item.type === 'Actor') {
       itemContent = renderActorContent(doc, item.notes || '');
     } else if (page) {
       itemContent = await renderJournalPageContent(page);
     } else {
       itemContent = '<p class="screen-no-content">내용 없음</p>';
     }
    
    card.innerHTML = `
      <div class="screen-item-header">
        <i class="${item.icon}" data-drag-handle="true"></i>
        <span class="screen-item-name" data-drag-handle="true" data-clickable="true">${item.pageName || item.name}</span>
        <button class="screen-item-remove-btn" title="제거">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="screen-item-content">
        ${itemContent}
      </div>
      <div class="screen-item-resize-handle"></div>
    `;
    
    // 제거 버튼
    card.querySelector('.screen-item-remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeItemFromScreen(item.uuid);
    });
    
    // 헤더 클릭 시 시트 열기 (드래그 후에는 열리지 않도록)
    let isDragging = false;
    let mouseDownPos = null;
    const DRAG_THRESHOLD = 5; // 5px 이상 이동하면 드래그로 간주
    
    const headerElement = card.querySelector('.screen-item-header');
    const dragHandles = card.querySelectorAll('[data-drag-handle="true"]');
    
    // 드래그 감지를 위한 핸들러
    const mouseMoveHandler = (e) => {
      if (mouseDownPos) {
        const deltaX = Math.abs(e.clientX - mouseDownPos.x);
        const deltaY = Math.abs(e.clientY - mouseDownPos.y);
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isDragging = true;
        }
      }
    };
    
    const mouseUpHandler = () => {
      mouseDownPos = null;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    // 드래그 핸들에 mousedown 이벤트
    dragHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        isDragging = false;
        mouseDownPos = { x: e.clientX, y: e.clientY };
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      });
      
      // 클릭 시 시트 열기
      handle.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!isDragging) {
          if (page) {
            // 저널 시트를 해당 페이지로 열기
            doc.sheet.render(true, { pageId: item.pageId });
          } else {
            doc.sheet.render(true);
          }
        }
        // 다음 클릭을 위해 초기화
        setTimeout(() => {
          isDragging = false;
        }, 100);
      });
    });
    
    // 저널 페이지의 경우 컨텐츠 영역 더블클릭으로도 편집 모드 열기
    if (page) {
      const contentArea = card.querySelector('.screen-item-content');
      if (contentArea) {
        contentArea.addEventListener('dblclick', async (e) => {
          e.stopPropagation();
          // 저널 페이지를 바로 편집 모드로 열기
          try {
            await page.sheet.render(true, { editable: true });
          } catch (error) {
          }
        });
      }
    }
    
    // 액터 메모 편집 기능
    if (item.type === 'Actor') {
      const notesEditor = card.querySelector('.screen-actor-notes');
      if (notesEditor) {
        // 더블클릭으로 편집 모드 진입
        notesEditor.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          notesEditor.contentEditable = 'true';
          notesEditor.focus();
          // 커서를 끝으로 이동
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(notesEditor);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        });
        
        // blur 시 저장
        notesEditor.addEventListener('blur', () => {
          notesEditor.contentEditable = 'false';
          item.notes = notesEditor.innerHTML;
          saveScreenItems();
        });
        
        // Enter 키로 저장 (Shift+Enter는 줄바꿈)
        notesEditor.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            notesEditor.blur();
          }
        });
      }
    }
    
    // 드래그로 위치 이동
    setupCardDrag(card, item);
    
    // 리사이즈 핸들
    setupCardResize(card, item);
    
    content.appendChild(card);
  }
}

// 카드 드래그 설정
function setupCardDrag(card, item) {
  const dragHandles = card.querySelectorAll('[data-drag-handle="true"]');
  let isDragging = false;
  let startX, startY;
  let startCol, startRow;
  
  dragHandles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      // 제거 버튼을 클릭한 경우 드래그 시작 안 함
      if (e.target.closest('.screen-item-remove-btn')) {
        return;
      }
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startCol = item.col;
      startRow = item.row;
      
      card.style.opacity = '0.7';
      card.style.zIndex = '1000';
      
      // 격자 표시
      const content = document.getElementById('screen-content');
      if (content) content.classList.add('show-grid');
      
      e.preventDefault();
    });
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // 50px = 1 그리드 셀
    const colOffset = Math.round(deltaX / 50);
    const rowOffset = Math.round(deltaY / 50);
    
    const newCol = Math.max(1, Math.min(screenConfig.columns - item.colSpan + 1, startCol + colOffset));
    const newRow = Math.max(1, Math.min(screenConfig.rows - item.rowSpan + 1, startRow + rowOffset));
    
    card.style.gridColumn = `${newCol} / span ${item.colSpan}`;
    card.style.gridRow = `${newRow} / span ${item.rowSpan}`;
  });
  
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const colOffset = Math.round(deltaX / 50);
    const rowOffset = Math.round(deltaY / 50);
    
    item.col = Math.max(1, Math.min(screenConfig.columns - item.colSpan + 1, startCol + colOffset));
    item.row = Math.max(1, Math.min(screenConfig.rows - item.rowSpan + 1, startRow + rowOffset));
    
    card.style.opacity = '';
    card.style.zIndex = '';
    
    // 격자 숨김
    const content = document.getElementById('screen-content');
    if (content) content.classList.remove('show-grid');
    
    saveScreenItems();
  });
}

// 카드 리사이즈 설정
function setupCardResize(card, item) {
  const resizeHandle = card.querySelector('.screen-item-resize-handle');
  let isResizing = false;
  let startX, startY;
  let startColSpan, startRowSpan;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startColSpan = item.colSpan;
    startRowSpan = item.rowSpan;
    
    card.style.opacity = '0.7';
    card.style.zIndex = '1000';
    
    // 격자 표시
    const content = document.getElementById('screen-content');
    if (content) content.classList.add('show-grid');
    
    e.preventDefault();
    e.stopPropagation();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // 50px = 1 그리드 셀
    const colSpanOffset = Math.round(deltaX / 50);
    const rowSpanOffset = Math.round(deltaY / 50);
    
    const newColSpan = Math.max(2, Math.min(screenConfig.columns - item.col + 1, startColSpan + colSpanOffset));
    const newRowSpan = Math.max(2, Math.min(screenConfig.rows - item.row + 1, startRowSpan + rowSpanOffset));
    
    card.style.gridColumn = `${item.col} / span ${newColSpan}`;
    card.style.gridRow = `${item.row} / span ${newRowSpan}`;
  });
  
  document.addEventListener('mouseup', (e) => {
    if (!isResizing) return;
    isResizing = false;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const colSpanOffset = Math.round(deltaX / 50);
    const rowSpanOffset = Math.round(deltaY / 50);
    
    item.colSpan = Math.max(2, Math.min(screenConfig.columns - item.col + 1, startColSpan + colSpanOffset));
    item.rowSpan = Math.max(2, Math.min(screenConfig.rows - item.row + 1, startRowSpan + rowSpanOffset));
    
    card.style.opacity = '';
    card.style.zIndex = '';
    
    // 격자 숨김
    const content = document.getElementById('screen-content');
    if (content) content.classList.remove('show-grid');
    
    saveScreenItems();
    updateScreenContent();
  });
}

// 매크로 드래그 설정 (위치 이동 또는 스크린 밖으로 드래그 시 삭제)
function setupMacroDrag(card, item, macroImg, macro) {
  let isDragging = false;
  let hasMoved = false;
  let startX, startY;
  let startCol, startRow;
  const DRAG_THRESHOLD = 5;
  
  macroImg.addEventListener('mousedown', (e) => {
    // 우클릭은 제외
    if (e.button !== 0) return;
    
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    startCol = item.col;
    startRow = item.row;
    
    e.preventDefault();
  });
  
  // 클릭 시 매크로 실행 (드래그 후에는 실행 안 됨)
  macroImg.addEventListener('click', async (e) => {
    e.stopPropagation();
    // 드래그하지 않았을 때만 실행
    if (!hasMoved) {
      if (macro.canExecute) {
        await macro.execute();
      } else {
        ui.notifications.warn('매크로를 실행할 권한이 없습니다');
      }
    }
  });
  
  const mouseMoveHandler = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // 임계값 이상 이동하면 드래그로 간주
    if (!hasMoved && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
      hasMoved = true;
      card.style.opacity = '0.7';
      card.style.zIndex = '1000';
      
      // 격자 표시
      const content = document.getElementById('screen-content');
      if (content) content.classList.add('show-grid');
    }
    
    if (hasMoved) {
      // 스크린 영역 확인
      const content = document.getElementById('screen-content');
      const contentRect = content.getBoundingClientRect();
      
      const isOutside = e.clientX < contentRect.left || e.clientX > contentRect.right ||
                        e.clientY < contentRect.top || e.clientY > contentRect.bottom;
      
      if (isOutside) {
        // 스크린 밖이면 카드를 숨기고 빨간색 필터
        card.style.opacity = '0.3';
        card.style.filter = 'brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(3)';
      } else {
        // 스크린 안이면 위치 업데이트
        card.style.opacity = '0.7';
        card.style.filter = '';
        
        // 50px = 1 그리드 셀
        const colOffset = Math.round(deltaX / 50);
        const rowOffset = Math.round(deltaY / 50);
        
        const newCol = Math.max(1, Math.min(screenConfig.columns, startCol + colOffset));
        const newRow = Math.max(1, Math.min(screenConfig.rows, startRow + rowOffset));
        
        card.style.gridColumn = `${newCol} / span 1`;
        card.style.gridRow = `${newRow} / span 1`;
      }
    }
  };
  
  const mouseUpHandler = (e) => {
    if (!isDragging) return;
    
    const wasDragging = hasMoved;
    isDragging = false;
    
    // 스크린 영역 확인
    const content = document.getElementById('screen-content');
    const contentRect = content.getBoundingClientRect();
    
    // 드래그했고 마우스가 스크린 밖에 있으면 즉시 삭제
    if (wasDragging && (e.clientX < contentRect.left || e.clientX > contentRect.right ||
        e.clientY < contentRect.top || e.clientY > contentRect.bottom)) {
      removeItemFromScreen(item.uuid);
      
      // 격자 숨김
      if (content) content.classList.remove('show-grid');
      
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      // hasMoved는 약간 지연 후 리셋 (클릭 이벤트 방지용)
      setTimeout(() => {
        hasMoved = false;
      }, 100);
      return;
    }
    
    // 스크린 내에 있으면 위치 업데이트
    if (wasDragging) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const colOffset = Math.round(deltaX / 50);
      const rowOffset = Math.round(deltaY / 50);
      
      item.col = Math.max(1, Math.min(screenConfig.columns, startCol + colOffset));
      item.row = Math.max(1, Math.min(screenConfig.rows, startRow + rowOffset));
      
      saveScreenItems();
    }
    
    card.style.opacity = '';
    card.style.zIndex = '';
    card.style.filter = '';
    
    // 격자 숨김
    if (content) content.classList.remove('show-grid');
    
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    
    // hasMoved는 약간 지연 후 리셋 (클릭 이벤트 방지용)
    setTimeout(() => {
      hasMoved = false;
    }, 100);
  };
  
  macroImg.addEventListener('mousedown', () => {
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  });
}

// 액터 컨텐츠 렌더링
function renderActorContent(actor, notes = '') {
  const imgPath = actor.img || 'icons/svg/mystery-man.svg';
  
  return `
    <div class="screen-actor-memo">
      <img src="${imgPath}" alt="${actor.name}" class="screen-actor-image" />
      <div class="screen-actor-notes" contenteditable="false" data-placeholder="${game.i18n.localize('Taskbar.NotePlaceholder')}">${notes}</div>
    </div>
  `;
}

// 저널 페이지 컨텐츠 렌더링
async function renderJournalPageContent(page) {
  if (!page) {
    return '<p class="screen-no-content">페이지를 찾을 수 없습니다</p>';
  }
  
  let html = '<div class="screen-journal-page">';
  let hasContent = false;
  
  if (page.type === 'text') {
    const textContent = page.text?.content || '';
    if (textContent) {
      html += `<div class="screen-journal-text">${textContent}</div>`;
      hasContent = true;
    } else {
      html += '<p class="screen-no-content">텍스트 내용 없음</p>';
    }
  } else if (page.type === 'image') {
    const src = page.src || page.image?.src || '';
    if (src) {
      html += `<img src="${src}" alt="${page.name}" class="screen-journal-image" />`;
      hasContent = true;
    } else {
      html += '<p class="screen-no-content">이미지 없음</p>';
    }
  } else if (page.type === 'pdf') {
    html += `<p class="screen-pdf-info"><i class="fa-solid fa-file-pdf"></i> PDF 파일</p>`;
    hasContent = true;
  } else if (page.type === 'video') {
    const src = page.src || page.video?.src || '';
    if (src) {
      html += `<video controls class="screen-journal-video"><source src="${src}"></video>`;
      hasContent = true;
    } else {
      html += '<p class="screen-no-content">비디오 없음</p>';
    }
  } else {
    html += `<p class="screen-no-content">지원하지 않는 페이지 타입: ${page.type}</p>`;
  }
  
  html += '</div>';
  return html;
}

// 액터 편집 다이얼로그 (간단한 HP 수정)
function openActorEditDialog(actor) {
  const hp = actor.system.attributes?.hp;
  const currentHp = hp?.value || 0;
  const maxHp = hp?.max || 0;
  
  new Dialog({
    title: `빠른 편집: ${actor.name}`,
    content: `
      <form>
        <div class="form-group">
          <label>HP</label>
          <div class="form-fields" style="display: flex; gap: 10px;">
            <input type="number" name="hp" value="${currentHp}" min="0" max="${maxHp}" style="flex: 1;" />
            <span>/ ${maxHp}</span>
          </div>
        </div>
      </form>
    `,
    buttons: {
      save: {
        icon: '<i class="fas fa-check"></i>',
        label: '저장',
        callback: (html) => {
          const newHp = parseInt(html.find('[name="hp"]').val());
          if (!isNaN(newHp)) {
            actor.update({ 'system.attributes.hp.value': newHp });
            ui.notifications.info(`${actor.name} HP 업데이트: ${newHp}`);
            setTimeout(() => updateScreenContent(), 100);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: '취소'
      }
    }
  }).render(true);
}

// 저널 편집 다이얼로그
function openJournalEditDialog(journal) {
  // 저널 시트를 직접 여는 것이 더 나음
  journal.sheet.render(true);
}

// 저널 시트의 페이지를 드래그 가능하게 설정
Hooks.on('renderJournalSheet', (app, html, data) => {
  const journal = app.document || app.object;
  if (!journal) return;
  
  // 페이지 목록의 각 항목을 드래그 가능하게 설정
  setTimeout(() => {
    const pageLinks = html.find('.directory-item.page, .journal-entry-page, [data-page-id]');
    
    pageLinks.each((index, element) => {
      const pageElement = $(element);
      const pageId = pageElement.data('page-id') || pageElement.data('pageId');
      
      if (!pageId) return;
      
      const page = journal.pages.get(pageId);
      if (!page) return;
      
      // 이미 드래그 가능하면 스킵
      if (pageElement.attr('draggable')) return;
      
      pageElement.attr('draggable', true);
      
      pageElement.on('dragstart', (e) => {
        const dragData = {
          type: 'JournalEntryPage',
          uuid: page.uuid
        };
        e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        e.originalEvent.dataTransfer.effectAllowed = 'copy';
      });
    });
  }, 100);
});

