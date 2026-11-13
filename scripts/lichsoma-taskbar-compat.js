// LichSOMA's Taskbar - FVTT v13/v14 compatibility helpers

window.LichsomaTaskbarCompat = window.LichsomaTaskbarCompat || (() => {
  const getDialogV2 = () => foundry?.applications?.api?.DialogV2 ?? globalThis.DialogV2 ?? null;
  const getApplicationV2 = () => foundry?.applications?.api?.ApplicationV2 ?? null;
  const getFilePicker = () => foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker ?? null;

  async function renderTemplateCompat(path, data = {}) {
    const renderer = foundry?.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    if (typeof renderer !== 'function') {
      throw new Error('No compatible Foundry template renderer was found.');
    }
    return renderer(path, data);
  }

  /**
   * Return a DOM element from either a V1 jQuery Application element or a V2 HTMLElement.
   * @param {HTMLElement|jQuery|Application|object} value
   * @returns {HTMLElement|null}
   */
  function asElement(value) {
    if (!value) return null;
    if (value instanceof HTMLElement) return value;
    if (globalThis.jQuery && value instanceof jQuery) return value[0] ?? null;
    const el = value.element;
    if (el instanceof HTMLElement) return el;
    if (globalThis.jQuery && el instanceof jQuery) return el[0] ?? null;
    return null;
  }

  return {
    get DialogV2() { return getDialogV2(); },
    get ApplicationV2() { return getApplicationV2(); },
    get FilePicker() { return getFilePicker(); },
    renderTemplate: renderTemplateCompat,
    asElement
  };
})();
