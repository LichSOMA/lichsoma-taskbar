// LichSOMA's Taskbar Script

const DialogV2 = foundry.applications.api.DialogV2;

// 윈도우 순서 저장
let windowOrder = [];
let draggedButton = null;
/** 유저 호출 메시지: 움직임 감지 후 지연 사라짐·리스너 정리용 */
let userCallDismissTimeout = null;
let userCallInteractionAbort = null;
const BASE_WINDOW_SELECTORS = ['.application', '.window-app', '.sidebar-popout', 'dialog.application', 'dialog.dialog'];

// localStorage에서 순서 불러오기
function loadWindowOrder() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  const saved = localStorage.getItem(`lichsoma-taskbar-window-order-${worldId}-${userId}`);
  if (saved) {
    try {
      windowOrder = JSON.parse(saved);
    } catch (e) {
      windowOrder = [];
    }
  }
}

// localStorage에 순서 저장
function saveWindowOrder() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  localStorage.setItem(`lichsoma-taskbar-window-order-${worldId}-${userId}`, JSON.stringify(windowOrder));
}

Hooks.once('init', () => {
  registerSettings();
  patchApplicationMinimize();
});

Hooks.once('ready', () => {
  loadWindowOrder();
  loadShowOffline();
  createTaskbar();
  updateTaskbarStyle();
  
  // 유저 호출 소켓 리스너 등록
  setupUserCallSocket();
});

function registerSettings() {
  game.settings.register('lichsoma-taskbar', 'taskbarColor', {
    name: 'Taskbar.SettingsColor',
    hint: 'Taskbar.SettingsColorHint',
    scope: 'client',
    config: false,
    type: String,
    default: '#0B0A13',
    requiresReload: true
  });

  game.settings.register('lichsoma-taskbar', 'taskbarOpacity', {
    name: 'Taskbar.SettingsOpacity',
    hint: 'Taskbar.SettingsOpacityHint',
    scope: 'client',
    config: false,
    type: Number,
    range: {
      min: 0,
      max: 100,
      step: 5
    },
    default: 100,
    requiresReload: true
  });

  // 유저 호출 사운드 설정
  game.settings.register('lichsoma-taskbar', 'userCallSound', {
    name: 'Taskbar.UserCall.SettingsSound',
    hint: 'Taskbar.UserCall.SettingsSoundHint',
    scope: 'world',
    config: true,
    type: String,
    filePicker: 'audio',
    default: 'sounds/combat/epic-next-horn.ogg'
  });

  // 유저 호출 사운드 볼륨 설정
  game.settings.register('lichsoma-taskbar', 'userCallSoundVolume', {
    name: 'Taskbar.UserCall.SettingsSoundVolume',
    hint: 'Taskbar.UserCall.SettingsSoundVolumeHint',
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 0,
      max: 2,
      step: 0.1
    },
    default: 1
  });

  // 플레이어 간 호출 허용 설정
  game.settings.register('lichsoma-taskbar', 'allowPlayerCall', {
    name: 'Taskbar.UserCall.SettingsAllowPlayerCall',
    hint: 'Taskbar.UserCall.SettingsAllowPlayerCallHint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // 커스텀 설정 메뉴 버튼 등록 (settings.js가 먼저 로드되므로 클래스 사용 가능)
  // registerMenu는 name, label, hint에 로컬라이징 키 문자열을 넣으면 FoundryVTT가 자동으로 로컬라이징함
  // game.i18n.localize()를 사용하면 안 됨 (이미 번역된 문자열이 들어가서 자동 로컬라이징이 작동하지 않음)
  // 점(.)이 두 개 이상인 경우 로컬라이징이 제대로 작동하지 않을 수 있으므로 Taskbar.SettingsMenuName 형식 사용
  if (typeof window.TaskbarSettingsForm !== 'undefined') {
    game.settings.registerMenu('lichsoma-taskbar', 'taskbarSettingsMenu', {
      name: 'Taskbar.SettingsMenuName',
      label: 'Taskbar.SettingsMenuLabel',
      hint: 'Taskbar.SettingsMenuHint',
      icon: 'fas fa-cog',
      type: window.TaskbarSettingsForm,
      restricted: false
    });
  }
}

// Application 클래스의 minimize 동작을 패치하여 테스크바 최소화로 대체
function patchApplicationMinimize() {
  // Application 클래스의 _onToggleMinimize 메서드를 오버라이드
  if (Application.prototype._onToggleMinimize) {
    const original_onToggleMinimize = Application.prototype._onToggleMinimize;
    
    Application.prototype._onToggleMinimize = function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      // 테스크바 최소화로 대체
      const element = this.element;
      if (element) {
        const htmlElement = element instanceof jQuery ? element[0] : element;
        if (htmlElement) {
          // dialog 요소인 경우
          if (htmlElement.tagName === 'DIALOG') {
            htmlElement.close();
          } else {
            htmlElement.style.display = 'none';
          }
          
          // 테스크바 업데이트
          setTimeout(() => {
            if (typeof updateTaskbarWindows === 'function') {
              updateTaskbarWindows();
            }
          }, 10);
        }
      }
      
      // 기존 minimize 동작은 실행하지 않음
      // original_onToggleMinimize.call(this, event);
    };
  }
  
  // ApplicationV2의 minimize 메서드도 패치 (v13용)
  if (typeof foundry !== 'undefined' && foundry.applications?.api?.ApplicationV2) {
    const ApplicationV2 = foundry.applications.api.ApplicationV2;
    
    if (ApplicationV2.prototype.minimize) {
      const original_minimize = ApplicationV2.prototype.minimize;
      
      ApplicationV2.prototype.minimize = function(options = {}) {
        // 테스크바 최소화로 대체
        const element = this.element;
        if (element) {
          const htmlElement = element instanceof jQuery ? element[0] : element;
          if (htmlElement) {
            // dialog 요소인 경우
            if (htmlElement.tagName === 'DIALOG') {
              htmlElement.close();
            } else {
              htmlElement.style.display = 'none';
            }
            
            // 테스크바 업데이트
            setTimeout(() => {
              if (typeof updateTaskbarWindows === 'function') {
                updateTaskbarWindows();
              }
            }, 10);
            
            return this; // ApplicationV2는 체이닝을 위해 this 반환
          }
        }
        
        // 기존 동작은 실행하지 않음
        // return original_minimize.call(this, options);
        return this;
      };
    }
  }
}

function updateTaskbarStyle() {
    const color = game.settings.get('lichsoma-taskbar', 'taskbarColor');
    const opacity = game.settings.get('lichsoma-taskbar', 'taskbarOpacity');

    // CSS 변수로 스타일 설정 (높이는 고정값 45px 사용)
    document.documentElement.style.setProperty('--taskbar-height', '45px');
    document.documentElement.style.setProperty('--taskbar-color', color);
    document.documentElement.style.setProperty('--taskbar-opacity', opacity / 100);
}

function createTaskbar() {
  const taskbar = document.createElement('div');
  taskbar.className = 'lichsoma-taskbar';
  taskbar.id = 'lichsoma-taskbar';
  
  taskbar.innerHTML = `
    <div class="taskbar-left">
      <img src="${window.location.origin}/icons/svg/d20.svg" alt="System" class="taskbar-logo" />
      <button class="taskbar-icon-btn" id="taskbar-players-btn" title="${game.i18n.localize('Taskbar.Users')}">
        <i class="fa-solid fa-users"></i>
      </button>
      <button class="taskbar-icon-btn" id="taskbar-screen-btn" title="${game.i18n.localize('Taskbar.Screen')}">
        <i class="fa-solid fa-book"></i>
      </button>
    </div>
    <div class="taskbar-center-wrapper">
      <button class="taskbar-scroll-btn left" id="taskbar-scroll-left">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="taskbar-fade-left"></div>
      <div class="taskbar-center" id="taskbar-windows">
      </div>
      <div class="taskbar-fade-right"></div>
      <button class="taskbar-scroll-btn right" id="taskbar-scroll-right">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
    <div class="taskbar-right">
      <button class="taskbar-icon-btn" id="taskbar-quest-btn" title="${game.i18n.localize('Taskbar.Quest')}">
        <i class="fa-solid fa-scroll"></i>
      </button>
      <button class="taskbar-icon-btn" id="taskbar-close-btn" title="${game.i18n.localize('Taskbar.Close')}">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <button class="taskbar-icon-btn" id="taskbar-settings-btn" title="${game.i18n.localize('Taskbar.Settings')}">
        <i class="fa-solid fa-gears"></i>
      </button>
      <div class="taskbar-stats">
        <div class="taskbar-stats-perf" id="taskbar-stats-perf">
          <div class="taskbar-stat">
            <span class="stat-label">${game.i18n.localize('Taskbar.Stats.Latency')}</span>
            <span class="stat-value" id="taskbar-latency">--</span>
          </div>
          <div class="taskbar-stat">
            <span class="stat-label">${game.i18n.localize('Taskbar.Stats.FPS')}</span>
            <span class="stat-value" id="taskbar-fps">--</span>
          </div>
        </div>
        <div class="taskbar-stats-datetime" id="taskbar-stats-datetime" style="display:none;">
          <div class="taskbar-datetime-line" id="taskbar-datetime-date">--/--/--</div>
          <div class="taskbar-datetime-line" id="taskbar-datetime-time">--</div>
        </div>
      </div>
    </div>
    <div class="taskbar-show-desktop" id="taskbar-show-desktop" title="${game.i18n.localize('Taskbar.ShowDesktop')}"></div>
  `;
  
  document.body.appendChild(taskbar);
  
  // 시스템 메뉴 패널 생성
  if (typeof window.createSystemMenuPanel === 'function') {
    window.createSystemMenuPanel();
  }
  
  // D20 로고 클릭 이벤트
  const logoBtn = taskbar.querySelector('.taskbar-logo');
  logoBtn.addEventListener('click', () => {
    if (typeof window.toggleSystemMenu === 'function') {
      window.toggleSystemMenu(logoBtn);
    }
  });
  
  // 플레이어 목록 패널 생성
  createPlayerListPanel();
  
  // 스크린 패널 생성
  if (typeof window.createScreenPanel === 'function') {
    window.createScreenPanel();
  }
  
  // 퀘스트 패널 생성 (실패해도 테스크바·윈도우 감지 훅은 반드시 등록되도록 분리)
  if (typeof window.createQuestListPanel === 'function') {
    try {
      window.createQuestListPanel();
    } catch (err) {
      console.error('lichsoma-taskbar | createQuestListPanel failed:', err);
    }
  }
  if (typeof window.applyQuestListSetting === 'function') {
    try {
      window.applyQuestListSetting();
    } catch (err) {
      console.error('lichsoma-taskbar | applyQuestListSetting failed:', err);
    }
  }
  
  // 플레이어 버튼 클릭 이벤트
  const playersBtn = taskbar.querySelector('#taskbar-players-btn');
  playersBtn.addEventListener('click', (e) => {
    e.target.blur(); // focus 제거
    togglePlayerList(playersBtn);
  });
  
  // 스크린 버튼 클릭 이벤트
  const screenBtn = taskbar.querySelector('#taskbar-screen-btn');
  screenBtn.addEventListener('click', (e) => {
    e.target.blur(); // focus 제거
    if (typeof window.toggleScreen === 'function') {
      window.toggleScreen(screenBtn);
    }
  });
  
  // 바탕화면 보기 버튼 클릭 이벤트 (스마트 동작)
  const showDesktopBtn = taskbar.querySelector('#taskbar-show-desktop');
  showDesktopBtn.addEventListener('click', (e) => {
    // 현재 보이는 윈도우가 있는지 확인
    const hasVisibleWindows = checkAnyWindowVisible();
    
    if (hasVisibleWindows) {
      // 하나라도 보이면 모두 숨기기
      hideAllWindows();
    } else {
      // 모두 숨겨져 있으면 모두 보이기
      showAllWindows();
    }
  });
  
  // 퀘스트 버튼 클릭 이벤트
  const questBtn = taskbar.querySelector('#taskbar-quest-btn');
  questBtn.addEventListener('click', (e) => {
    e.target.blur(); // focus 제거
    if (typeof window.toggleQuestList === 'function') {
      window.toggleQuestList(questBtn);
    }
  });
  
  // 닫기 버튼 클릭 이벤트
  const closeBtn = taskbar.querySelector('#taskbar-close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.target.blur(); // focus 제거
    closeAllWindows();
  });
  
  // 설정 버튼 클릭 이벤트
  const settingsBtn = taskbar.querySelector('#taskbar-settings-btn');
  settingsBtn.addEventListener('click', (e) => {
    e.target.blur(); // focus 제거
    openGameSettings();
  });
  
  // 외부 클릭 시 메뉴/패널 닫기
  document.addEventListener('click', (e) => {
    const systemPanel = document.getElementById('taskbar-system-menu-panel');
    const playerPanel = document.getElementById('taskbar-player-list-panel');
    const logoBtn = document.querySelector('.taskbar-logo');
    const playersBtn = document.querySelector('#taskbar-players-btn');
    
    // 시스템 메뉴 외부 클릭 체크
    if (systemPanel && !systemPanel.classList.contains('hidden')) {
      if (!systemPanel.contains(e.target) && !logoBtn.contains(e.target)) {
        systemPanel.classList.add('hidden');
        logoBtn.classList.remove('active');
      }
    }
    
    // 플레이어 목록 외부 클릭 체크
    if (playerPanel && !playerPanel.classList.contains('hidden')) {
      if (!playerPanel.contains(e.target) && !playersBtn.contains(e.target)) {
        playerPanel.classList.add('hidden');
        playersBtn.classList.remove('active');
      }
    }
    
    // 퀘스트 패널은 외부 클릭으로 닫히지 않음 (버튼 토글 또는 전투 시작으로만 닫힘)
    // 스크린 패널은 외부 클릭으로 닫히지 않음 (버튼 토글 또는 다른 패널 열기로만 닫힘)
  });
  
  // 성능 통계 업데이트
  setInterval(() => {
    updatePerformanceStats();
  }, 1000);
  
  // 채팅 탭 버튼 우클릭 막기
  function blockChatTabRightClick() {
    const chatTabBtn = document.querySelector('button[data-action="tab"][data-tab="chat"]');
    if (chatTabBtn) {
      // 우클릭(contextmenu) 이벤트만 차단
      chatTabBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, true);
    } else {
      setTimeout(blockChatTabRightClick, 300);
    }
  }
  
  blockChatTabRightClick();
  
  // 초기 윈도우 목록 업데이트
  updateTaskbarWindows();
  
  // 전역 더블클릭 이벤트 가로채기 (모든 윈도우 헤더에 적용)
  document.addEventListener('dblclick', (e) => {
    // window-header 또는 그 자식 요소를 더블클릭한 경우
    const header = e.target.closest('.window-header');
    if (!header) return;
    
    // 헤더 제어 버튼들(닫기, 최소화 등)은 제외
    if (e.target.closest('.header-control')) return;
    
    // window-title은 허용
    if (!e.target.classList.contains('window-header') && 
        !e.target.classList.contains('window-title') &&
        !e.target.closest('.window-title')) return;
    
    // 해당 윈도우 찾기
    const windowElement = header.closest('.application, .window-app, form.application');
    if (!windowElement) return;
    
    // 이벤트 막기
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // 테스크바에 최소화
    if (windowElement.tagName === 'DIALOG') {
      windowElement.close();
    } else {
      windowElement.style.display = 'none';
    }
    
    // 테스크바 업데이트
    setTimeout(() => updateTaskbarWindows(), 10);
  }, { capture: true }); // capture phase에서 먼저 가로채기
  
  // 윈도우가 렌더링될 때마다 업데이트 (Application V1)
  Hooks.on('renderApplication', (app, html, data) => {
    if (isTrackableWindow(app)) {
      setTimeout(() => updateTaskbarWindows(), 50);
      
      // 윈도우 헤더 더블클릭 이벤트를 테스크바 최소화로 대체
      replaceHeaderDoubleClick(app, html);
    }
  });

  // Application V2 (DocumentSheetV2, DialogV2 등) — V1용 renderApplication 훅이 호출되지 않음
  Hooks.on('renderApplicationV2', (application, element, context, options) => {
    if (isTrackableWindow(application)) {
      setTimeout(() => updateTaskbarWindows(), 50);
      replaceHeaderDoubleClick(application, element);
    }
  });
  
  // 여러 가지 닫기 훅 시도
  const closeHooks = [
    'closeApplication',
    'closeApplicationV2',
    'closeActorSheet', 
    'closeItemSheet'
  ];
  
  closeHooks.forEach(hookName => {
    Hooks.on(hookName, (app, html) => {
      setTimeout(() => updateTaskbarWindows(), 10);
    });
  });
  
  // MutationObserver로 윈도우 추가/제거/스타일 변화 감지
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && isTrackedWindowElement(node)) {
          shouldUpdate = true;
        }
      });
      
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1 && isTrackedWindowElement(node)) {
          shouldUpdate = true;
        }
      });
      
      if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'open')) {
        const target = mutation.target;
        if (isTrackedWindowElement(target)) {
          shouldUpdate = true;
        }
      }
    });
    
    // 새로 추가된 윈도우는 Foundry가 z-order/포커스를 관리하므로 여기서 bringToFront 하지 않음.
    // (재렌더로 DOM이 바뀔 때 '새 창'으로 오인해 순서가 뒤섞이는 문제 방지)
    
    if (shouldUpdate) {
      // ui.windows 업데이트를 기다리기 위해 충분한 지연
      setTimeout(() => {
        updateTaskbarWindows();
      }, 100);
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'open']
  });
  
  // 표준 훅도 등록
  Hooks.on('renderItemSheet', (app, html, data) => {
    setTimeout(() => updateTaskbarWindows(), 50);
  });
  
  // 윈도우 영역 스크롤 버튼 설정
  setupTaskbarScroll();
}

function setupTaskbarScroll() {
  const windowsContainer = document.getElementById('taskbar-windows');
  const scrollLeftBtn = document.getElementById('taskbar-scroll-left');
  const scrollRightBtn = document.getElementById('taskbar-scroll-right');
  const fadeLeft = document.querySelector('.taskbar-fade-left');
  const fadeRight = document.querySelector('.taskbar-fade-right');
  
  if (!windowsContainer || !scrollLeftBtn || !scrollRightBtn) return;
  
  // 스크롤 상태 업데이트
  function updateScrollState() {
    const scrollLeft = windowsContainer.scrollLeft;
    const scrollWidth = windowsContainer.scrollWidth;
    const clientWidth = windowsContainer.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    
    // 스크롤이 필요한지 확인
    const needsScroll = scrollWidth > clientWidth;
    
    if (!needsScroll) {
      // 스크롤이 필요없으면 버튼과 페이드 숨기기
      scrollLeftBtn.classList.remove('visible');
      scrollRightBtn.classList.remove('visible');
      fadeLeft.classList.remove('visible');
      fadeRight.classList.remove('visible');
      return;
    }
    
    // 왼쪽 버튼과 페이드
    if (scrollLeft > 5) {
      scrollLeftBtn.classList.add('visible');
      fadeLeft.classList.add('visible');
    } else {
      scrollLeftBtn.classList.remove('visible');
      fadeLeft.classList.remove('visible');
    }
    
    // 오른쪽 버튼과 페이드
    if (scrollLeft < maxScroll - 5) {
      scrollRightBtn.classList.add('visible');
      fadeRight.classList.add('visible');
    } else {
      scrollRightBtn.classList.remove('visible');
      fadeRight.classList.remove('visible');
    }
  }
  
  // 스크롤 이벤트
  windowsContainer.addEventListener('scroll', updateScrollState);
  
  // 윈도우 크기 변경 시 업데이트
  window.addEventListener('resize', updateScrollState);
  
  // 왼쪽 스크롤 버튼
  scrollLeftBtn.addEventListener('click', () => {
    const scrollAmount = 200;
    windowsContainer.scrollLeft -= scrollAmount;
  });
  
  // 오른쪽 스크롤 버튼
  scrollRightBtn.addEventListener('click', () => {
    const scrollAmount = 200;
    windowsContainer.scrollLeft += scrollAmount;
  });
  
  // 초기 상태 업데이트
  setTimeout(updateScrollState, 100);
  
  // MutationObserver로 윈도우 버튼 추가/제거 감지
  const observer = new MutationObserver(() => {
    setTimeout(updateScrollState, 50);
  });
  
  observer.observe(windowsContainer, {
    childList: true
  });
}

// element 가져오기 헬퍼 함수
function getAppElement(app) {
  if (!app) return null;
  
  let element = null;
  
  // 여러 방법으로 element 가져오기
  if (app.element) {
    if (app.element instanceof jQuery) {
      element = app.element[0];
    } else if (app.element instanceof HTMLElement) {
      element = app.element;
    } else if (Array.isArray(app.element)) {
      element = app.element[0];
    }
  }
  
  // element가 없으면 ID로 찾기
  if (!element && app.id) {
    element = document.getElementById(app.id);
  }
  
  return element;
}

/** DOM 요소에 대응하는 Foundry Application이 있으면 반환 (V1/V2 공통, ui.windows 기준) */
function findApplicationForElement(element) {
  if (!element || !ui?.windows) return null;
  for (const app of Object.values(ui.windows)) {
    if (!app?.rendered) continue;
    const el = getAppElement(app);
    if (el && (el === element || el.contains(element))) {
      return app;
    }
  }
  return null;
}

function getTrackedWindowSelector() {
  const selectors = [...BASE_WINDOW_SELECTORS].filter(Boolean);
  return selectors.join(', ');
}

function getTrackedWindowElements() {
  const selector = getTrackedWindowSelector();
  if (!selector) return [];
  return Array.from(document.querySelectorAll(selector));
}

function isTrackedWindowElement(element) {
  if (!element || typeof element.matches !== 'function') return false;
  const selector = getTrackedWindowSelector();
  if (!selector) return false;
  return element.matches(selector);
}

function getElementIdentifier(element) {
  if (!element) return null;
  if (element.id) return element.id;
  const existing = element.getAttribute('data-taskbar-window-id');
  if (existing) return existing;
  const generated = `taskbar-window-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  element.setAttribute('data-taskbar-window-id', generated);
  return generated;
}

function getElementDisplayName(element, fallbackId) {
  if (!element) return fallbackId || '';
  const stored = element.getAttribute('data-window-title');
  if (stored) return stored;
  const titleEl = element.querySelector('.window-title');
  const titleText = titleEl?.textContent?.trim();
  if (titleText) return titleText;
  return fallbackId || '';
}

function isTrackableWindow(app) {
  if (!app) return false;
  
  // 렌더링되지 않은 앱은 제외
  if (!app.rendered) return false;
  
  // 모든 렌더링된 Application을 추적 (단, 특정 타입은 제외)
  // 제외할 타입: 작업표시줄 자체, 메뉴, HUD 등
  const excludeIds = [
    'lichsoma-taskbar',
    'taskbar-system-menu-panel',
    'taskbar-player-list-panel'
  ];
  
  if (excludeIds.includes(app.id)) return false;
  
  // Application 인스턴스면 추적
  return true;
}

function updateTaskbarWindows() {
  const container = document.getElementById('taskbar-windows');
  if (!container) return;
  
  container.innerHTML = '';
  
  // DOM에서 직접 모든 윈도우 찾기
  const excludeIds = ['lichsoma-taskbar', 'taskbar-system-menu-panel', 'taskbar-player-list-panel'];
  
  // 추적 대상 윈도우 요소 찾기
  const allWindowElements = getTrackedWindowElements();
  const windowElements = allWindowElements.filter(el => {
    // 제외 목록 체크
    const elementId = getElementIdentifier(el);
    if (elementId && excludeIds.includes(elementId)) return false;
    return true;
  });
  
  // 새로 열린 윈도우를 windowOrder에만 추가 (z-order는 Foundry·사용자 클릭에 맡김)
  windowElements.forEach(element => {
    const id = getElementIdentifier(element);
    if (id && !windowOrder.includes(id)) {
      windowOrder.push(id);
    }
  });
  
  // windowOrder에서 닫힌 윈도우 제거
  const currentIds = windowElements.map(el => getElementIdentifier(el)).filter(id => id);
  windowOrder = windowOrder.filter(id => currentIds.includes(id));
  
  // 순서대로 정렬
  const elementMap = new Map();
  windowElements.forEach(el => {
    const id = getElementIdentifier(el);
    if (id) elementMap.set(id, el);
  });
  const sortedWindows = windowOrder.map(id => elementMap.get(id)).filter(item => item !== undefined && item !== null);
  
  // 버튼 생성
  sortedWindows.forEach(element => {
    createWindowButtonFromElement(container, element);
  });
  
  saveWindowOrder();
}

// DOM element에서 직접 버튼 생성
function createWindowButtonFromElement(container, element) {
  const elementId = getElementIdentifier(element);
  if (!elementId) return;
  
  const button = document.createElement('button');
  button.className = 'taskbar-window-btn';
  button.dataset.appId = elementId;
  button.dataset.windowType = 'element';
  button.draggable = true;
  
  // 숨김 상태 확인 (dialog 요소는 open 속성으로 확인)
  const isHidden = element.tagName === 'DIALOG' 
    ? !element.hasAttribute('open')
    : element.style.display === 'none';
  if (isHidden) {
    button.classList.add('minimized');
  }
  
  // 제목 가져오기
  const name = getElementDisplayName(element, elementId);

  button.innerHTML = `
    <span class="window-name">${name}</span>
  `;
  
  // 드래그 이벤트
  setupButtonDrag(button);
  
  // 클릭 이벤트
  button.addEventListener('click', (e) => {
    e.preventDefault();
    
    // dialog 요소는 open 속성으로 숨김 상태 확인
    const isHidden = element.tagName === 'DIALOG' 
      ? !element.hasAttribute('open')
      : element.style.display === 'none';
    
    if (isHidden) {
      // 숨김 상태면 보이기
      if (element.tagName === 'DIALOG') {
        element.showModal();
      } else {
        element.style.display = '';
      }
      bringElementToTop(element);
      updateTaskbarWindows();
      return;
    }
    
    // z-index가 없거나 0이면 최상단으로 올리기 (새로 생성된 윈도우 처리)
    const currentZIndex = getElementZIndex(element);
    if (currentZIndex === 0) {
      bringElementToTop(element);
      updateTaskbarWindows();
      return;
    }
    
    const isOnTop = checkIfElementOnTop(element);
    
    if (isOnTop) {
      // 최상단이면 숨기기
      if (element.tagName === 'DIALOG') {
        element.close();
      } else {
        element.style.display = 'none';
      }
    } else {
      // 최상단이 아니면 최상단으로
      bringElementToTop(element);
    }
    
    updateTaskbarWindows();
  });
  
  container.appendChild(button);
}

// Element의 실제 z-index 가져오기 (인라인 스타일 또는 계산된 스타일)
function getElementZIndex(element) {
  if (!element) return 0;
  // 인라인 스타일이 있으면 우선 사용
  if (element.style.zIndex) {
    const z = parseInt(element.style.zIndex);
    if (!isNaN(z)) return z;
  }
  // 계산된 스타일에서 z-index 가져오기
  const computed = window.getComputedStyle(element);
  const z = parseInt(computed.zIndex);
  return isNaN(z) ? 0 : z;
}

// Element를 최상단으로
function bringElementToTop(element) {
  if (!element) return;

  const app = findApplicationForElement(element);
  if (app && typeof app.bringToFront === 'function') {
    app.bringToFront();
    return;
  }
  
  // 현재 모든 윈도우 중 최대 z-index 찾기
  let maxZ = 0;
  
  // 추적된 윈도우 요소들
  const allElements = getTrackedWindowElements();
  allElements.forEach(el => {
    if (el === element) return;
    // dialog 요소의 경우 open 속성으로 보이는지 확인
    if (el.tagName === 'DIALOG') {
      if (!el.hasAttribute('open')) return;
    } else {
      if (el.style.display === 'none') return;
    }
    const z = getElementZIndex(el);
    if (z > maxZ) maxZ = z;
  });
  
  // 다른 애플리케이션 윈도우들도 고려
  const appWindows = document.querySelectorAll('.application, .window-app, .sidebar-popout, dialog.application, dialog.dialog');
  appWindows.forEach(el => {
    if (el === element) return;
    // dialog 요소의 경우 open 속성으로 보이는지 확인
    if (el.tagName === 'DIALOG') {
      if (!el.hasAttribute('open')) return;
    } else {
      if (el.style.display === 'none') return;
    }
    const z = getElementZIndex(el);
    if (z > maxZ) maxZ = z;
  });
  
  const currentZIndex = getElementZIndex(element);
  // 9999 이상은 고정 오버레이 등으로 보고 건드리지 않음
  if (currentZIndex >= 9999) return;
  element.style.zIndex = Math.max(maxZ + 1, 100);
}

// Element가 최상단인지 확인
function checkIfElementOnTop(element) {
  if (!element) return false;

  const app = findApplicationForElement(element);
  if (app && typeof app.bringToFront === 'function') {
    return checkIfOnTop(app);
  }
  
  const currentZIndex = getElementZIndex(element);
  
  // 추적된 윈도우 요소들과 비교
  const allElements = getTrackedWindowElements();
  for (let otherElement of allElements) {
    if (otherElement === element) continue;
    // dialog 요소의 경우 open 속성으로 보이는지 확인
    if (otherElement.tagName === 'DIALOG') {
      if (!otherElement.hasAttribute('open')) continue;
    } else {
      if (otherElement.style.display === 'none') continue;
    }
    
    const otherZIndex = getElementZIndex(otherElement);
    if (otherZIndex > currentZIndex) {
      return false;
    }
  }
  
  // 다른 애플리케이션 윈도우들과도 비교
  const appWindows = document.querySelectorAll('.application, .window-app, .sidebar-popout, dialog.application, dialog.dialog');
  for (let otherElement of appWindows) {
    if (otherElement === element) continue;
    // dialog 요소의 경우 open 속성으로 보이는지 확인
    if (otherElement.tagName === 'DIALOG') {
      if (!otherElement.hasAttribute('open')) continue;
    } else {
      if (otherElement.style.display === 'none') continue;
    }
    
    const otherZIndex = getElementZIndex(otherElement);
    if (otherZIndex > currentZIndex) {
      return false;
    }
  }
  
  return true;
}

function createWindowButton(container, app) {
  if (!app) return;
  
  const button = document.createElement('button');
  button.className = 'taskbar-window-btn';
  button.dataset.appId = app.appId || app.id;
  button.dataset.windowType = 'app';
  button.draggable = true;
  
  // element 가져오기
  const element = getAppElement(app);
  
  // 숨김 상태 확인
  const isHidden = element && element.style.display === 'none';
  if (isHidden) {
    button.classList.add('minimized');
  }
  
  // 이름 표시
  const name = app.title || 'Unknown';
  
  button.innerHTML = `
    <span class="window-name">${name}</span>
  `;
  
  // 드래그 이벤트
  setupButtonDrag(button);
  
  // 클릭: 최상단 여부에 따라 동작
  button.addEventListener('click', (e) => {
    e.preventDefault();
    
    const isHidden = element && element.style.display === 'none';
    
    if (isHidden) {
      showOrBringToTop(app);
      return;
    }
    
    const isOnTop = checkIfOnTop(app);
    
    if (isOnTop) {
      hideWindow(app);
    } else {
      showOrBringToTop(app);
    }
  });
  
  container.appendChild(button);
}

function createPopoutButton(container, element) {
  const elementId = getElementIdentifier(element);
  if (!elementId) return;
  
  // 이미 같은 ID의 버튼이 있는지 확인
  if (container.querySelector(`[data-popout-id="${elementId}"]`)) {
    return;
  }
  
  const button = document.createElement('button');
  button.className = 'taskbar-window-btn';
  button.dataset.popoutId = elementId;
  button.dataset.appId = elementId;
  button.dataset.windowType = 'popout';
  button.draggable = true;
  
  // 숨김 상태 확인
  const isHidden = element.style.display === 'none';
  if (isHidden) {
    button.classList.add('minimized');
  }
  
  // 제목 가져오기
  const name = getElementDisplayName(element, elementId);

  button.innerHTML = `
    <span class="window-name">${name}</span>
  `;
  
  // 드래그 이벤트
  setupButtonDrag(button);
  
  // 클릭 이벤트
  button.addEventListener('click', (e) => {
    e.preventDefault();
    
    const isHidden = element.style.display === 'none';
    
    if (isHidden) {
      // 숨김 상태면 보이기
      element.style.display = '';
      bringPopoutToTop(element);
    } else {
      // 보이는 상태: 최상단 여부 확인
      const isOnTop = checkIfPopoutOnTop(element);
      
      if (isOnTop) {
        // 최상단이면 숨기기
        element.style.display = 'none';
      } else {
        // 최상단이 아니면 최상단으로
        bringPopoutToTop(element);
      }
    }
    
    updateTaskbarWindows();
  });
  
  container.appendChild(button);
}

function checkIfPopoutOnTop(element) {
  return checkIfElementOnTop(element);
}

function bringPopoutToTop(element) {
  bringElementToTop(element);
}

function checkIfOnTop(app) {
  if (!app || !app.rendered) return false;
  
  const element = getAppElement(app);
  if (!element) return false;
  
  // 현재 앱의 z-index 가져오기 (element의 실제 z-index 우선, 없으면 app.position.zIndex)
  const currentZIndex = getElementZIndex(element) || app.position?.zIndex || 0;
  
  // 모든 렌더링된 윈도우의 z-index와 비교
  const allWindows = Object.values(ui.windows).filter(w => 
    w.rendered && w.appId !== app.appId
  );
  
  for (let otherWindow of allWindows) {
    const otherElement = getAppElement(otherWindow);
    if (!otherElement) continue;
    
    // display: none인 윈도우는 무시
    if (otherElement.style.display === 'none') continue;
    
    const otherZIndex = getElementZIndex(otherElement) || otherWindow.position?.zIndex || 0;
    
    if (otherZIndex > currentZIndex) {
      return false; // 다른 윈도우가 더 위에 있음
    }
  }
  
  return true; // 최상단
}

function showOrBringToTop(app) {
  if (!app || !app.rendered) return;
  
  const element = getAppElement(app);
  if (!element) return;
  
  const isHidden = element.style.display === 'none';
  
  if (isHidden) {
    // 숨김 상태면 보이기
    element.style.display = '';
  }
  
  // 항상 최상단으로
  app.bringToTop();
  
  // 즉시 업데이트
  updateTaskbarWindows();
}

function hideWindow(app) {
  if (!app || !app.rendered) return;
  
  const element = getAppElement(app);
  if (!element) return;
  
  // 숨기기
  element.style.display = 'none';
  
  // 즉시 업데이트
  updateTaskbarWindows();
}

function updatePerformanceStats() {
  const perfWrap = document.getElementById('taskbar-stats-perf');
  const dateWrap = document.getElementById('taskbar-stats-datetime');

  // lichsoma-daily-calendar: enableCalendar가 켜진 경우에만 날짜 슬롯 사용
  const ldcActive = Boolean(game.modules.get('lichsoma-daily-calendar')?.active);
  const ldcShowDate = ldcActive
    && Boolean(game.settings.get('lichsoma-daily-calendar', 'enableCalendar'));
  const ltwActive = Boolean(game.modules.get('lichsoma-time-and-weather')?.active);

  let showDate = false;
  if (ldcShowDate) {
    showDate = true;
  } else if (ltwActive) {
    showDate = Boolean(game.settings.get('lichsoma-time-and-weather', 'enableCalendar'))
      && Boolean(game.settings.get('lichsoma-time-and-weather', 'taskbarShowDate'));
  }

  if (showDate) {
    if (perfWrap) perfWrap.style.display = 'none';
    if (dateWrap) dateWrap.style.display = '';
    updateTaskbarDateTime();
    return;
  }

  if (perfWrap) perfWrap.style.display = '';
  if (dateWrap) dateWrap.style.display = 'none';

  // DOM에서 직접 지연 시간과 FPS 가져오기
  const latencyElement = document.querySelector('#latency .average');
  const fpsElement = document.querySelector('#fps .average');

  const taskbarLatency = document.getElementById('taskbar-latency');
  const taskbarFps = document.getElementById('taskbar-fps');

  if (taskbarLatency && latencyElement) {
    taskbarLatency.textContent = latencyElement.textContent;
  }

  if (taskbarFps && fpsElement) {
    taskbarFps.textContent = fpsElement.textContent;
  }
}

Hooks.on('lichsomaDailyCalendarRefreshTaskbarStats', () => {
  try {
    updatePerformanceStats();
  } catch (e) {
    // ignore
  }
});

function updateTaskbarDateTime() {
  const dateEl = document.getElementById('taskbar-datetime-date');
  const timeEl = document.getElementById('taskbar-datetime-time');
  if (!dateEl || !timeEl) return;

  // lichsoma-daily-calendar(캘린더 ON) 우선, 없으면 lichsoma-time-and-weather(레거시)
  const ldcCalOn = Boolean(game.modules.get('lichsoma-daily-calendar')?.active)
    && Boolean(game.settings.get('lichsoma-daily-calendar', 'enableCalendar'));
  const sourceId = ldcCalOn ? 'lichsoma-daily-calendar' : 'lichsoma-time-and-weather';

  const baseStr = game.settings.get(sourceId, 'baseCalendarDate');
  const day = Math.max(1, Number(game.settings.get(sourceId, 'currentDay')) || 1);
  const timeOfDay = game.settings.get(sourceId, 'timeOfDay') || 'morning';

  const base = parseBaseDateForTaskbar(baseStr);
  const computed = base ? addDaysToDateForTaskbar(base, day - 1) : null;
  const dateStr = computed ? formatYYMMDDForTaskbar(computed) : '??/??/??';
  const weekday = computed ? getWeekdayKoreanForTaskbar(toUtcDateForTaskbar(computed)) : '';

  const timeLabel =
    timeOfDay === 'morning' ? '오전'
      : timeOfDay === 'afternoon' ? '오후'
        : timeOfDay === 'latenight' ? '심야'
          : '';

  dateEl.textContent = dateStr;
  timeEl.textContent = `${weekday}${weekday ? ' ' : ''}${timeLabel}`.trim();
}

function parseBaseDateForTaskbar(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const m = /^(\d{4})\s*\/\s*(\d{2})\s*\/\s*(\d{2})$/.exec(trimmed);
  if (!m) return null;
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) return null;
  if (yy < 1) return null;
  if (mm < 1 || mm > 12) return null;
  const dim = getDaysInMonthForTaskbar(yy, mm);
  if (dd < 1 || dd > dim) return null;
  return { yy, mm, dd };
}

function getDaysInMonthForTaskbar(yy, mm) {
  const fullYear = Number(yy);
  const isLeap = (fullYear % 4 === 0 && fullYear % 100 !== 0) || fullYear % 400 === 0;
  switch (mm) {
    case 1: return 31;
    case 2: return isLeap ? 29 : 28;
    case 3: return 31;
    case 4: return 30;
    case 5: return 31;
    case 6: return 30;
    case 7: return 31;
    case 8: return 31;
    case 9: return 30;
    case 10: return 31;
    case 11: return 30;
    case 12: return 31;
    default: return 30;
  }
}

function addDaysToDateForTaskbar({ yy, mm, dd }, offsetDays) {
  let y = yy;
  let m = mm;
  let d = dd;
  let remaining = Number(offsetDays) || 0;
  while (remaining !== 0) {
    if (remaining > 0) {
      const dim = getDaysInMonthForTaskbar(y, m);
      if (d < dim) d += 1;
      else {
        d = 1;
        if (m < 12) m += 1;
        else { m = 1; y = y + 1; }
      }
      remaining -= 1;
    } else {
      if (d > 1) d -= 1;
      else {
        if (m > 1) m -= 1;
        else { m = 12; y = y - 1; }
        d = getDaysInMonthForTaskbar(y, m);
      }
      remaining += 1;
    }
  }
  return { yy: y, mm: m, dd: d };
}

function pad2ForTaskbar(n) {
  return String(n).padStart(2, '0');
}

function formatYYMMDDForTaskbar({ yy, mm, dd }) {
  return `${String(yy).padStart(4, '0')}/${pad2ForTaskbar(mm)}/${pad2ForTaskbar(dd)}`;
}

function toUtcDateForTaskbar({ yy, mm, dd }) {
  return new Date(Date.UTC(Number(yy), (mm - 1), dd, 12, 0, 0));
}

function getWeekdayKoreanForTaskbar(date) {
  const labels = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return labels[date.getUTCDay()] ?? '';
}

// 보이는 윈도우가 있는지 확인
function checkAnyWindowVisible() {
  const excludeIds = ['lichsoma-taskbar', 'taskbar-system-menu-panel', 'taskbar-player-list-panel'];
  
  // DOM에서 모든 윈도우 확인
  const allWindowElements = getTrackedWindowElements();
  
  for (let element of allWindowElements) {
    const elementId = getElementIdentifier(element);
    if (elementId && excludeIds.includes(elementId)) continue;
    // dialog 요소의 경우 open 속성으로 보이는지 확인
    if (element.tagName === 'DIALOG') {
      if (element.hasAttribute('open')) {
        return true;
      }
      continue;
    }
    if (element.style.display !== 'none') {
      return true; // 하나라도 보이면 true
    }
  }
  
  return false; // 모두 숨겨져 있음
}

// 모든 윈도우 숨기기
function hideAllWindows() {
  const excludeIds = ['lichsoma-taskbar', 'taskbar-system-menu-panel', 'taskbar-player-list-panel'];
  let hiddenCount = 0;
  
  // DOM에서 모든 윈도우 찾기
  const allWindowElements = getTrackedWindowElements();
  
  allWindowElements.forEach(element => {
    const elementId = getElementIdentifier(element);
    if (elementId && excludeIds.includes(elementId)) return;
    
    // dialog 요소의 경우 close() 메서드로 닫기
    if (element.tagName === 'DIALOG' && element.hasAttribute('open')) {
      element.close();
      hiddenCount++;
      return;
    }
    
    if (element.style.display !== 'none') {
      element.style.display = 'none';
      hiddenCount++;
    }
  });
  
  updateTaskbarWindows();
}

// 모든 윈도우 보이기
function showAllWindows() {
  const excludeIds = ['lichsoma-taskbar', 'taskbar-system-menu-panel', 'taskbar-player-list-panel'];
  let shownCount = 0;
  
  // DOM에서 모든 윈도우 찾기
  const allWindowElements = getTrackedWindowElements();
  
  allWindowElements.forEach(element => {
    const elementId = getElementIdentifier(element);
    if (elementId && excludeIds.includes(elementId)) return;
    
    // dialog 요소의 경우 showModal() 또는 show() 메서드로 열기
    if (element.tagName === 'DIALOG' && !element.hasAttribute('open')) {
      element.showModal();
      shownCount++;
      return;
    }
    
    if (element.style.display === 'none') {
      element.style.display = '';
      shownCount++;
    }
  });
  
  updateTaskbarWindows();
}

// 모든 윈도우 닫기
function closeAllWindows() {
  const excludeIds = ['lichsoma-taskbar', 'taskbar-system-menu-panel', 'taskbar-player-list-panel'];
  
  // DOM에서 모든 윈도우 찾기
  const allWindowElements = getTrackedWindowElements();
  const windowElements = Array.from(allWindowElements).filter(el => {
    const elementId = getElementIdentifier(el);
    if (elementId && excludeIds.includes(elementId)) return false;
    return true;
  });
  
  const totalCount = windowElements.length;
  
  if (totalCount === 0) {
    ui.notifications.info('닫을 윈도우가 없습니다');
    return;
  }
  
  void DialogV2.confirm({
    modal: true,
    window: { title: '모든 윈도우 닫기' },
    content: `<p>열려있는 ${totalCount}개의 윈도우를 모두 닫으시겠습니까?</p>`,
    yes: {
      callback: () => {
        windowElements.forEach(element => {
          const closeBtn = element.querySelector('.header-control[data-action="close"]');
          if (closeBtn) closeBtn.click();
        });
        return true;
      }
    },
    no: { default: true, callback: () => false }
  });
}

// 게임 설정 열기
function openGameSettings() {
  // Foundry VTT의 게임 설정 창 열기
  const settings = game.settings.sheet;
  settings.render(true);
}

// 플레이어 목록 패널
let showOffline = false;

// localStorage에서 오프라인 표시 설정 불러오기
function loadShowOffline() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  const saved = localStorage.getItem(`lichsoma-taskbar-show-offline-${worldId}-${userId}`);
  if (saved !== null) {
    try {
      showOffline = JSON.parse(saved);
    } catch (e) {
      showOffline = false;
    }
  }
}

// localStorage에 오프라인 표시 설정 저장
function saveShowOffline() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  localStorage.setItem(`lichsoma-taskbar-show-offline-${worldId}-${userId}`, JSON.stringify(showOffline));
}

function createPlayerListPanel() {
  const panel = document.createElement('div');
  panel.id = 'taskbar-player-list-panel';
  panel.className = 'taskbar-player-list-panel hidden';
  
  panel.innerHTML = `
    <div class="player-list-header">
      <h3 class="player-list-title">${game.i18n.localize('Taskbar.UserList')}</h3>
      <button class="toggle-offline-btn" title="${game.i18n.localize('Taskbar.ToggleOffline')}">
        <i class="fa-solid fa-eye"></i>
      </button>
    </div>
    <div class="player-list-content" id="player-list-content">
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // 오프라인 토글 버튼
  const toggleBtn = panel.querySelector('.toggle-offline-btn');
  
  // 초기 상태 적용
  const icon = toggleBtn.querySelector('i');
  if (showOffline) {
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    icon.className = 'fa-solid fa-eye';
  }
  
  toggleBtn.addEventListener('click', () => {
    showOffline = !showOffline;
    const icon = toggleBtn.querySelector('i');
    if (showOffline) {
      icon.className = 'fa-solid fa-eye-slash';
    } else {
      icon.className = 'fa-solid fa-eye';
    }
    saveShowOffline();
    updatePlayerList();
  });
  
  updatePlayerList();
  
  // 유저 상태 변경 시 업데이트
  Hooks.on('userConnected', () => updatePlayerList());
  Hooks.on('updateUser', () => updatePlayerList());
}

function togglePlayerList(playersBtn) {
  const playerPanel = document.getElementById('taskbar-player-list-panel');
  const systemPanel = document.getElementById('taskbar-system-menu-panel');
  const screenPanel = document.getElementById('taskbar-screen-panel');
  const logoBtn = document.querySelector('.taskbar-logo');
  const screenBtn = document.querySelector('#taskbar-screen-btn');
  
  if (playerPanel.classList.contains('hidden')) {
    // 플레이어 목록 열기
    playerPanel.classList.remove('hidden');
    if (playersBtn) playersBtn.classList.add('active');
    updatePlayerList();
    
    // 시스템 메뉴 닫기
    if (systemPanel && !systemPanel.classList.contains('hidden')) {
      systemPanel.classList.add('hidden');
      if (logoBtn) logoBtn.classList.remove('active');
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
    // 플레이어 목록 닫기
    playerPanel.classList.add('hidden');
    if (playersBtn) playersBtn.classList.remove('active');
  }
}

/**
 * 플레이어 목록 우클릭 → 호출: 조건이 맞을 때만 callUser
 */
function invokeUserCallIfAllowed(user) {
  if (!user) return;
  if (user.id === game.user.id) return;
  if (!user.active) {
    ui.notifications.warn(game.i18n.localize('Taskbar.UserCall.OfflineWarning'));
    return;
  }
  const allowPlayerCall = game.settings.get('lichsoma-taskbar', 'allowPlayerCall');
  if (!game.user.isGM && !allowPlayerCall) {
    return;
  }
  callUser(user);
}

function updatePlayerList() {
  const content = document.getElementById('player-list-content');
  if (!content) return;
  
  content.innerHTML = '';
  
  // 유저 필터링
  let users = game.users.contents.filter(user => {
    if (!showOffline && !user.active) return false;
    return true;
  });
  
  // 정렬 함수
  users.sort((a, b) => {
    // 1. 접속 상태 (활성화된 유저가 먼저)
    if (a.active !== b.active) {
      return b.active ? 1 : -1;
    }
    
    // 2. 역할 순서: GM(1) → Assistant GM(2) → Trusted Player(3) → Player(4)
    const getRoleOrder = (user) => {
      if (user.isGM) return 1;
      if (user.role === 2) return 2; // ASSISTANT
      if (user.role === 3) return 3; // TRUSTED
      return 4; // PLAYER
    };
    
    const roleA = getRoleOrder(a);
    const roleB = getRoleOrder(b);
    if (roleA !== roleB) {
      return roleA - roleB;
    }
    
    // 3. 이름 정렬: 영어 → 한글 → 숫자
    const nameA = a.name;
    const nameB = b.name;
    
    const getNameType = (name) => {
      const firstChar = name.charAt(0);
      if (/[a-zA-Z]/.test(firstChar)) return 1; // 영어
      if (/[가-힣]/.test(firstChar)) return 2; // 한글
      if (/[0-9]/.test(firstChar)) return 3; // 숫자
      return 4; // 기타
    };
    
    const typeA = getNameType(nameA);
    const typeB = getNameType(nameB);
    
    if (typeA !== typeB) {
      return typeA - typeB;
    }
    
    // 같은 타입 내에서는 알파벳/가나다 순
    return nameA.localeCompare(nameB, 'ko');
  });
  
  users.forEach(user => {
    const userItem = document.createElement('div');
    userItem.className = 'player-list-item';
    
    // 권한 체크: GM이거나 자기 자신인 경우만 수정 가능
    const canEdit = game.user.isGM || game.user.id === user.id;
    if (canEdit) {
      userItem.classList.add('editable');
    }
    
    // GM 클래스 추가
    if (user.isGM) {
      userItem.classList.add('gm');
    }
    
    // 오프라인 유저 클래스 추가
    if (!user.active) {
      userItem.classList.add('offline');
    }
    
    // 상태 점 색상 - 유저 색상 사용
    let statusColor = '#999999'; // 기본값
    
    // user.color가 있으면 사용 (문자열로 변환)
    if (user.color) {
      const colorStr = String(user.color);
      // hex 형식인지 확인 (#으로 시작하거나 6자리 hex)
      if (colorStr.startsWith('#') || /^[0-9A-Fa-f]{6}$/.test(colorStr)) {
        statusColor = colorStr.startsWith('#') ? colorStr : `#${colorStr}`;
      }
    }
    
    // 오프라인인 경우 색상을 어둡게
    if (!user.active && statusColor) {
      try {
        // hex 색상을 어둡게 만들기
        const hex = statusColor.replace('#', '');
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          
          // 50% 어둡게
          const darkR = Math.floor(r * 0.5);
          const darkG = Math.floor(g * 0.5);
          const darkB = Math.floor(b * 0.5);
          
          statusColor = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
        }
      } catch (e) {
        // 변환 실패 시 기본값 사용
        statusColor = '#666666';
      }
    }
    
    // 할당된 액터 이름 가져오기
    let displayName = user.name;
    if (user.character) {
      displayName = `${user.name} [${user.character.name}]`;
    }
    
    userItem.innerHTML = `
      <div class="player-status" style="background-color: ${statusColor};"></div>
      <span class="player-name">${displayName}</span>
      ${user.isGM ? '<span class="player-gm-tag">GM</span>' : ''}
    `;
    
    // 우클릭 이벤트: FoundryVTT 기본 유저 컨텍스트 메뉴 표시
    userItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // FoundryVTT의 기본 유저 컨텍스트 메뉴 표시
      showUserContextMenu(e, user);
    });
    
    content.appendChild(userItem);
  });
}

/**
 * 유저 컨텍스트 메뉴 표시
 */
function showUserContextMenu(event, user) {
  // 기존 컨텍스트 메뉴 제거
  const existingMenu = document.getElementById('context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // 컨텍스트 메뉴 생성
  const contextMenu = document.createElement('nav');
  contextMenu.id = 'context-menu';
  contextMenu.setAttribute('popover', 'manual');
  contextMenu.className = 'expand-up themed theme-dark';
  
  const menu = document.createElement('menu');
  menu.className = 'context-items';
  
  // 사용자 설정
  const settingsItem = document.createElement('li');
  settingsItem.className = 'context-item';
  settingsItem.innerHTML = `<i class="fa-solid fa-person fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.UserSettings')}</span>`;
  settingsItem.addEventListener('click', () => {
    user.sheet.render(true);
    contextMenu.remove();
  });
  menu.appendChild(settingsItem);
  
  // 플레이어 아바타 보기
  const avatarItem = document.createElement('li');
  avatarItem.className = 'context-item';
  avatarItem.innerHTML = `<i class="fa-solid fa-image fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.ViewAvatar')}</span>`;
  avatarItem.addEventListener('click', () => {
    const avatarPath = user.avatar || user.avatarURL || user.avatarImg || 'icons/svg/mystery-man.svg';
    const avatarTitle = game.i18n.localize('Taskbar.UserContext.AvatarTitle');
    const title = `${user.name} - ${avatarTitle}`;
    try {
      new ImagePopout(avatarPath, { title }).render(true);
    } catch (err) {
      // ImagePopout이 실패하면 기본 알림
      ui.notifications.warn(game.i18n.localize('Taskbar.UserContext.AvatarError'));
      window.open(avatarPath, '_blank');
    }
    contextMenu.remove();
  });
  menu.appendChild(avatarItem);
  
  // 유저 호출 (GM 또는 '플레이어 간 호출' 허용 시, 본인 제외)
  if (user.id !== game.user.id && (game.user.isGM || game.settings.get('lichsoma-taskbar', 'allowPlayerCall'))) {
    const callItem = document.createElement('li');
    callItem.className = 'context-item';
    callItem.innerHTML = `<i class="fa-solid fa-bell fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.CallUser')}</span>`;
    callItem.addEventListener('click', () => {
      invokeUserCallIfAllowed(user);
      contextMenu.remove();
    });
    menu.appendChild(callItem);
  }
  
  // 할당된 캐릭터 시트 열기 (캐릭터가 할당된 경우만)
  if (user.character) {
    const characterItem = document.createElement('li');
    characterItem.className = 'context-item';
    characterItem.innerHTML = `<i class="fa-solid fa-user fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.OpenCharacterSheet')}</span>`;
    characterItem.addEventListener('click', () => {
      user.character.sheet.render(true);
      contextMenu.remove();
    });
    menu.appendChild(characterItem);
  }
  
  // GM만 사용 가능한 옵션들
  if (game.user.isGM) {
    // 장면으로 불러오기
    const bringToSceneItem = document.createElement('li');
    bringToSceneItem.className = 'context-item';
    bringToSceneItem.innerHTML = `<i class="fa-solid fa-diamond-turn-right fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.BringToScene')}</span>`;
    bringToSceneItem.addEventListener('click', async () => {
      try {
        if (canvas?.scene?.pullUsers) {
          await canvas.scene.pullUsers([user.id]);
        } else if (user.character) {
          const token = user.character.getActiveTokens()[0];
          if (token) {
            await token.update({ hidden: false });
            canvas.animatePan({ x: token.x, y: token.y });
          }
        }
      } finally {
        contextMenu.remove();
      }
    });
    menu.appendChild(bringToSceneItem);
    
    // 플레이어 강제 퇴장
    const kickItem = document.createElement('li');
    kickItem.className = 'context-item';
    kickItem.innerHTML = `<i class="fa-solid fa-door-open fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.KickPlayer')}</span>`;
    kickItem.addEventListener('click', async () => {
      const kickTitle = game.i18n.localize('Taskbar.UserContext.KickPlayerTitle');
      const kickConfirm = game.i18n.format('Taskbar.UserContext.KickPlayerConfirm', { name: user.name });
      const confirmed = await DialogV2.confirm({
        modal: true,
        window: { title: kickTitle },
        content: `<p>${kickConfirm}</p>`,
        yes: { callback: () => true },
        no: { default: true, callback: () => false }
      });
      
      if (confirmed) {
        const previousRole = user.role;
        await user.update({ role: CONST.USER_ROLES.NONE });
        await user.update({ role: previousRole }, { diff: false });
        const kickSuccess = game.i18n.format('Taskbar.UserContext.KickPlayerSuccess', { name: user.name });
        ui.notifications.info(kickSuccess);
      }
      contextMenu.remove();
    });
    menu.appendChild(kickItem);
    
    // 플레이어 차단
    if (user.role !== CONST.USER_ROLES.NONE) {
      const banItem = document.createElement('li');
      banItem.className = 'context-item';
      banItem.innerHTML = `<i class="fa-solid fa-ban fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.BanPlayer')}</span>`;
      banItem.addEventListener('click', async () => {
        const banTitle = game.i18n.localize('Taskbar.UserContext.BanPlayerTitle');
        const banConfirm = game.i18n.format('Taskbar.UserContext.BanPlayerConfirm', { name: user.name });
        const confirmed = await DialogV2.confirm({
          modal: true,
          window: { title: banTitle },
          content: `<p>${banConfirm}</p>`,
          yes: { callback: () => true },
          no: { default: true, callback: () => false }
        });
        
        if (confirmed) {
          await user.update({ role: CONST.USER_ROLES.NONE });
          const banSuccess = game.i18n.format('Taskbar.UserContext.BanPlayerSuccess', { name: user.name });
          ui.notifications.info(banSuccess);
        }
        contextMenu.remove();
      });
      menu.appendChild(banItem);
    } else {
      const unbanItem = document.createElement('li');
      unbanItem.className = 'context-item';
      unbanItem.innerHTML = `<i class="fa-solid fa-user-check fa-fw"></i><span>${game.i18n.localize('Taskbar.UserContext.UnbanPlayer')}</span>`;
      unbanItem.addEventListener('click', async () => {
        await user.update({ role: CONST.USER_ROLES.PLAYER });
        const unbanSuccess = game.i18n.format('Taskbar.UserContext.UnbanPlayerSuccess', { name: user.name });
        ui.notifications.info(unbanSuccess);
        contextMenu.remove();
      });
      menu.appendChild(unbanItem);
    }
  }
  
  contextMenu.appendChild(menu);
  document.body.appendChild(contextMenu);
  
  // 위치 설정
  const rect = contextMenu.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  let left = x;
  let bottom = windowHeight - y;
  
  // 오른쪽 경계 체크
  if (x + rect.width > windowWidth) {
    left = windowWidth - rect.width - 10;
  }
  
  // 위쪽 경계 체크 (bottom 기준)
  if (y - rect.height < 0) {
    bottom = windowHeight - y - rect.height - 10;
  }
  
  contextMenu.style.left = `${left}px`;
  contextMenu.style.bottom = `${bottom}px`;
  
  // 메뉴 표시
  contextMenu.showPopover();
  
  // 외부 클릭 시 닫기
  const closeMenu = (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
  }, 0);
}

// 버튼 드래그 앤 드롭 설정
function setupButtonDrag(button) {
  // 드래그 시작
  button.addEventListener('dragstart', (e) => {
    draggedButton = button;
    button.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', button.innerHTML);
  });
  
  // 드래그 종료
  button.addEventListener('dragend', (e) => {
    button.classList.remove('dragging');
    draggedButton = null;
  });
  
  // 드래그 오버
  button.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedButton || draggedButton === button) return;
    
    // 드래그 중인 버튼과 현재 버튼의 위치 비교
    const container = button.parentElement;
    const allButtons = Array.from(container.children);
    const draggedIndex = allButtons.indexOf(draggedButton);
    const currentIndex = allButtons.indexOf(button);
    
    if (draggedIndex < currentIndex) {
      // 드래그 버튼이 위쪽에서 아래로
      button.parentElement.insertBefore(draggedButton, button.nextSibling);
    } else {
      // 드래그 버튼이 아래쪽에서 위로
      button.parentElement.insertBefore(draggedButton, button);
    }
  });
  
  // 드롭
  button.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedButton) return;
    
    // 현재 버튼 순서를 windowOrder에 반영
    const container = button.parentElement;
    const allButtons = Array.from(container.children);
    windowOrder = allButtons.map(btn => btn.dataset.appId).filter(id => id);
    
    saveWindowOrder();
  });
}

// 윈도우 헤더 더블클릭 이벤트를 테스크바 최소화로 대체
function replaceHeaderDoubleClick(app, html) {
  if (!app || !html) return;
  
  // jQuery 객체인 경우 HTMLElement로 변환
  const element = html instanceof jQuery ? html[0] : html;
  if (!element) return;
  
  // window-header 찾기
  const header = element.querySelector('.window-header');
  if (!header) return;
  
  // 이미 리스너가 추가되었는지 확인
  if (header.hasAttribute('data-taskbar-dblclick-handled')) return;
  header.setAttribute('data-taskbar-dblclick-handled', 'true');
  
  // capture phase에서 이벤트를 먼저 가로채기 (기존 Foundry 이벤트보다 먼저 실행됨)
  header.addEventListener('dblclick', (e) => {
    // window-header를 클릭한 경우만 (버튼이나 다른 요소는 제외)
    if (e.target !== header && !e.target.classList.contains('window-title')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // 테스크바에 최소화
    const appElement = getAppElement(app);
    if (appElement) {
      // dialog 요소인 경우
      if (appElement.tagName === 'DIALOG') {
        appElement.close();
      } else {
        appElement.style.display = 'none';
      }
      updateTaskbarWindows();
    }
    
    return false;
  }, { capture: true }); // capture phase에서 실행
}

// 시스템 메뉴는 lichsoma-taskbar-system-menu.js에서 구현
// 설정 폼은 lichsoma-taskbar-settings.js에서 구현

// ============================================
// 유저 호출 기능
// ============================================

/**
 * User 또는 색상 값을 플레이어 목록 점(user.color)과 동일한 #rrggbb 로 맞춤
 * @param {string|number|{ color?: string|number }|undefined} value
 * @param {string} [fallback='#ff6600']
 */
function resolveUserColorToHex(value, fallback = '#ff6600') {
  if (value == null) return fallback;
  let c;
  if (typeof value === 'object' && value !== null && 'color' in value) {
    c = value.color;
  } else {
    c = value;
  }
  if (c == null || c === '') return fallback;
  if (typeof c === 'number') {
    return `#${(c & 0xffffff).toString(16).padStart(6, '0')}`;
  }
  const colorStr = String(c).trim();
  if (colorStr.startsWith('#')) {
    if (colorStr.length === 7) return colorStr.toLowerCase();
    if (colorStr.length === 4) {
      const r = colorStr[1];
      const g = colorStr[2];
      const b = colorStr[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return fallback;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(colorStr)) return `#${colorStr.toLowerCase()}`;
  return fallback;
}

/**
 * @param {string} hex — #rrggbb
 * @returns {string} text-shadow
 */
function buildUserCallTextShadow(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) {
    return buildUserCallTextShadow('#ff6600');
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [
    `-2px -2px 0 ${hex}`,
    `2px -2px 0 ${hex}`,
    `-2px 2px 0 ${hex}`,
    `2px 2px 0 ${hex}`,
    `0 0 10px rgba(${r},${g},${b},0.8)`,
    `0 0 20px rgba(${r},${g},${b},0.6)`,
    `0 0 30px rgba(${r},${g},${b},0.4)`,
    `0 0 40px rgba(${r},${g},${b},0.2)`,
  ].join(', ');
}

/**
 * 유저 호출 소켓 리스너 설정
 */
function setupUserCallSocket() {
  game.socket.on('module.lichsoma-taskbar', (data) => {
    if (data.type === 'userCall') {
      // 자신에게 온 호출인지 확인
      if (data.targetUserId === game.user.id) {
        // 호출 사운드 재생
        const soundPath = game.settings.get('lichsoma-taskbar', 'userCallSound');
        const soundVolume = game.settings.get('lichsoma-taskbar', 'userCallSoundVolume');
        
        if (soundPath && foundry?.audio?.AudioHelper) {
          foundry.audio.AudioHelper.play({
            src: soundPath,
            volume: soundVolume,
            autoplay: true,
            loop: false
          }, false);
        }
        
        // 호출 메시지 표시
        const callerName = data.callerName;
        const message = game.i18n.format('Taskbar.UserCall.Message', { caller: callerName });
        showUserCallMessage(message, { callerColor: data.callerColor });
      }
    }
  });
}

/**
 * 유저 호출
 */
function callUser(targetUser) {
  if (!targetUser) return;
  
  // 소켓으로 호출 메시지 전송
  game.socket.emit('module.lichsoma-taskbar', {
    type: 'userCall',
    targetUserId: targetUser.id,
    callerName: game.user.name,
    callerColor: resolveUserColorToHex(game.user)
  });
}

/**
 * 유저 호출 메시지 표시 (화면 중앙)
 * @param {string} message
 * @param {{ callerColor?: string }} [options] — callerColor: #rrggbb (호출한 유저 색, 플레이어 목록 점과 동일)
 */
function showUserCallMessage(message, options = {}) {
  // 기존 메시지가 있으면 제거
  hideUserCallMessage();
  
  const accent = resolveUserColorToHex(options.callerColor, '#ff6600');
  const glow = buildUserCallTextShadow(accent);
  
  // 메시지 생성
  const messageElement = document.createElement('div');
  messageElement.id = 'lichsoma-taskbar-user-call-message';
  messageElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    padding: 40px 60px;
    font-size: 48px;
    font-weight: bold;
    text-align: center;
    z-index: 10001;
    animation: taskbar-call-appear 0.3s ease-out, taskbar-call-pulse 2s ease-in-out infinite;
    pointer-events: none;
    white-space: pre-wrap;
    max-width: 80%;
    font-family: Arial, sans-serif;
    text-shadow: ${glow};
  `;
  messageElement.textContent = message;
  
  document.body.appendChild(messageElement);
  
  // CSS 애니메이션 추가
  if (!document.getElementById('taskbar-call-message-style')) {
    const style = document.createElement('style');
    style.id = 'taskbar-call-message-style';
    style.textContent = `
      @keyframes taskbar-call-appear {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes taskbar-call-pulse {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          transform: translate(-50%, -50%) scale(1.1);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // 마우스 이동·키보드 입력 감지 후(아래 setTimeout ms) 1초 동안 투명도만 페이드(펄스 transform 유지)
  userCallInteractionAbort = new AbortController();
  const { signal } = userCallInteractionAbort;
  
  const onUserActivity = () => {
    if (userCallInteractionAbort) {
      try {
        userCallInteractionAbort.abort();
      } catch (_) { /* no-op */ }
      userCallInteractionAbort = null;
    }
    if (userCallDismissTimeout) {
      clearTimeout(userCallDismissTimeout);
      userCallDismissTimeout = null;
    }
    userCallDismissTimeout = setTimeout(() => {
      userCallDismissTimeout = null;
      const msg = document.getElementById('lichsoma-taskbar-user-call-message');
      if (msg) {
        // transform은 taskbar-call-pulse에 맡기고, opacity만 서서히 제거
        msg.style.willChange = 'opacity';
        msg.style.transition = 'opacity 1s ease-out';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = document.getElementById('lichsoma-taskbar-user-call-message');
            if (el) el.style.opacity = '0';
          });
        });
        setTimeout(() => {
          hideUserCallMessage();
        }, 750);
      }
    }, 1000);
  };
  
  document.addEventListener('mousemove', onUserActivity, { once: true, signal });
  document.addEventListener('keydown', onUserActivity, { once: true, signal });
}

/**
 * 유저 호출 메시지 제거
 */
function hideUserCallMessage() {
  if (userCallInteractionAbort) {
    try {
      userCallInteractionAbort.abort();
    } catch (_) { /* no-op */ }
    userCallInteractionAbort = null;
  }
  if (userCallDismissTimeout) {
    clearTimeout(userCallDismissTimeout);
    userCallDismissTimeout = null;
  }
  const messageElement = document.getElementById('lichsoma-taskbar-user-call-message');
  if (messageElement) {
    messageElement.remove();
  }
}

