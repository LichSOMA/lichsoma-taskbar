// LichSOMA's Taskbar - Tagger

// FVTT 14 DocumentSheetV2: renderActorSheet / renderItemSheet 만으로는 V2 시트에 훅이 걸리지 않음
// → renderActorSheetV2 / renderItemSheetV2 동시 구독 (lichsoma-speaker-selector lichsoma-actor-emotions.js 와 동일)
// V1 시트만 레거시(flat 링크) 스타일 — V2 훅에서는 --legacy-sheet 미부착

/**
 * @param {boolean} fromSheetV2Hook - renderActorSheetV2 / renderItemSheetV2 에서 호출되면 true
 */
function applyLegacySheetTagButtonClass($button, windowHeader, fromSheetV2Hook) {
  if (fromSheetV2Hook) return;
  const sheetRoot = windowHeader.closest('.application, .window-app');
  const isAppV2 = windowHeader.closest('.application-v2').length > 0;
  if (sheetRoot.length && !isAppV2) {
    $button.addClass('taskbar-tags-manage-btn--legacy-sheet');
  }
}

function injectActorTagsButton(app, html, fromActorSheetV2Hook = false) {
  const actor = app.actor || app.object || app.document;
  if (!actor) return;

  const ownershipLevel = actor.ownership[game.userId];
  if (ownershipLevel !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return;

  const $root = html?.jquery ? html : $(html);
  const windowHeader = $root.find('.window-header');
  if (!windowHeader.length) return;

  if (windowHeader.find('.taskbar-tags-manage-btn').length) return;

  const manageTitle = game.i18n.localize('Taskbar.TagsManagement');
  const tagsLabel = game.i18n.localize('Taskbar.Tags');
  const tagsButton = $(`
    <button type="button" class="header-control taskbar-tags-manage-btn" title="${manageTitle}" aria-label="${manageTitle}">
      <i class="fa-solid fa-tags"></i>
      <span class="taskbar-tags-manage-label">${tagsLabel}</span>
    </button>
  `);

  applyLegacySheetTagButtonClass(tagsButton, windowHeader, fromActorSheetV2Hook);

  const stopDragHandshake = (ev) => {
    ev.stopPropagation();
  };
  tagsButton.on('pointerdown', stopDragHandshake);
  tagsButton.on('mousedown', stopDragHandshake);

  tagsButton.on('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openActorTagsDialog(actor);
  });

  const toggleBtn = windowHeader.find('button[data-action="toggleControls"]');
  if (toggleBtn.length) {
    toggleBtn.first().before(tagsButton);
  } else {
    const title = windowHeader.find('.window-title').first();
    if (title.length) {
      title.after(tagsButton);
    } else {
      const closeBtn = windowHeader.find('[data-action="close"], .close');
      if (closeBtn.length) {
        closeBtn.first().before(tagsButton);
      } else {
        windowHeader.prepend(tagsButton);
      }
    }
  }
}

Hooks.on('renderActorSheet', (app, html) => injectActorTagsButton(app, html, false));
Hooks.on('renderActorSheetV2', (app, html) => injectActorTagsButton(app, html, true));

function injectItemTagsButton(app, html, fromItemSheetV2Hook = false) {
  const item = app.item || app.object || app.document;
  if (!item) return;

  const ownershipLevel = item.ownership[game.userId];
  if (ownershipLevel !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return;

  const $root = html?.jquery ? html : $(html);
  const windowHeader = $root.find('.window-header');
  if (!windowHeader.length) return;

  if (windowHeader.find('.taskbar-tags-manage-btn').length) return;

  const manageTitle = game.i18n.localize('Taskbar.TagsManagement');
  const tagsLabel = game.i18n.localize('Taskbar.Tags');
  const tagsButton = $(`
    <button type="button" class="header-control taskbar-tags-manage-btn" title="${manageTitle}" aria-label="${manageTitle}">
      <i class="fa-solid fa-tags"></i>
      <span class="taskbar-tags-manage-label">${tagsLabel}</span>
    </button>
  `);

  applyLegacySheetTagButtonClass(tagsButton, windowHeader, fromItemSheetV2Hook);

  const stopDragHandshake = (ev) => {
    ev.stopPropagation();
  };
  tagsButton.on('pointerdown', stopDragHandshake);
  tagsButton.on('mousedown', stopDragHandshake);

  tagsButton.on('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openItemTagsDialog(item);
  });

  const toggleBtn = windowHeader.find('button[data-action="toggleControls"]');
  if (toggleBtn.length) {
    toggleBtn.first().before(tagsButton);
  } else {
    const title = windowHeader.find('.window-title').first();
    if (title.length) {
      title.after(tagsButton);
    } else {
      const closeBtn = windowHeader.find('[data-action="close"], .close');
      if (closeBtn.length) {
        closeBtn.first().before(tagsButton);
      } else {
        windowHeader.append(tagsButton);
      }
    }
  }
}

Hooks.on('renderItemSheet', (app, html) => injectItemTagsButton(app, html, false));
Hooks.on('renderItemSheetV2', (app, html) => injectItemTagsButton(app, html, true));

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
  if (windowHeader.find('.taskbar-tags-manage-btn').length) return;

  const manageTitle = game.i18n.localize('Taskbar.TagsManagement');
  const tagsLabel = game.i18n.localize('Taskbar.Tags');

  const tagsButton = $(`
    <button type="button" class="header-control taskbar-tags-manage-btn" title="${manageTitle}" aria-label="${manageTitle}">
      <i class="fa-solid fa-tags"></i>
      <span class="taskbar-tags-manage-label">${tagsLabel}</span>
    </button>
  `);

  applyLegacySheetTagButtonClass(tagsButton, windowHeader, false);

  const stopDragHandshake = (ev) => {
    ev.stopPropagation();
  };
  tagsButton.on('pointerdown', stopDragHandshake);
  tagsButton.on('mousedown', stopDragHandshake);
  
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
 * 태그 다이얼로그 본문 이벤트 (DialogV2 렌더 후)
 * @param {foundry.applications.api.DialogV2} dialog
 */
function attachTagsDialogContentHandlers(dialog) {
  const $html = $(dialog.element);
  const $container = $html.find('#tags-container');

  const removeTitle = game.i18n.localize('COMMON.Delete');
  const placeholder = game.i18n.localize('Taskbar.Tags');

  const addEmptyTagRow = () => {
    const row = $('<div class="tag-item"></div>');
    const input = $('<input type="text" class="tag-input" autocomplete="off" />');
    input.attr('placeholder', placeholder);
    const rm = $('<button type="button" class="tag-remove-btn"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>');
    rm.attr('title', removeTitle);
    rm.attr('aria-label', removeTitle);
    row.append(input, rm);
    $container.append(row);
    input.trigger('focus');
  };

  $html.find('#tags-dialog-add-btn').on('click', (e) => {
    e.preventDefault();
    addEmptyTagRow();
  });

  $container.on('click', '.tag-remove-btn', function() {
    $(this).closest('.tag-item').remove();
  });
}

/**
 * 공통 태그 다이얼로그 열기 (DialogV2)
 * @param {Actor|Item|Scene} doc - 태그를 관리할 문서 객체 (매개변수명을 document로 두면 전역 document와 충돌)
 * @param {string} documentName - 문서 이름
 */
async function openTagsDialog(doc, documentName) {
  const currentTags = doc.getFlag('lichsoma-taskbar', 'tags') || [];

  const contentHtml = await foundry.applications.handlebars.renderTemplate(
    'modules/lichsoma-taskbar/templates/tags-dialog.html',
    {
      headerTitle: game.i18n.localize('Taskbar.TagsManagement'),
      tagsAddLabel: game.i18n.localize('Taskbar.TagsAdd'),
      removeLabel: game.i18n.localize('COMMON.Delete'),
      tagPlaceholder: game.i18n.localize('Taskbar.Tags'),
      tags: currentTags
    }
  );

  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = contentHtml;

  const DialogV2 = foundry.applications.api.DialogV2;
  const dlg = new DialogV2({
    id: `lichsoma-taskbar-tags-${foundry.utils.randomID()}`,
    window: {
      title: `${game.i18n.localize('Taskbar.TagsManagement')}: ${documentName}`
    },
    position: { width: 400 },
    content: contentDiv,
    buttons: [{
      action: 'save',
      label: 'Taskbar.TagsSave',
      icon: 'fa-solid fa-floppy-disk',
      default: true
    }],
    submit: async (result, dialog) => {
      if (result === 'save') {
        const tags = [];
        $(dialog.element).find('.tags-dialog .tag-item .tag-input').each((_, el) => {
          const v = $(el).val().trim();
          if (v) tags.push(v);
        });
        await doc.setFlag('lichsoma-taskbar', 'tags', tags);
        ui.notifications.info(game.i18n.localize('Taskbar.TagsSaved'));
      }
    },
    form: { closeOnSubmit: true }
  });

  dlg.addEventListener('render', () => {
    attachTagsDialogContentHandlers(dlg);
  }, { once: true });

  await dlg.render({ force: true });
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
