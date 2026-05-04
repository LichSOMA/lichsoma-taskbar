// LichSOMA's Taskbar - System Menu

// 즐겨찾기 관리
let favorites = [];

function getFavoritesKey() {
  // 월드 ID와 유저 ID를 포함한 키 생성 (월드별, 유저별로 분리된 저장소)
  const worldId = game.world?.id || game.world?.name || 'default';
  const userId = game.user?.id || 'default';
  return `lichsoma-taskbar-favorites-${worldId}-${userId}`;
}

function loadFavorites() {
  const key = getFavoritesKey();
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      favorites = JSON.parse(saved);
    } catch (e) {
      favorites = [];
    }
  }
}

function saveFavorites() {
  const key = getFavoritesKey();
  localStorage.setItem(key, JSON.stringify(favorites));
}

function addToFavorites(uuid, type, name, icon) {
  // 이미 있는지 확인
  if (!favorites.some(f => f.uuid === uuid)) {
    favorites.push({ uuid, type, name, icon });
    saveFavorites();
    updateFavoritesList();
  }
}

function removeFromFavorites(uuid) {
  favorites = favorites.filter(f => f.uuid !== uuid);
  saveFavorites();
  updateFavoritesList();
}

function isFavorite(uuid) {
  return favorites.some(f => f.uuid === uuid);
}

async function updateFavoritesList() {
  const container = document.getElementById('favorites-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (favorites.length === 0) {
    return;
  }
  
  // 모든 즐겨찾기의 최신 정보를 가져오기
  const validFavorites = [];
  for (const fav of favorites) {
    try {
      const document = await fromUuid(fav.uuid);
      if (document) {
        // 문서가 존재하면 최신 이름으로 업데이트
        fav.name = document.name;
        validFavorites.push(fav);
      }
      // 문서가 없으면 제거 (validFavorites에 추가하지 않음)
    } catch (e) {
      // 문서를 찾을 수 없으면 제거 (validFavorites에 추가하지 않음)
    }
  }
  
  // 유효하지 않은 즐겨찾기 제거
  if (validFavorites.length !== favorites.length) {
    favorites = validFavorites;
    saveFavorites();
  } else {
    // 이름이 변경되었을 수 있으므로 저장
    saveFavorites();
  }
  
  favorites.forEach(fav => {
    const item = document.createElement('div');
    item.className = 'system-menu-favorite-item';
    item.title = fav.name;
    item.innerHTML = `
      <i class="${fav.icon} favorite-icon"></i>
      <span class="favorite-name">${fav.name}</span>
      <i class="fa-solid fa-star favorite-star" data-uuid="${fav.uuid}"></i>
    `;
    
    // 액터, 아이템, 저널, 매크로의 경우 드래그 가능
    if (fav.type === 'Actor' || fav.type === 'Item' || fav.type === 'JournalEntry' || fav.type === 'Macro') {
      item.draggable = true;
      
      item.addEventListener('dragstart', async (event) => {
        const document = await fromUuid(fav.uuid);
        if (document) {
          const dragData = {
            type: fav.type,
            uuid: fav.uuid
          };
          event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        }
      });
    }
    
    // 별표 토글 버튼 이벤트
    const starBtn = item.querySelector('.favorite-star');
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const uuid = starBtn.dataset.uuid;
      removeFromFavorites(uuid);
    });
    
    // 클릭: 문서 열기
    item.addEventListener('click', async (e) => {
      // 별표 버튼 클릭은 무시
      if (e.target.classList.contains('favorite-star')) return;
      
      const document = await fromUuid(fav.uuid);
      if (document) {
        if (fav.type === 'Macro' || fav.type === 'Scene') {
          // 매크로와 장면은 싱글 클릭 시 아무 동작 안함 (더블클릭만 처리)
          return;
        } else {
          document.sheet.render(true);
        }
      } else {
        ui.notifications.warn(`${fav.name}을(를) 찾을 수 없습니다`);
        removeFromFavorites(fav.uuid);
      }
    });
    
    // 장면 더블클릭 이벤트: 장면 활성화
    if (fav.type === 'Scene') {
      item.addEventListener('dblclick', async (e) => {
        // 별표 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-star')) return;
        
        const document = await fromUuid(fav.uuid);
        if (document) {
          // 장면 활성화 (view)
          document.view();
        } else {
          ui.notifications.warn(`${fav.name}을(를) 찾을 수 없습니다`);
          removeFromFavorites(fav.uuid);
        }
      });
      
      // 우클릭 이벤트: 장면 설정 열기
      item.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 별표 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-star')) return;
        
        const document = await fromUuid(fav.uuid);
        if (document) {
          // 장면 설정 열기
          document.sheet.render(true);
        } else {
          ui.notifications.warn(`${fav.name}을(를) 찾을 수 없습니다`);
          removeFromFavorites(fav.uuid);
        }
      });
    }
    
    // 매크로 더블클릭 이벤트: 매크로 실행
    if (fav.type === 'Macro') {
      item.addEventListener('dblclick', async (e) => {
        // 별표 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-star')) return;
        
        const document = await fromUuid(fav.uuid);
        if (document) {
          // 매크로 실행
          document.execute();
        } else {
          ui.notifications.warn(`${fav.name}을(를) 찾을 수 없습니다`);
          removeFromFavorites(fav.uuid);
        }
      });
      
      // 우클릭 이벤트: 매크로 수정 열기
      item.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 별표 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-star')) return;
        
        const document = await fromUuid(fav.uuid);
        if (document) {
          // 매크로 수정 열기
          document.sheet.render(true);
        } else {
          ui.notifications.warn(`${fav.name}을(를) 찾을 수 없습니다`);
          removeFromFavorites(fav.uuid);
        }
      });
    }
    
    container.appendChild(item);
  });
}

// 시스템 메뉴 패널 생성
window.createSystemMenuPanel = function() {
  const panel = document.createElement('div');
  panel.id = 'taskbar-system-menu-panel';
  panel.className = 'taskbar-system-menu-panel hidden';
  
  // GM 전용 버튼들 (조건부로 포함)
  const gmButtons = game.user.isGM ? `
    <button class="system-menu-btn" id="menu-users">
      <i class="fa-solid fa-circle-user"></i>
      <span>${game.i18n.localize('Taskbar.Menu.UserManagement')}</span>
    </button>
    <button class="system-menu-btn" id="menu-modules">
      <i class="fa-solid fa-gear"></i>
      <span>${game.i18n.localize('Taskbar.Menu.Modules')}</span>
    </button>
  ` : '';
  
  // GM 전용 게임 종료 버튼 (조건부로 포함)
  const gmWorldOutButton = game.user.isGM ? `
    <button class="system-menu-btn" id="menu-world-out">
      <i class="fa-solid fa-power-off"></i>
      <span>${game.i18n.localize('Taskbar.Menu.WorldOut')}</span>
    </button>
  ` : '';
  
  // FilePicker 버튼 (GM은 항상, 다른 유저는 파일 브라우저 권한이 있을 경우)
  // FoundryVTT v13에서는 여러 권한 이름을 시도
  let canBrowseFiles = game.user.isGM;
  if (!canBrowseFiles) {
    // 여러 권한 이름 시도
    canBrowseFiles = game.user.can("FILES_BROWSE");
    // 권한 체크가 실패하면 role 확인 (ASSISTANT 이상)
    if (!canBrowseFiles && typeof CONST !== "undefined" && CONST.USER_ROLES) {
      canBrowseFiles = game.user.role >= CONST.USER_ROLES.ASSISTANT;
    }
  }
  const filePickerButton = canBrowseFiles ? `
    <button class="system-menu-btn" id="menu-file-picker">
      <i class="fa-solid fa-folder-open"></i>
      <span>${game.i18n.localize('Taskbar.Menu.FilePicker')}</span>
    </button>
  ` : '';
  
  // 필터 탭 (GM은 Scene 포함, 플레이어는 제외)
  const filterTabs = game.user.isGM ? `
    <button class="system-menu-filter-btn" data-type="Actor">${game.i18n.localize('Taskbar.Filter.Actor')}</button>
    <button class="system-menu-filter-btn" data-type="Scene">${game.i18n.localize('Taskbar.Filter.Scene')}</button>
    <button class="system-menu-filter-btn" data-type="Item">${game.i18n.localize('Taskbar.Filter.Item')}</button>
    <button class="system-menu-filter-btn" data-type="JournalEntry">${game.i18n.localize('Taskbar.Filter.Journal')}</button>
    <button class="system-menu-filter-btn" data-type="Macro">${game.i18n.localize('Taskbar.Filter.Macro')}</button>
  ` : `
    <button class="system-menu-filter-btn" data-type="Actor">${game.i18n.localize('Taskbar.Filter.Actor')}</button>
    <button class="system-menu-filter-btn" data-type="Item">${game.i18n.localize('Taskbar.Filter.Item')}</button>
    <button class="system-menu-filter-btn" data-type="JournalEntry">${game.i18n.localize('Taskbar.Filter.Journal')}</button>
    <button class="system-menu-filter-btn" data-type="Macro">${game.i18n.localize('Taskbar.Filter.Macro')}</button>
  `;
  
  panel.innerHTML = `
    <div class="system-menu-content">
      <div class="system-menu-favorites" id="system-menu-favorites">
        <div class="system-menu-favorites-title">${game.i18n.localize('Taskbar.Menu.Favorites')}</div>
        <div id="favorites-list"></div>
      </div>
      <div class="system-menu-buttons">
        ${gmButtons}
        ${filePickerButton}
        <button class="system-menu-btn" id="menu-macros">
          <i class="fa-solid fa-code"></i>
          <span>${game.i18n.localize('Taskbar.Menu.Macros')}</span>
        </button>
        <button class="system-menu-btn" id="menu-reload">
          <i class="fa-solid fa-rotate"></i>
          <span>${game.i18n.localize('Taskbar.Menu.Reload')}</span>
        </button>
        <button class="system-menu-btn" id="menu-logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>${game.i18n.localize('Taskbar.Menu.Logout')}</span>
        </button>
        ${gmWorldOutButton}
      </div>
    </div>
    <div class="system-menu-search-area">
      <input type="text" class="system-menu-search-input" id="system-menu-search-input">
      <div class="system-menu-search-filters">
        ${filterTabs}
      </div>
      <div class="system-menu-search-results" id="system-menu-search-results">
        <div class="system-menu-no-results">검색어를 입력하세요</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // 즐겨찾기 로드 및 표시
  loadFavorites();
  updateFavoritesList();
  
  // 검색 기능 초기화
  initSystemMenuSearch();
  
  // GM 전용 버튼 이벤트 (GM일 때만 등록)
  if (game.user.isGM) {
    // 유저 관리 버튼
    panel.querySelector('#menu-users').addEventListener('click', () => {
      // 설정 탭의 "사용자 관리" 버튼과 동일한 동작
      const playersButton = document.querySelector('button[data-action="openApp"][data-app="players"]');
      if (playersButton) {
        playersButton.click();
      } else {
        // 버튼을 찾지 못하면 직접 앱 열기
        ui.players?.render(true);
      }
      const logoBtn = document.querySelector('.taskbar-logo');
      toggleSystemMenu(logoBtn); // 메뉴 닫기
    });
    
    // 모듈 설정 버튼
    panel.querySelector('#menu-modules').addEventListener('click', () => {
      // 메뉴를 먼저 닫기 (설정 앱이 열릴 때 발생하는 이벤트가 메뉴를 다시 열지 않도록)
      const logoBtn = document.querySelector('.taskbar-logo');
      toggleSystemMenu(logoBtn);
      
      // 설정 탭의 "모듈 관리" 버튼과 동일한 동작
      const modulesButton = document.querySelector('button[data-action="openApp"][data-app="modules"]');
      if (modulesButton) {
        // 약간의 지연 후 앱 열기 (메뉴가 완전히 닫힌 후)
        setTimeout(() => {
          modulesButton.click();
        }, 100);
      } else {
        // 버튼을 찾지 못하면 직접 앱 열기
        setTimeout(() => {
          const moduleConfig = new ModuleManagement();
          moduleConfig.render(true);
        }, 100);
      }
    });
    
    // 셋업으로 돌아가기 버튼
    panel.querySelector('#menu-world-out').addEventListener('click', () => {
      // 설정 탭의 "셋업으로 돌아가기" 버튼과 동일한 동작
      const setupButton = document.querySelector('button[data-action="openApp"][data-app="setup"]');
      if (setupButton) {
        setupButton.click();
      }
      const logoBtn = document.querySelector('.taskbar-logo');
      toggleSystemMenu(logoBtn); // 메뉴 닫기
    });
  }
  
  // 새로고침 버튼
  panel.querySelector('#menu-reload').addEventListener('click', () => {
    window.location.reload();
  });
  
  // 로그아웃 버튼
  panel.querySelector('#menu-logout').addEventListener('click', () => {
    game.logOut();
  });
  
  // FilePicker 버튼 (파일 브라우저 권한이 있는 경우에만 등록)
  if (canBrowseFiles) {
    const filePickerBtn = panel.querySelector('#menu-file-picker');
    if (filePickerBtn) {
      filePickerBtn.addEventListener('click', () => {
        // FilePicker 열기
        const FilePickerImplementation =
          foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
        if (!FilePickerImplementation) return;

        new FilePickerImplementation({
          type: 'any',
          current: '',
          callback: (path) => {
            // 파일 선택 후 처리 (필요한 경우)
            // FilePicker는 자체적으로 파일 업로드를 처리합니다
          }
        }).render(true);
        
        // 메뉴 닫기
        const logoBtn = document.querySelector('.taskbar-logo');
        toggleSystemMenu(logoBtn);
      });
    }
  }
  
  // 매크로 디렉토리 버튼 (FVTT 14: 탭 우클릭은 contextmenu가 아니라 auxclick/button===2 → renderPopout)
  const macrosBtn = panel.querySelector('#menu-macros');
  if (macrosBtn) {
    macrosBtn.addEventListener('click', () => {
      const macroApp = ui.macros;
      if (macroApp && typeof macroApp.renderPopout === 'function') {
        macroApp.renderPopout();
      } else {
        const macroTabButton = document.querySelector('#sidebar-tabs [data-tab="macros"]');
        if (macroTabButton) {
          macroTabButton.dispatchEvent(new MouseEvent('auxclick', {
            bubbles: true,
            cancelable: true,
            button: 2,
            buttons: 2
          }));
        }
      }

      const logoBtn = document.querySelector('.taskbar-logo');
      toggleSystemMenu(logoBtn);
    });
  }
};

// 시스템 메뉴 검색 기능
function initSystemMenuSearch() {
  const searchInput = document.getElementById('system-menu-search-input');
  const filterBtns = document.querySelectorAll('.system-menu-filter-btn');
  
  // 검색 입력 이벤트
  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });
  
  // 필터 버튼 이벤트 (토글 방식)
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // 클릭한 버튼 토글
      btn.classList.toggle('active');
      // 검색 재실행
      performSearch(searchInput.value);
    });
  });
}

function performSearch(query) {
  const resultsContainer = document.getElementById('system-menu-search-results');
  
  if (!query || query.trim() === '') {
    resultsContainer.innerHTML = '<div class="system-menu-no-results">검색어를 입력하세요</div>';
    return;
  }
  
  // 활성화된 필터 가져오기
  const activeFilters = Array.from(document.querySelectorAll('.system-menu-filter-btn.active'))
    .map(btn => btn.dataset.type);
  
  // 활성화된 필터가 없으면 모든 필터 활성화 (all과 동일)
  const filter = activeFilters.length === 0 ? 'all' : activeFilters;
  
  const results = [];
  const searchQuery = query.toLowerCase();
  
  // 액터 검색 (OBSERVER 이상 권한이 있는 것만 - 소유자가 아니어도 관찰자 권한이 있으면 포함)
  if (filter === 'all' || (Array.isArray(filter) && filter.includes('Actor'))) {
    game.actors.forEach(actor => {
      // OBSERVER 이상 권한 체크 (OBSERVER, OWNER 포함)
      if (actor.testUserPermission(game.user, 'OBSERVER')) {
        // 이름으로 검색
        const nameMatch = actor.name.toLowerCase().includes(searchQuery);
        
        // flag.tags로 검색
        let tagsMatch = false;
        const flagTags = actor.getFlag('lichsoma-taskbar', 'tags');
        if (flagTags && Array.isArray(flagTags)) {
          tagsMatch = flagTags.some(tag => 
            tag.toLowerCase().includes(searchQuery)
          );
        }
        
        // system.tags로 검색 (DX3rd 등)
        if (!tagsMatch && actor.system?.tags && Array.isArray(actor.system.tags)) {
          tagsMatch = actor.system.tags.some(tag => 
            tag.toLowerCase().includes(searchQuery)
          );
        }
        
        if (nameMatch || tagsMatch) {
          results.push({
            type: 'Actor',
            icon: 'fa-solid fa-user',
            name: actor.name,
            document: actor
          });
        }
      }
    });
  }
  
  // 아이템 검색 (OBSERVER 이상 권한이 있는 것만)
  if (filter === 'all' || (Array.isArray(filter) && filter.includes('Item'))) {
    game.items.forEach(item => {
      // OBSERVER 이상 권한 체크
      if (item.testUserPermission(game.user, 'OBSERVER')) {
        // 이름으로 검색
        const nameMatch = item.name.toLowerCase().includes(searchQuery);
        
        // flag.tags로 검색
        let tagsMatch = false;
        const tags = item.getFlag('lichsoma-taskbar', 'tags');
        if (tags && Array.isArray(tags)) {
          tagsMatch = tags.some(tag => 
            tag.toLowerCase().includes(searchQuery)
          );
        }
        
        if (nameMatch || tagsMatch) {
          results.push({
            type: 'Item',
            icon: 'fa-solid fa-suitcase',
            name: item.name,
            document: item
          });
        }
      }
    });
  }
  
  // 저널 검색 (OBSERVER 이상 권한이 있는 것만)
  if (filter === 'all' || (Array.isArray(filter) && filter.includes('JournalEntry'))) {
    game.journal.forEach(journal => {
      // OBSERVER 이상 권한 체크
      if (journal.testUserPermission(game.user, 'OBSERVER')) {
        if (journal.name.toLowerCase().includes(searchQuery)) {
          results.push({
            type: 'Journal',
            icon: 'fa-solid fa-book-open',
            name: journal.name,
            document: journal
          });
        }
      }
    });
  }
  
  // 매크로 검색 (OBSERVER 이상 권한이 있는 것만)
  if (filter === 'all' || (Array.isArray(filter) && filter.includes('Macro'))) {
    game.macros.forEach(macro => {
      // OBSERVER 이상 권한 체크
      if (macro.testUserPermission(game.user, 'OBSERVER')) {
        if (macro.name.toLowerCase().includes(searchQuery)) {
          results.push({
            type: 'Macro',
            icon: 'fa-solid fa-code',
            name: macro.name,
            document: macro
          });
        }
      }
    });
  }
  
  // 장면 검색 (GM 전용)
  if (game.user.isGM && (filter === 'all' || (Array.isArray(filter) && filter.includes('Scene')))) {
    game.scenes.forEach(scene => {
      // 이름으로 검색
      const nameMatch = scene.name.toLowerCase().includes(searchQuery);
      
      // flag.tags로 검색
      let tagsMatch = false;
      const tags = scene.getFlag('lichsoma-taskbar', 'tags');
      if (tags && Array.isArray(tags)) {
        tagsMatch = tags.some(tag => 
          tag.toLowerCase().includes(searchQuery)
        );
      }
      
      if (nameMatch || tagsMatch) {
        results.push({
          type: 'Scene',
          icon: 'fa-solid fa-map',
          name: scene.name,
          document: scene
        });
      }
    });
  }
  
  // 결과 표시
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="system-menu-no-results">검색 결과가 없습니다</div>';
    return;
  }
  
  // 결과를 타입별로 정렬
  results.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    return a.name.localeCompare(b.name, 'ko');
  });
  
  resultsContainer.innerHTML = '';
  
  results.forEach(result => {
    const item = document.createElement('div');
    item.className = 'system-menu-search-item';
    
    const isFav = isFavorite(result.document.uuid);
    
    item.innerHTML = `
      <i class="${result.icon}"></i>
      <span class="item-name">${result.name}</span>
      <span class="item-type">${result.type}</span>
      <i class="fa-${isFav ? 'solid' : 'regular'} fa-star favorite-toggle ${isFav ? 'active' : ''}" data-uuid="${result.document.uuid}" data-type="${result.type}" data-name="${result.name}" data-icon="${result.icon}"></i>
    `;
    
    // 액터, 아이템, 저널, 매크로의 경우 드래그 앤 드롭 가능하게 설정
    if (result.type === 'Actor' || result.type === 'Item' || result.type === 'JournalEntry' || result.type === 'Macro') {
      item.draggable = true;
      
      // 드래그 시작 이벤트
      item.addEventListener('dragstart', (event) => {
        const dragData = {
          type: result.type,
          uuid: result.document.uuid
        };
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      });
      
      // 드래그 중 커서 스타일
      item.addEventListener('dragover', (event) => {
        event.preventDefault();
      });
    }
    
    // 즐겨찾기 토글 버튼
    const favoriteBtn = item.querySelector('.favorite-toggle');
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const uuid = favoriteBtn.dataset.uuid;
      const type = favoriteBtn.dataset.type;
      const name = favoriteBtn.dataset.name;
      const icon = favoriteBtn.dataset.icon;
      
      if (isFavorite(uuid)) {
        removeFromFavorites(uuid);
        favoriteBtn.classList.remove('fa-solid', 'active');
        favoriteBtn.classList.add('fa-regular');
      } else {
        addToFavorites(uuid, type, name, icon);
        favoriteBtn.classList.remove('fa-regular');
        favoriteBtn.classList.add('fa-solid', 'active');
      }
    });
    
    // 클릭 이벤트: 문서 열기
    item.addEventListener('click', (e) => {
      // 즐겨찾기 버튼 클릭은 무시
      if (e.target.classList.contains('favorite-toggle')) return;
      
      if (result.type === 'Macro' || result.type === 'Scene') {
        // 매크로와 장면은 싱글 클릭 시 아무 동작 안함 (더블클릭만 처리)
        return;
      } else {
        // 나머지는 시트 열기
        result.document.sheet.render(true);
      }
      
      // 시스템 메뉴 닫기
      const systemPanel = document.getElementById('taskbar-system-menu-panel');
      const logoBtn = document.querySelector('.taskbar-logo');
      systemPanel.classList.add('hidden');
      if (logoBtn) logoBtn.classList.remove('active');
    });
    
    // 장면 더블클릭 이벤트: 장면 활성화
    if (result.type === 'Scene') {
      item.addEventListener('dblclick', (e) => {
        // 즐겨찾기 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-toggle')) return;
        
        // 장면 활성화 (view)
        result.document.view();
        
        // 시스템 메뉴 닫기
        const systemPanel = document.getElementById('taskbar-system-menu-panel');
        const logoBtn = document.querySelector('.taskbar-logo');
        systemPanel.classList.add('hidden');
        if (logoBtn) logoBtn.classList.remove('active');
      });
      
      // 우클릭 이벤트: 장면 설정 열기
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 즐겨찾기 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-toggle')) return;
        
        // 장면 설정 열기
        result.document.sheet.render(true);
        
        // 시스템 메뉴 닫기
        const systemPanel = document.getElementById('taskbar-system-menu-panel');
        const logoBtn = document.querySelector('.taskbar-logo');
        systemPanel.classList.add('hidden');
        if (logoBtn) logoBtn.classList.remove('active');
      });
    }
    
    // 매크로 더블클릭 이벤트: 매크로 실행
    if (result.type === 'Macro') {
      item.addEventListener('dblclick', (e) => {
        // 즐겨찾기 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-toggle')) return;
        
        // 매크로 실행
        result.document.execute();
        
        // 시스템 메뉴 닫기
        const systemPanel = document.getElementById('taskbar-system-menu-panel');
        const logoBtn = document.querySelector('.taskbar-logo');
        systemPanel.classList.add('hidden');
        if (logoBtn) logoBtn.classList.remove('active');
      });
      
      // 우클릭 이벤트: 매크로 수정 열기
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 즐겨찾기 버튼 클릭은 무시
        if (e.target.classList.contains('favorite-toggle')) return;
        
        // 매크로 수정 열기
        result.document.sheet.render(true);
        
        // 시스템 메뉴 닫기
        const systemPanel = document.getElementById('taskbar-system-menu-panel');
        const logoBtn = document.querySelector('.taskbar-logo');
        systemPanel.classList.add('hidden');
        if (logoBtn) logoBtn.classList.remove('active');
      });
    }
    
    resultsContainer.appendChild(item);
  });
}

window.toggleSystemMenu = function(logoBtn) {
  const systemPanel = document.getElementById('taskbar-system-menu-panel');
  const playerPanel = document.getElementById('taskbar-player-list-panel');
  const screenPanel = document.getElementById('taskbar-screen-panel');
  const playersBtn = document.querySelector('#taskbar-players-btn');
  const screenBtn = document.querySelector('#taskbar-screen-btn');
  
  if (systemPanel.classList.contains('hidden')) {
    // 시스템 메뉴 열기
    systemPanel.classList.remove('hidden');
    if (logoBtn) logoBtn.classList.add('active');
    
    // 검색 초기화
    resetSearchState();
    
    // 플레이어 목록 닫기
    if (playerPanel && !playerPanel.classList.contains('hidden')) {
      playerPanel.classList.add('hidden');
      if (playersBtn) playersBtn.classList.remove('active');
    }
    
    // 스크린 패널 닫기
    if (screenPanel && !screenPanel.classList.contains('hidden')) {
      screenPanel.classList.add('hidden');
      if (screenBtn) {
        screenBtn.classList.remove('active');
        const icon = screenBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-book';
      }
    }
  } else {
    // 시스템 메뉴 닫기
    systemPanel.classList.add('hidden');
    if (logoBtn) logoBtn.classList.remove('active');
  }
};

function resetSearchState() {
  // 검색창 초기화
  const searchInput = document.getElementById('system-menu-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // 필터 초기화 (모든 필터 비활성화 - all 상태)
  const filterBtns = document.querySelectorAll('.system-menu-filter-btn');
  filterBtns.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 검색 결과 초기화
  const resultsContainer = document.getElementById('system-menu-search-results');
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="system-menu-no-results">검색어를 입력하세요</div>';
  }
}

// 문서 업데이트 시 즐겨찾기 이름 자동 업데이트
Hooks.on('updateActor', async (document, updateData, options, userId) => {
  if (updateData.name !== undefined && isFavorite(document.uuid)) {
    const favorite = favorites.find(f => f.uuid === document.uuid);
    if (favorite) {
      favorite.name = document.name;
      saveFavorites();
      await updateFavoritesList();
    }
  }
});

Hooks.on('updateItem', async (document, updateData, options, userId) => {
  if (updateData.name !== undefined && isFavorite(document.uuid)) {
    const favorite = favorites.find(f => f.uuid === document.uuid);
    if (favorite) {
      favorite.name = document.name;
      saveFavorites();
      await updateFavoritesList();
    }
  }
});

Hooks.on('updateScene', async (document, updateData, options, userId) => {
  if (updateData.name !== undefined && isFavorite(document.uuid)) {
    const favorite = favorites.find(f => f.uuid === document.uuid);
    if (favorite) {
      favorite.name = document.name;
      saveFavorites();
      await updateFavoritesList();
    }
  }
});

Hooks.on('updateJournalEntry', async (document, updateData, options, userId) => {
  if (updateData.name !== undefined && isFavorite(document.uuid)) {
    const favorite = favorites.find(f => f.uuid === document.uuid);
    if (favorite) {
      favorite.name = document.name;
      saveFavorites();
      await updateFavoritesList();
    }
  }
});

Hooks.on('updateMacro', async (document, updateData, options, userId) => {
  if (updateData.name !== undefined && isFavorite(document.uuid)) {
    const favorite = favorites.find(f => f.uuid === document.uuid);
    if (favorite) {
      favorite.name = document.name;
      saveFavorites();
      await updateFavoritesList();
    }
  }
});

