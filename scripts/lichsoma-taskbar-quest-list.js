// LichSOMA's Taskbar Quest List Script

// 퀘스트 패널 열림 상태 (클라이언트 단위)
let questListVisible = false;

// 퀘스트 데이터 구조: { id: string, title: string, objectives: [{ id: string, text: string, status: 'none'|'success'|'failure' }] }
let quests = [];

// localStorage에서 퀘스트 패널 상태 불러오기
function loadQuestListVisible() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  const saved = localStorage.getItem(`lichsoma-taskbar-quest-list-visible-${worldId}-${userId}`);
  if (saved !== null) {
    try {
      questListVisible = JSON.parse(saved);
    } catch (e) {
      questListVisible = false;
    }
  }
}

// localStorage에 퀘스트 패널 상태 저장
function saveQuestListVisible() {
  const worldId = game.world?.id || 'default';
  const userId = game.user?.id || 'default';
  localStorage.setItem(`lichsoma-taskbar-quest-list-visible-${worldId}-${userId}`, JSON.stringify(questListVisible));
}

// 퀘스트 패널 생성
window.createQuestListPanel = function() {
  const panel = document.createElement('div');
  panel.id = 'taskbar-quest-list-panel';
  // 저장된 상태에 따라 초기 표시 여부 결정
  panel.className = questListVisible ? 'taskbar-quest-list-panel' : 'taskbar-quest-list-panel hidden';
  
  panel.innerHTML = `
    <div class="quest-list-header">
      <h3 class="quest-list-title">${game.i18n.localize('Taskbar.Quest')}</h3>
      <div class="quest-header-buttons">
        ${game.user.isGM ? `<button class="quest-add-btn" id="quest-add-btn" title="${game.i18n.localize('Taskbar.QuestAdd')}">
          <i class="fa-solid fa-plus"></i>
        </button>` : ''}
        ${game.user.isGM ? `<button class="quest-reset-btn" id="quest-reset-btn" title="${game.i18n.localize('Taskbar.QuestResetAll')}">
          <i class="fa-solid fa-rotate-left"></i>
        </button>` : ''}
      </div>
    </div>
    <div class="quest-list-content" id="quest-list-content">
      <!-- 퀘스트 항목들이 여기에 추가됩니다 -->
    </div>
  `;
  
  // + 버튼 클릭 이벤트 (GM만)
  if (game.user.isGM) {
    const addBtn = panel.querySelector('#quest-add-btn');
    if (addBtn) {
      // mousedown 이벤트도 추가 (더 확실하게)
      addBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        addBtn.blur(); // focus 제거
        // 퀘스트 추가 다이얼로그 열기
        window.addQuest();
        return false;
      }, true); // 캡처 단계에서 처리
    } else {
      console.warn('퀘스트 추가 버튼을 찾을 수 없습니다.');
    }
    
    // 초기화 버튼 클릭 이벤트 (GM만)
    const resetBtn = panel.querySelector('#quest-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      resetBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        resetBtn.blur();
        
        // 확인 다이얼로그
        const confirmed = await Dialog.confirm({
          title: game.i18n.localize('Taskbar.QuestResetAll'),
          content: game.i18n.localize('Taskbar.QuestResetAllConfirm'),
          yes: () => true,
          no: () => false,
          defaultYes: false
        });
        
        if (confirmed) {
          quests = [];
          await saveQuests();
          updateQuestList();
        }
        
        return false;
      }, true);
    }
  }
  
  // ui-right-column-1에 추가 (enemy-hud와 같은 위치)
  const uiRightColumn = document.getElementById('ui-right-column-1');
  if (uiRightColumn) {
    // enemy-hud 다음에 추가
    const enemyHud = document.getElementById('dx3rd-enemy-hud');
    if (enemyHud) {
      // enemy-hud 다음에 추가
      if (enemyHud.nextSibling) {
        uiRightColumn.insertBefore(panel, enemyHud.nextSibling);
      } else {
        uiRightColumn.appendChild(panel);
      }
    } else {
      // enemy-hud가 없으면 첫 번째 자식으로 추가
      uiRightColumn.insertBefore(panel, uiRightColumn.firstChild);
    }
  } else {
    // ui-right-column-1이 없으면 body에 추가
    document.body.appendChild(panel);
  }
  
  // 초기 위치 설정
  updateQuestListPosition();
  
  // 사이드바 변화 감지 시작
  observeQuestListSidebarChanges();
  
  // 저장된 상태에 따라 버튼 상태 업데이트
  const questBtn = document.querySelector('#taskbar-quest-btn');
  if (questBtn && questListVisible) {
    questBtn.classList.add('active');
  }
  
  // 퀘스트 목록 업데이트
  updateQuestList();
  
  // 마우스휠 이벤트 처리 (스크롤이 제대로 작동하도록)
  const questListContent = panel.querySelector('#quest-list-content');
  
  // 패널 전체에서 wheel 이벤트 캡처 (확대/축소 방지)
  // 캡처 단계에서 처리하여 Foundry의 전역 wheel 핸들러보다 먼저 처리
  panel.addEventListener('wheel', (e) => {
    // 패널 내부에서 발생한 모든 wheel 이벤트는 기본 동작과 전파를 막음
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // 컨텐츠 영역이 스크롤 가능한 경우 스크롤 처리
    if (questListContent && questListContent.scrollHeight > questListContent.clientHeight) {
      const delta = e.deltaY || e.deltaX || 0;
      questListContent.scrollTop += delta;
    }
  }, true); // 캡처 단계에서 처리
  
  // 컨텐츠 영역에서도 wheel 이벤트 처리 (이중 보호)
  if (questListContent) {
    questListContent.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // 스크롤 가능한 경우 스크롤 처리
      if (questListContent.scrollHeight > questListContent.clientHeight) {
        const delta = e.deltaY || e.deltaX || 0;
        questListContent.scrollTop += delta;
      }
    }, true); // 캡처 단계에서 처리
  }
};

// ready 훅에서 상태 불러오기 및 Socket 등록
Hooks.once('ready', () => {
  loadQuestListVisible();
  registerQuestSettings();
  setupQuestSocket();
  loadQuests();
  updateQuestList();
});

// 퀘스트 설정 등록
function registerQuestSettings() {
  game.settings.register('lichsoma-taskbar', 'quests', {
    name: 'Quest Data',
    scope: 'world',
    config: false,
    type: Object,
    default: [],
    onChange: (value) => {
      // 설정이 변경되면 모든 클라이언트에서 업데이트
      quests = value || [];
      updateQuestList();
    }
  });
}

// Socket 통신 설정
function setupQuestSocket() {
  // 기존 리스너 제거 (중복 방지)
  game.socket.off('module.lichsoma-taskbar');
  
  game.socket.on('module.lichsoma-taskbar', (data) => {
    if (data.type === 'updateQuests') {
      // 모든 클라이언트에서 업데이트
      quests = data.quests || [];
      updateQuestList();
    }
  });
}

// Socket으로 모든 클라이언트에 퀘스트 업데이트 전송
function syncQuests() {
  if (game.user.isGM) {
    game.socket.emit('module.lichsoma-taskbar', {
      type: 'updateQuests',
      quests: quests
    });
  }
}

// 퀘스트 불러오기
function loadQuests() {
  quests = game.settings.get('lichsoma-taskbar', 'quests') || [];
}

// 퀘스트 저장하기
async function saveQuests() {
  await game.settings.set('lichsoma-taskbar', 'quests', quests);
  syncQuests();
}

// 퀘스트 리스트 위치 업데이트 (sidebar 넓이 기반, enemy-hud와 동일)
function updateQuestListPosition() {
  const questPanel = document.getElementById('taskbar-quest-list-panel');
  if (!questPanel) return;
  
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    // sidebar가 없으면 기본값 사용
    questPanel.style.right = '20px';
    return;
  }
  
  // sidebar가 collapsed 상태인지 확인
  const isCollapsed = sidebar.classList.contains('collapsed');
  const sidebarWidth = sidebar.offsetWidth;
  
  if (isCollapsed) {
    // collapsed 상태: 아이콘만 보이므로 작은 여백
    questPanel.style.right = '20px';
  } else {
    // expanded 상태: sidebar 넓이 + 여백
    const rightPos = sidebarWidth + 30;
    questPanel.style.right = `${rightPos}px`;
  }
}

// Sidebar 변화 감지 (enemy-hud와 동일한 로직)
function observeQuestListSidebarChanges() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    return;
  }
  
  // MutationObserver를 사용하여 sidebar의 class 변화 감지
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // sidebar의 collapsed 상태가 변경되었을 때 즉시 위치 업데이트
        updateQuestListPosition();
      }
    });
  });
  
  // sidebar의 class 속성 변화 감지 시작
  mutationObserver.observe(sidebar, {
    attributes: true,
    attributeFilter: ['class']
  });
  
  // ResizeObserver를 사용하여 sidebar의 실제 크기 변화 감지
  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      // sidebar의 크기가 변경되었을 때
      updateQuestListPosition();
    }
  });
  
  // sidebar의 크기 변화 감지 시작
  resizeObserver.observe(sidebar);
  
  // 윈도우 리사이즈 시에도 업데이트
  window.addEventListener('resize', () => {
    updateQuestListPosition();
  });
}

// 퀘스트 패널 토글
window.toggleQuestList = function(questBtn) {
  const questPanel = document.getElementById('taskbar-quest-list-panel');
  const systemPanel = document.getElementById('taskbar-system-menu-panel');
  const playerPanel = document.getElementById('taskbar-player-list-panel');
  const screenPanel = document.getElementById('taskbar-screen-panel');
  const logoBtn = document.querySelector('.taskbar-logo');
  const playersBtn = document.querySelector('#taskbar-players-btn');
  const screenBtn = document.querySelector('#taskbar-screen-btn');
  
  if (!questPanel) {
    // 패널이 없으면 생성
    if (typeof window.createQuestListPanel === 'function') {
      window.createQuestListPanel();
      // 생성 후 다시 토글
      setTimeout(() => {
        window.toggleQuestList(questBtn);
      }, 50);
    }
    return;
  }
  
  if (questPanel.classList.contains('hidden')) {
    // 퀘스트 패널 열기
    questPanel.classList.remove('hidden');
    if (questBtn) questBtn.classList.add('active');
    questListVisible = true;
    saveQuestListVisible();
    
    // 다른 패널들 닫기
    if (systemPanel && !systemPanel.classList.contains('hidden')) {
      systemPanel.classList.add('hidden');
      if (logoBtn) logoBtn.classList.remove('active');
    }
    
    if (playerPanel && !playerPanel.classList.contains('hidden')) {
      playerPanel.classList.add('hidden');
      if (playersBtn) playersBtn.classList.remove('active');
    }
    
    if (screenPanel && !screenPanel.classList.contains('hidden')) {
      screenPanel.classList.add('hidden');
      if (screenBtn) {
        screenBtn.classList.remove('active');
        const icon = screenBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-book';
      }
    }
  } else {
    // 퀘스트 패널 닫기
    questPanel.classList.add('hidden');
    if (questBtn) questBtn.classList.remove('active');
    questListVisible = false;
    saveQuestListVisible();
  }
};

// 전투 시작 시 퀘스트 리스트 자동 닫기
Hooks.on('createCombat', (combat, options, userId) => {
  const questPanel = document.getElementById('taskbar-quest-list-panel');
  const questBtn = document.querySelector('#taskbar-quest-btn');
  
  if (questPanel && !questPanel.classList.contains('hidden')) {
    questPanel.classList.add('hidden');
    if (questBtn) questBtn.classList.remove('active');
    questListVisible = false;
    saveQuestListVisible();
  }
});

// 퀘스트 추가 함수
window.addQuest = async function() {
  if (!game.user.isGM) return;
  
  const result = await openQuestEditDialog(null);
  if (!result) return;
  
  // 새 퀘스트 생성
  const newQuest = {
    id: `quest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: result.title,
    objectives: result.objectives.map((text, index) => ({
      id: `obj-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      text: text,
      status: 'none'
    }))
  };
  
  quests.push(newQuest);
  await saveQuests();
  updateQuestList();
};

// 퀘스트 수정 다이얼로그 열기
async function openQuestEditDialog(quest) {
  const isEdit = quest !== null;
  const currentTitle = quest ? quest.title : '';
  const currentObjectives = quest ? quest.objectives.map(obj => obj.text) : [''];
  
  return await new Promise((resolve) => {
    // 목표 입력 필드 생성
    const objectivesHtml = currentObjectives.map((obj, index) => `
      <div class="form-group objective-input-group">
        <label>${game.i18n.localize('Taskbar.QuestObjective')} ${index + 1}</label>
        <div style="display: flex; gap: 4px;">
          <input type="text" name="objective${index + 1}" value="${obj}" placeholder="${game.i18n.localize('Taskbar.QuestObjectivePlaceholder')}" style="flex: 1;" />
          ${currentObjectives.length > 1 ? `<button type="button" class="remove-objective-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>
    `).join('');
    
    const dialog = new Dialog({
      title: isEdit ? game.i18n.localize('Taskbar.QuestEdit') : game.i18n.localize('Taskbar.QuestAdd'),
      content: `
        <form id="quest-edit-form">
          <div class="form-group">
            <label>${game.i18n.localize('Taskbar.QuestTitle')}</label>
            <input type="text" name="title" value="${currentTitle}" placeholder="${game.i18n.localize('Taskbar.QuestTitlePlaceholder')}" required />
          </div>
          <div id="objectives-container">
            ${objectivesHtml}
          </div>
          <div class="form-group">
            <button type="button" id="add-objective-btn" style="width: 100%; margin-top: 5px;">
              <i class="fa-solid fa-plus"></i> ${game.i18n.localize('Taskbar.QuestAddObjective')}
            </button>
          </div>
        </form>
      `,
      buttons: {
        save: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('Taskbar.Save'),
          callback: (html) => {
            const title = html.find('[name="title"]').val().trim();
            const objectives = [];
            
            // 모든 목표 입력 필드에서 값 가져오기
            html.find('input[name^="objective"]').each(function() {
              const value = $(this).val().trim();
              if (value) {
                objectives.push(value);
              }
            });
            
            if (!title || objectives.length === 0) {
              ui.notifications.warn(game.i18n.localize('Taskbar.QuestMinObjectives'));
              resolve(null);
              return;
            }
            
            resolve({ title, objectives });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Taskbar.Cancel'),
          callback: () => resolve(null)
        }
      },
      default: 'save',
      render: (html) => {
        let objectiveCount = currentObjectives.length;
        
        // 목표 추가 버튼
        html.find('#add-objective-btn').on('click', () => {
          objectiveCount++;
          const newObjectiveHtml = `
            <div class="form-group objective-input-group">
              <label>${game.i18n.localize('Taskbar.QuestObjective')} ${objectiveCount}</label>
              <div style="display: flex; gap: 4px;">
                <input type="text" name="objective${objectiveCount}" placeholder="${game.i18n.localize('Taskbar.QuestObjectivePlaceholder')}" style="flex: 1;" />
                <button type="button" class="remove-objective-btn" data-index="${objectiveCount - 1}"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `;
          html.find('#objectives-container').append(newObjectiveHtml);
          
          // 삭제 버튼 이벤트 추가
          html.find('.remove-objective-btn').off('click').on('click', function() {
            const group = $(this).closest('.objective-input-group');
            group.remove();
            // 라벨 번호 재정렬
            html.find('.objective-input-group').each(function(index) {
              $(this).find('label').text(`${game.i18n.localize('Taskbar.QuestObjective')} ${index + 1}`);
            });
          });
        });
        
        // 목표 삭제 버튼
        html.find('.remove-objective-btn').on('click', function() {
          const group = $(this).closest('.objective-input-group');
          // 최소 1개는 유지
          if (html.find('.objective-input-group').length <= 1) {
            ui.notifications.warn(game.i18n.localize('Taskbar.QuestMinObjectives'));
            return;
          }
          group.remove();
          // 라벨 번호 재정렬
          html.find('.objective-input-group').each(function(index) {
            $(this).find('label').text(`${game.i18n.localize('Taskbar.QuestObjective')} ${index + 1}`);
          });
        });
      }
    });
    
    dialog.render(true);
  });
}

// 퀘스트 목록 업데이트
function updateQuestList() {
  const content = document.getElementById('quest-list-content');
  if (!content) return;
  
  content.innerHTML = '';
  
  if (quests.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'quest-empty-message';
    emptyMsg.textContent = game.i18n.localize('Taskbar.QuestNoQuests');
    content.appendChild(emptyMsg);
    return;
  }
  
  quests.forEach(quest => {
    const questItem = createQuestItem(quest);
    content.appendChild(questItem);
  });
}

// 퀘스트 아이템 생성
function createQuestItem(quest) {
  const questDiv = document.createElement('div');
  questDiv.className = 'quest-item';
  questDiv.dataset.questId = quest.id;
  
  // 퀘스트 헤더
  const questHeader = document.createElement('div');
  questHeader.className = 'quest-item-header';
  questHeader.style.cursor = 'pointer';
  
  // 타이틀과 토글 아이콘을 함께 감싸는 컨테이너
  const titleContainer = document.createElement('div');
  titleContainer.className = 'quest-title-container';
  
  const questTitle = document.createElement('span');
  questTitle.className = 'quest-item-title';
  questTitle.textContent = quest.title;
  titleContainer.appendChild(questTitle);
  
  // 토글 아이콘 (타이틀 오른쪽)
  const toggleIcon = document.createElement('i');
  toggleIcon.className = 'fa-solid fa-chevron-up quest-toggle-icon';
  titleContainer.appendChild(toggleIcon);
  
  questHeader.appendChild(titleContainer);
  
  // 헤더 클릭 시 오브젝티브 리스트 토글
  questHeader.addEventListener('click', (e) => {
    // 버튼 클릭 시에는 토글하지 않음
    if (e.target.closest('.quest-item-controls') || e.target.closest('.quest-edit-btn') || e.target.closest('.quest-delete-btn')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const objectivesList = questDiv.querySelector('.quest-objectives-list');
    if (objectivesList) {
      const isCollapsed = objectivesList.classList.contains('collapsed');
      if (isCollapsed) {
        objectivesList.classList.remove('collapsed');
        questDiv.classList.remove('quest-collapsed');
      } else {
        objectivesList.classList.add('collapsed');
        questDiv.classList.add('quest-collapsed');
      }
    }
  });
  
  // GM만 수정/삭제 버튼 표시
  if (game.user.isGM) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'quest-item-controls';
    
    // 수정 버튼
    const editBtn = document.createElement('button');
    editBtn.className = 'quest-edit-btn';
    editBtn.title = game.i18n.localize('Taskbar.QuestEdit');
    editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
    editBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const result = await openQuestEditDialog(quest);
      if (!result) return;
      
      quest.title = result.title;
      // 기존 목표의 상태 유지하면서 텍스트 업데이트
      result.objectives.forEach((text, index) => {
        if (index < quest.objectives.length) {
          quest.objectives[index].text = text;
        } else {
          quest.objectives.push({
            id: `obj-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
            text: text,
            status: 'none'
          });
        }
      });
      // 삭제된 목표 제거
      if (result.objectives.length < quest.objectives.length) {
        quest.objectives = quest.objectives.slice(0, result.objectives.length);
      }
      
      await saveQuests();
      updateQuestList();
    });
    controlsDiv.appendChild(editBtn);
    
    // 삭제 버튼
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'quest-delete-btn';
    deleteBtn.title = game.i18n.localize('Taskbar.QuestDelete');
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize('Taskbar.QuestDelete'),
        content: game.i18n.localize('Taskbar.QuestDeleteConfirm'),
        yes: () => true,
        no: () => false,
        defaultYes: false
      });
      if (confirmed) {
        quests = quests.filter(q => q.id !== quest.id);
        await saveQuests();
        updateQuestList();
      }
    });
    controlsDiv.appendChild(deleteBtn);
    
    questHeader.appendChild(controlsDiv);
  }
  
  questDiv.appendChild(questHeader);
  
  // 달성 목표 목록
  const objectivesList = document.createElement('div');
  objectivesList.className = 'quest-objectives-list';
  
  quest.objectives.forEach((objective, index) => {
    const objectiveItem = createObjectiveItem(quest, objective, index);
    objectivesList.appendChild(objectiveItem);
  });
  
  questDiv.appendChild(objectivesList);
  
  return questDiv;
}

// 달성 목표 아이템 생성
function createObjectiveItem(quest, objective, index) {
  const objectiveDiv = document.createElement('div');
  objectiveDiv.className = 'quest-objective-item';
  objectiveDiv.dataset.objectiveId = objective.id;
  
  // 상태에 따른 클래스 추가
  if (objective.status === 'success') {
    objectiveDiv.classList.add('objective-success');
  } else if (objective.status === 'failure') {
    objectiveDiv.classList.add('objective-failure');
  }
  
  const objectiveText = document.createElement('span');
  objectiveText.className = 'quest-objective-text';
  let textContent = objective.text;
  if (objective.status === 'success') {
    textContent += ` (${game.i18n.localize('Taskbar.QuestSuccess')})`;
  } else if (objective.status === 'failure') {
    textContent += ` (${game.i18n.localize('Taskbar.QuestFailure')})`;
  }
  objectiveText.textContent = textContent;
  objectiveDiv.appendChild(objectiveText);
  
  // GM만 상태 변경 버튼 표시
  if (game.user.isGM) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'quest-objective-controls';
    
    // 성공 버튼
    if (objective.status !== 'success') {
      const successBtn = document.createElement('button');
      successBtn.className = 'quest-objective-btn quest-objective-success-btn';
      successBtn.title = game.i18n.localize('Taskbar.QuestMarkSuccess');
      successBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
      successBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        objective.status = 'success';
        await saveQuests();
        updateQuestList();
      });
      controlsDiv.appendChild(successBtn);
    }
    
    // 실패 버튼
    if (objective.status !== 'failure') {
      const failureBtn = document.createElement('button');
      failureBtn.className = 'quest-objective-btn quest-objective-failure-btn';
      failureBtn.title = game.i18n.localize('Taskbar.QuestMarkFailure');
      failureBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      failureBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        objective.status = 'failure';
        await saveQuests();
        updateQuestList();
      });
      controlsDiv.appendChild(failureBtn);
    }
    
    // 상태 초기화 버튼
    if (objective.status !== 'none') {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'quest-objective-btn quest-objective-reset-btn';
      resetBtn.title = game.i18n.localize('Taskbar.QuestResetStatus');
      resetBtn.innerHTML = '<i class="fa-solid fa-undo"></i>';
      resetBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        objective.status = 'none';
        await saveQuests();
        updateQuestList();
      });
      controlsDiv.appendChild(resetBtn);
    }
    
    objectiveDiv.appendChild(controlsDiv);
  }
  
  return objectiveDiv;
}

