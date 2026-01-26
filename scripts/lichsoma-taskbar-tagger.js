// LichSOMA's Taskbar - Tagger

// 액터 시트에 태그 버튼 추가
Hooks.on('renderActorSheet', (app, html, data) => {
  if (!app.actor) return;
  
  // 소유자 권한 체크
  const ownershipLevel = app.actor.ownership[game.userId];
  if (ownershipLevel !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return;
  
  // 헤더에 태그 버튼 추가
  const windowHeader = html.find('.window-header');
  if (!windowHeader.length) return;
  
  // 이미 버튼이 있으면 추가하지 않음
  if (windowHeader.find('.actor-tags-button').length) return;
  
  // 태그 버튼 생성
  const tagsButton = $(`
    <a class="actor-tags-button" title="${game.i18n.localize('Taskbar.TagsManagement')}">
      <i class="fa-solid fa-tags"></i> ${game.i18n.localize('Taskbar.Tags')}
    </a>
  `);
  
  // 버튼 클릭 이벤트
  tagsButton.on('click', () => {
    openActorTagsDialog(app.actor);
  });
  
  // 닫기 버튼 앞에 추가
  windowHeader.find('.close').before(tagsButton);
});

// 아이템 시트에 태그 버튼 추가
Hooks.on('renderItemSheet', (app, html, data) => {
  if (!app.item) return;
  
  // 소유자 권한 체크
  const ownershipLevel = app.item.ownership[game.userId];
  if (ownershipLevel !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return;
  
  const windowHeader = html.find('.window-header');
  if (!windowHeader.length) return;
  
  // 이미 버튼이 있으면 추가하지 않음
  if (windowHeader.find('.item-tags-button').length) return;
  
  // 태그 버튼 생성
  const tagsButton = $(`
    <a class="item-tags-button" title="${game.i18n.localize('Taskbar.TagsManagement')}">
      <i class="fa-solid fa-tags"></i> ${game.i18n.localize('Taskbar.Tags')}
    </a>
  `);
  
  // 버튼 클릭 이벤트
  tagsButton.on('click', () => {
    openItemTagsDialog(app.item);
  });
  
  // 닫기 버튼 바로 앞에 추가
  const closeButton = windowHeader.find('.close');
  if (closeButton.length) {
    closeButton.before(tagsButton);
  } else {
    windowHeader.append(tagsButton);
  }
});

// 장면 설정에 태그 버튼 추가
Hooks.on('renderSceneConfig', (app, html, data) => {
  // v10+ 에서는 app.document 사용
  const scene = app.document || app.object;
  if (!scene) return;
  
  // jQuery 객체인지 확인하고 아니면 변환
  const $html = html instanceof jQuery ? html : $(html);
  
  // 여러 방법으로 헤더 찾기 시도
  let windowHeader = $html.find('.window-header');
  if (!windowHeader.length) {
    windowHeader = $html.find('header.window-header');
  }
  if (!windowHeader.length) {
    windowHeader = $html.closest('.window-app').find('.window-header');
  }
  if (!windowHeader.length) {
    windowHeader = $(app.element).find('.window-header');
  }
  
  if (!windowHeader.length) return;
  
  // 이미 버튼이 있으면 추가하지 않음
  if (windowHeader.find('.scene-tags-button').length) return;
  
  // 태그 버튼 생성
  const tagsButton = $(`
    <button type="button" class="header-control scene-tags-button" title="${game.i18n.localize('Taskbar.TagsManagement')}" aria-label="${game.i18n.localize('Taskbar.TagsManagement')}">
      <i class="fa-solid fa-tags"></i> <span class="label">${game.i18n.localize('Taskbar.Tags')}</span>
    </button>
  `);
  
  // 버튼 클릭 이벤트
  tagsButton.on('click', (e) => {
    e.preventDefault();
    openSceneTagsDialog(scene);
  });
  
  // toggleControls 버튼 바로 앞에 추가
  const toggleButton = windowHeader.find('[data-action="toggleControls"]');
  if (toggleButton.length) {
    toggleButton.before(tagsButton);
  } else {
    // toggleControls 버튼이 없으면 닫기 버튼 앞에 추가
    const closeButton = windowHeader.find('[data-action="close"]');
    if (closeButton.length) {
      closeButton.before(tagsButton);
    } else {
      windowHeader.append(tagsButton);
    }
  }
});

// ============================================
// 공통 태그 관리 기능
// ============================================

/**
 * 공통 태그 다이얼로그 열기
 * @param {Actor|Item|Scene} document - 태그를 관리할 문서 객체
 * @param {string} documentName - 문서 이름
 */
async function openTagsDialog(document, documentName) {
  // 현재 태그 가져오기
  const currentTags = document.getFlag('lichsoma-taskbar', 'tags') || [];
  
  // 템플릿 렌더링
  const content = await renderTemplate('modules/lichsoma-taskbar/templates/tags-dialog.html', {
    label: game.i18n.localize('Taskbar.Tags'),
    tags: currentTags
  });
  
  // 현재 태그 상태를 저장하는 헬퍼 함수
  const saveTags = (html) => {
    const tags = [];
    html.find('.tag-item.confirmed').each((i, el) => {
      const input = $(el).find('.tag-input');
      const value = input.val().trim();
      if (value) {
        tags.push(value);
      }
    });
    
    // Flag에 저장
    document.setFlag('lichsoma-taskbar', 'tags', tags);
  };
  
  // 다이얼로그 생성 (버튼 없음)
  new Dialog({
    title: `${game.i18n.localize('Taskbar.TagsManagement')}: ${documentName}`,
    content: content,
    buttons: {},
    render: (html) => {
      const container = html.find('#tags-container');
      
      // 새 태그 입력 시 확정된 태그로 변환하고 자동 저장
      const newTagInput = html.find('.new-tag-input');
      newTagInput.on('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const value = newTagInput.val().trim();
          if (value) {
            // 새 확정 태그 추가
            const newTagItem = $(`
              <div class="tag-item confirmed">
                <input type="text" class="tag-input" value="${value}" readonly />
                <button type="button" class="tag-remove-btn" title="Remove">×</button>
              </div>
            `);
            
            // 삭제 버튼 이벤트 (삭제 시 자동 저장)
            newTagItem.find('.tag-remove-btn').on('click', function() {
              newTagItem.remove();
              saveTags(html);
            });
            
            // new-tag 앞에 추가
            html.find('.new-tag').before(newTagItem);
            newTagInput.val('');
            
            // 자동 저장
            saveTags(html);
          }
        }
      });
      
      // 기존 태그의 삭제 버튼 이벤트 (삭제 시 자동 저장)
      html.find('.tag-item.confirmed .tag-remove-btn').on('click', function() {
        $(this).closest('.tag-item').remove();
        saveTags(html);
      });
    }
  }, {
    width: 400
  }).render(true);
}

// ============================================
// 액터 태그 관리 기능
// ============================================

/**
 * 액터 태그 관리 다이얼로그
 */
function openActorTagsDialog(actor) {
  openTagsDialog(actor, actor.name);
}

// ============================================
// 아이템 태그 관리 기능
// ============================================

/**
 * 아이템 태그 관리 다이얼로그
 */
function openItemTagsDialog(item) {
  openTagsDialog(item, item.name);
}

// ============================================
// 장면 태그 관리 기능
// ============================================

/**
 * 장면 태그 관리 다이얼로그
 */
function openSceneTagsDialog(scene) {
  openTagsDialog(scene, scene.name);
}
