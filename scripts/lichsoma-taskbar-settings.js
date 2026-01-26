// LichSOMA's Taskbar - Settings Form

// 커스텀 설정 폼
window.TaskbarSettingsForm = class TaskbarSettingsForm extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'lichsoma-taskbar-settings',
      title: game.i18n.localize('Taskbar.SettingsFormTitle'),
      template: 'modules/lichsoma-taskbar/templates/taskbar-settings.html',
      width: 500,
      height: 'auto',
      closeOnSubmit: true,
      submitOnClose: false
    });
  }

  getData() {
    return {
      color: game.settings.get('lichsoma-taskbar', 'taskbarColor'),
      opacity: game.settings.get('lichsoma-taskbar', 'taskbarOpacity')
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // 초기화 버튼
    html.find('button[name="reset"]').click(async (ev) => {
      ev.preventDefault();
      
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize('Taskbar.SettingsResetTitle'),
        content: `<p>${game.i18n.localize('Taskbar.SettingsResetContent')}</p>`,
        yes: () => true,
        no: () => false,
        defaultYes: false
      });
      
      if (confirmed) {
        await game.settings.set('lichsoma-taskbar', 'taskbarColor', '#0B0A13');
        await game.settings.set('lichsoma-taskbar', 'taskbarOpacity', 100);
        
        ui.notifications.info(game.i18n.localize('Taskbar.SettingsResetSuccess'));
        window.location.reload();
      }
    });
    
    // 색상 선택기와 텍스트 입력 동기화
    html.find('input[name="color"]').on('input', (ev) => {
      html.find('input[name="colorText"]').val(ev.target.value);
    });
    
    html.find('input[name="colorText"]').on('input', (ev) => {
      const value = ev.target.value;
      if (/^#[0-9A-F]{6}$/i.test(value)) {
        html.find('input[name="color"]').val(value);
      }
    });
  }

  async _updateObject(event, formData) {
    await game.settings.set('lichsoma-taskbar', 'taskbarColor', formData.color);
    await game.settings.set('lichsoma-taskbar', 'taskbarOpacity', formData.opacity);
    
    ui.notifications.info(game.i18n.localize('Taskbar.SettingsSaveSuccess'));
    window.location.reload();
  }
};

