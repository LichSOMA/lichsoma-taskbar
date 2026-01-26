// LichSOMA's Taskbar - Hotbar Toggle

Hooks.once('init', () => {
  // 시작 시 핫바 숨김 설정
  game.settings.register('lichsoma-taskbar', 'startWithHideHotbar', {
    name: 'Taskbar.StartWithHideHotbar',
    hint: 'Taskbar.StartWithHideHotbarHint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
});

Hooks.once('ready', () => {
  // 핫바 토글 기능 초기화
  initializeHotbarToggle();
});

/**
 * 핫바 토글 기능 초기화
 */
function initializeHotbarToggle() {
  // 핫바 메뉴 버튼을 찾아서 기능 변경
  setTimeout(() => {
    modifyHotbarMenuButton();
    
    // 설정에 따라 시작 시 핫바 숨김
    const startHidden = game.settings.get('lichsoma-taskbar', 'startWithHideHotbar');
    if (startHidden) {
      hideHotbar();
    }
  }, 100);
  
  // 핫바 렌더링 Hook 추가 (핫바가 다시 렌더링될 때마다 버튼 재설정)
  Hooks.on('renderHotbar', () => {
    setTimeout(() => {
      modifyHotbarMenuButton();
    }, 10);
  });
}

/**
 * 핫바 메뉴 버튼을 핫바 숨김 버튼으로 변경
 */
function modifyHotbarMenuButton() {
  const hotbar = document.getElementById('hotbar');
  if (!hotbar) return;
  
  // 메뉴 버튼 찾기
  const menuButton = hotbar.querySelector('button[data-action="menu"]');
  if (!menuButton) return;
  
  // 이미 이벤트가 추가되었는지 확인
  if (menuButton.dataset.hotbarModified === 'true') {
    return; // 이미 수정되어 있으면 종료
  }
  
  // 수정 완료 표시
  menuButton.dataset.hotbarModified = 'true';
  
  // 툴팁만 변경 (디자인은 그대로 유지)
  menuButton.setAttribute('data-tooltip', 'Taskbar.HideHotbar');
  menuButton.setAttribute('aria-label', game.i18n.localize('Taskbar.HideHotbar'));
  
  // 클릭 이벤트 추가 (기존 이벤트는 그대로 두고 캡처 단계에서 가로채기)
  menuButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    hideHotbar();
  }, true); // 캡처 단계에서 처리
}

/**
 * 핫바 숨기기
 */
function hideHotbar() {
  const hotbar = document.getElementById('hotbar');
  if (!hotbar) return;
  
  hotbar.style.display = 'none';
  
  // 핫바 보이기 버튼 생성
  createShowHotbarButton();
}

/**
 * 핫바 보이기
 */
function showHotbar() {
  const hotbar = document.getElementById('hotbar');
  if (!hotbar) return;
  
  hotbar.style.display = '';
  
  // 핫바 보이기 버튼 제거
  removeShowHotbarButton();
}

/**
 * 핫바 보이기 버튼 생성
 */
function createShowHotbarButton() {
  // 기존 버튼이 있으면 제거
  removeShowHotbarButton();
  
  const button = document.createElement('button');
  button.id = 'taskbar-show-hotbar-btn';
  button.className = 'taskbar-show-hotbar-btn';
  button.innerHTML = '<i class="fa-solid fa-caret-up"></i>';
  button.setAttribute('data-tooltip', 'Taskbar.ShowHotbar');
  button.setAttribute('data-tooltip-direction', 'UP');
  button.setAttribute('aria-label', game.i18n.localize('Taskbar.ShowHotbar'));
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showHotbar();
  });
  
  // ui-bottom에 추가
  const uiBottom = document.getElementById('ui-bottom');
  if (uiBottom) {
    uiBottom.appendChild(button);
  }
}

/**
 * 핫바 보이기 버튼 제거
 */
function removeShowHotbarButton() {
  const button = document.getElementById('taskbar-show-hotbar-btn');
  if (button) {
    button.remove();
  }
}

