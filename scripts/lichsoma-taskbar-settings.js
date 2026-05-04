// LichSOMA's Taskbar - Settings Form

const DialogV2 = foundry.applications.api.DialogV2;

// 커스텀 설정 다이얼로그 (DialogV2)
window.TaskbarSettingsForm = class TaskbarSettingsForm extends DialogV2 {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "lichsoma-taskbar-settings",
    window: {
      title: "Taskbar.SettingsFormTitle"
    }
  });

  constructor(options = {}) {
    const color = game.settings.get("lichsoma-taskbar", "taskbarColor");
    const opacity = game.settings.get("lichsoma-taskbar", "taskbarOpacity");

    const content = `
      <div class="form-group">
        <label>${game.i18n.localize("Taskbar.SettingsColor")}</label>
        <div class="form-fields">
          <input type="color" name="color" value="${color}">
          <input type="text" name="colorText" value="${color}" placeholder="#RRGGBB">
        </div>
        <p class="hint">${game.i18n.localize("Taskbar.SettingsColorHint")}</p>
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("Taskbar.SettingsOpacity")}</label>
        <div class="form-fields">
          <input type="range" name="opacity" min="0" max="100" step="5" value="${opacity}">
          <input type="number" name="opacityNumber" min="0" max="100" step="5" value="${opacity}" style="width: 6ch;">
        </div>
        <p class="hint">${game.i18n.localize("Taskbar.SettingsOpacityHint")}</p>
      </div>
    `;

    super(foundry.utils.mergeObject({
      modal: true,
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
            const colorValue = (/^#[0-9A-F]{6}$/i.test(typed || "") ? typed : picked) || "#0B0A13";

            const opacityRaw = el.querySelector('input[name="opacity"]')?.value ?? opacity;
            const opacityValue = Number(opacityRaw);

            await game.settings.set("lichsoma-taskbar", "taskbarColor", colorValue);
            await game.settings.set("lichsoma-taskbar", "taskbarOpacity", Number.isFinite(opacityValue) ? opacityValue : opacity);

            ui.notifications.info(game.i18n.localize("Taskbar.SettingsSaveSuccess"));
            window.location.reload();
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

            await game.settings.set("lichsoma-taskbar", "taskbarColor", "#0B0A13");
            await game.settings.set("lichsoma-taskbar", "taskbarOpacity", 100);

            ui.notifications.info(game.i18n.localize("Taskbar.SettingsResetSuccess"));
            dialog.close();
            window.location.reload();
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

    if (color && colorText) {
      color.addEventListener("input", () => (colorText.value = color.value), { passive: true });
      colorText.addEventListener("input", () => {
        const value = colorText.value.trim();
        if (/^#[0-9A-F]{6}$/i.test(value)) color.value = value;
      }, { passive: true });
    }

    if (opacity && opacityNumber) {
      const sync = (v) => {
        opacity.value = String(v);
        opacityNumber.value = String(v);
      };
      opacity.addEventListener("input", () => sync(opacity.value), { passive: true });
      opacityNumber.addEventListener("input", () => sync(opacityNumber.value), { passive: true });
    }
  }
};

