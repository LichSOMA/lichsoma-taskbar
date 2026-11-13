import {getTaskbarAppearanceSetting, setTaskbarAppearanceSetting, APPEARANCE_DEFAULTS} from './lichsoma-taskbar-appearance-storage.js';
// LichSOMA's Taskbar - Settings Form
import {getTaskbarTheme, getInheritedSpeakerTheme, TASKBAR_THEMES, TASKBAR_THEME_PRESETS, TASKBAR_THEME_APPLIED} from './lichsoma-taskbar-theme.js';
import {TaskbarWebfontEditor} from './lichsoma-taskbar-webfont.js';

const DialogV2 = window.LichsomaTaskbarCompat?.DialogV2 ?? foundry?.applications?.api?.DialogV2 ?? globalThis.DialogV2;

// 커스텀 설정 다이얼로그 (DialogV2)
window.TaskbarSettingsForm = class TaskbarSettingsForm extends DialogV2 {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "lichsoma-taskbar-settings",
    position: {width:600, height:'auto'},
    window: {
      title: "Taskbar.SettingsFormTitle",
      resizable: true
    }
  });

  constructor(options = {}) {
    const inherited = getInheritedSpeakerTheme();
    const color = inherited ? TASKBAR_THEME_PRESETS[inherited].color : getTaskbarAppearanceSetting("taskbarColor");
    const opacity = getTaskbarAppearanceSetting("taskbarOpacity");
    const theme = getTaskbarTheme();

    const content = `
      <p class="taskbar-theme-inheritance hint" ${inherited ? '' : 'hidden'}>${game.i18n.localize('Taskbar.Theme.Inherited')}</p>
      <div class="form-group">
        <label>${game.i18n.localize('Taskbar.Theme.Name')}</label>
        <div class="form-fields"><select name="theme">${Object.entries(TASKBAR_THEMES).map(([value,key]) => `<option value="${value}" ${value === theme ? 'selected' : ''}>${game.i18n.localize(key)}</option>`).join('')}</select></div>
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("Taskbar.SettingsColor")}</label>
        <div class="form-fields taskbar-color-fields">
          <input type="color" name="color" value="${color}" aria-label="${game.i18n.localize('Taskbar.SettingsColor')}">
          <input type="text" name="colorText" value="${color}" placeholder="#RRGGBB">
        </div>
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("Taskbar.SettingsOpacity")}</label>
        <div class="form-fields">
          <input type="range" name="opacity" min="0" max="100" step="5" value="${opacity}">
          <input type="number" name="opacityNumber" min="0" max="100" step="5" value="${opacity}">
        </div>
      </div>
      <div class="form-group">
        <label>${game.i18n.localize('Taskbar.Webfont.Name')}</label>
        <div class="form-fields"><button type="button" class="edit-webfont"><i class="fa-solid fa-font"></i> ${game.i18n.localize('Taskbar.Webfont.Edit')}</button></div>
      </div>
    `;

    super(foundry.utils.mergeObject({
      modal: false,
      content,
      buttons: [
        {
          action: "save",
          label: "Taskbar.Save",
          icon: "fa-solid fa-floppy-disk",
          default: true,
          callback: async (_event, _target, dialog) => {
            const el = dialog.element;
            const picked = el.querySelector('input[name="color"]')?.value?.trim();
            const typed = el.querySelector('input[name="colorText"]')?.value?.trim();
            const colorValue = (/^#[0-9A-F]{6}$/i.test(typed || "") ? typed : picked) || APPEARANCE_DEFAULTS.taskbarColor;

            const opacityRaw = el.querySelector('input[name="opacity"]')?.value ?? opacity;
            const opacityValue = Number(opacityRaw);

            const themeValue = el.querySelector('[name="theme"]')?.value;
            if (!getInheritedSpeakerTheme()) {
              await setTaskbarAppearanceSetting("theme", Object.hasOwn(TASKBAR_THEMES, themeValue) ? themeValue : 'dark-simple');
              await setTaskbarAppearanceSetting("taskbarColor", colorValue);
            }
            await setTaskbarAppearanceSetting("taskbarOpacity", Number.isFinite(opacityValue) ? opacityValue : opacity);

            ui.notifications.info(game.i18n.localize("Taskbar.SettingsSaveSuccess"));
          }
        },
        {
          action: "reset",
          label: "Taskbar.SettingsReset",
          icon: "fa-solid fa-rotate-left",
          callback: async (_event, _target, dialog) => {
            const confirmed = await DialogV2.confirm({
              modal: true,
              window: { title: game.i18n.localize("Taskbar.SettingsResetTitle") },
              content: `<p>${game.i18n.localize("Taskbar.SettingsResetContent")}</p>`,
              yes: { callback: () => true },
              no: { default: true, callback: () => false }
            });
            if (!confirmed) return;

            for (const key of ['theme', 'taskbarColor', 'taskbarOpacity', 'taskbarWebfontCSS']) {
              if (getInheritedSpeakerTheme() && ['theme', 'taskbarColor'].includes(key)) continue;
              await setTaskbarAppearanceSetting(key, APPEARANCE_DEFAULTS[key]);
            }

            ui.notifications.info(game.i18n.localize("Taskbar.SettingsResetSuccess"));
            dialog.close();
          }
        },
        {
          action: "cancel",
          label: "Taskbar.Cancel",
          icon: "fa-solid fa-xmark"
        }
      ]
    }, options));
  }

  /** @override */
  _onRender(...args) {
    super._onRender(...args);

    const root = this.element;
    const color = root.querySelector('input[name="color"]');
    const colorText = root.querySelector('input[name="colorText"]');
    const opacity = root.querySelector('input[name="opacity"]');
    const opacityNumber = root.querySelector('input[name="opacityNumber"]');
    const theme = root.querySelector('select[name="theme"]');
    let wasInherited = false;
    const syncInheritance = () => {
      const inherited = getInheritedSpeakerTheme();
      for (const field of [theme, color, colorText]) if (field) field.disabled = Boolean(inherited);
      const note = root.querySelector('.taskbar-theme-inheritance');
      if (note) note.hidden = !inherited;
      if (inherited) {
        theme.value = inherited;
        color.value = colorText.value = TASKBAR_THEME_PRESETS[inherited].color;
      } else if (wasInherited) {
        theme.value = getTaskbarTheme();
        color.value = colorText.value = getTaskbarAppearanceSetting('taskbarColor');
      }
      wasInherited = Boolean(inherited);
    };
    this._themeInheritanceAbort?.abort();
    this._themeInheritanceAbort = new AbortController();
    const {signal} = this._themeInheritanceAbort;
    document.addEventListener(TASKBAR_THEME_APPLIED, syncInheritance, {signal});
    syncInheritance();
    const fillThemePreset = () => {
      if (getInheritedSpeakerTheme()) return;
      const preset = TASKBAR_THEME_PRESETS[theme.value];
      if (!preset) return;
      color.value = colorText.value = preset.color;
      opacity.value = opacityNumber.value = String(preset.opacity);
    };
    theme?.addEventListener('change', fillThemePreset, {signal});
    root.querySelector('.edit-webfont')?.addEventListener('click', event => {
      event.preventDefault();
      new TaskbarWebfontEditor().render(true);
    }, {signal});

    if (color && colorText) {
      color.addEventListener("input", () => (colorText.value = color.value), { passive: true, signal });
      colorText.addEventListener("input", () => {
        const value = colorText.value.trim();
        if (/^#[0-9A-F]{6}$/i.test(value)) color.value = value;
      }, { passive: true, signal });
    }

    if (opacity && opacityNumber) {
      const sync = (v) => {
        opacity.value = String(v);
        opacityNumber.value = String(v);
      };
      opacity.addEventListener("input", () => sync(opacity.value), { passive: true, signal });
      opacityNumber.addEventListener("input", () => sync(opacityNumber.value), { passive: true, signal });
    }
  }

  _onClose(...args) {
    this._themeInheritanceAbort?.abort();
    return super._onClose?.(...args);
  }
};

