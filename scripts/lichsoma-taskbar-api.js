// LichSOMA's Taskbar - Public Extension API

const MODULE_ID = 'lichsoma-taskbar';
const API_VERSION = 1;
// Additive features do not change the existing API contract version.
const CAPABILITIES = Object.freeze({
  buttons: true,
  buttonState: true,
  buttonBadges: true,
  buttonOrder: true,
  readyHook: true
});
const EXTENSION_CONTAINER_ID = 'taskbar-extension-buttons';

const registrations = new Map();
const renderedButtons = new Map();
let readyGeneration = 0;

function asBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeOrder(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 100;
}

function normalizeButtonDefinition(input, previous = null) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('Taskbar button definition must be an object.');
  }

  const id = String(input.id ?? previous?.id ?? '').trim();
  if (!id) throw new TypeError('Taskbar button id is required.');
  if (!/^[A-Za-z0-9._:-]+$/.test(id)) {
    throw new TypeError(`Invalid taskbar button id: ${id}`);
  }

  const merged = {
    ...(previous ?? {}),
    ...input,
    id
  };

  const icon = merged.icon == null ? '' : String(merged.icon).trim();
  const label = merged.label == null ? '' : String(merged.label);
  if (!icon && !label) {
    throw new TypeError(`Taskbar button '${id}' requires an icon or label.`);
  }

  if (merged.onClick != null && typeof merged.onClick !== 'function') {
    throw new TypeError(`Taskbar button '${id}' onClick must be a function.`);
  }
  if (merged.onContextMenu != null && typeof merged.onContextMenu !== 'function') {
    throw new TypeError(`Taskbar button '${id}' onContextMenu must be a function.`);
  }

  return Object.freeze({
    id,
    icon,
    label,
    title: merged.title ?? '',
    ariaLabel: merged.ariaLabel ?? '',
    order: normalizeOrder(merged.order),
    active: asBoolean(merged.active, false),
    disabled: asBoolean(merged.disabled, false),
    visible: merged.visible !== false,
    badge: merged.badge ?? null,
    onClick: merged.onClick ?? null,
    onContextMenu: merged.onContextMenu ?? null
  });
}

function resolveText(value) {
  if (typeof value === 'function') {
    try {
      return String(value() ?? '');
    } catch (error) {
      console.error('lichsoma-taskbar | extension text resolver failed:', error);
      return '';
    }
  }
  return String(value ?? '');
}

function normalizeBadge(value) {
  if (value == null || value === false || value === '' || value === 0) {
    return { visible: false, text: '', dot: false };
  }
  if (value === true) {
    return { visible: true, text: '', dot: true };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return { visible: false, text: '', dot: false };
    return { visible: true, text: value > 99 ? '99+' : String(Math.floor(value)), dot: false };
  }
  const text = String(value).trim();
  return text ? { visible: true, text, dot: false } : { visible: false, text: '', dot: false };
}

function getContainer() {
  return document.getElementById(EXTENSION_CONTAINER_ID);
}

function createButtonElement(definition) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'taskbar-icon-btn taskbar-extension-btn';
  button.dataset.taskbarExtensionId = definition.id;

  const icon = document.createElement('i');
  icon.className = definition.icon;
  icon.classList.add('taskbar-extension-icon');
  if (!definition.icon) icon.hidden = true;
  button.appendChild(icon);

  if (definition.label) {
    const label = document.createElement('span');
    label.className = 'taskbar-extension-label';
    label.textContent = definition.label;
    button.appendChild(label);
  }

  const badge = document.createElement('span');
  badge.className = 'taskbar-extension-badge';
  badge.hidden = true;
  button.appendChild(badge);

  button.addEventListener('click', async (event) => {
    const current = registrations.get(definition.id);
    if (!current || current.disabled || !current.visible || typeof current.onClick !== 'function') return;
    try {
      await current.onClick(event, createButtonHandle(definition.id));
    } catch (error) {
      console.error(`lichsoma-taskbar | extension button '${definition.id}' click failed:`, error);
    }
  });

  button.addEventListener('contextmenu', async (event) => {
    const current = registrations.get(definition.id);
    if (!current || current.disabled || !current.visible || typeof current.onContextMenu !== 'function') return;
    event.preventDefault();
    try {
      await current.onContextMenu(event, createButtonHandle(definition.id));
    } catch (error) {
      console.error(`lichsoma-taskbar | extension button '${definition.id}' context menu failed:`, error);
    }
  });

  return button;
}

function applyDefinitionToElement(button, definition) {
  const title = resolveText(definition.title);
  const ariaLabel = resolveText(definition.ariaLabel) || title || definition.label || definition.id;
  button.title = title;
  button.setAttribute('aria-label', ariaLabel);
  button.disabled = definition.disabled;
  button.hidden = !definition.visible;
  button.classList.toggle('active', definition.active);
  button.classList.toggle('disabled', definition.disabled);

  const icon = button.querySelector('.taskbar-extension-icon');
  if (icon) {
    icon.className = `${definition.icon} taskbar-extension-icon`.trim();
    icon.hidden = !definition.icon;
  }

  const label = button.querySelector('.taskbar-extension-label');
  if (definition.label) {
    if (label) {
      label.textContent = definition.label;
    } else {
      const newLabel = document.createElement('span');
      newLabel.className = 'taskbar-extension-label';
      newLabel.textContent = definition.label;
      const badge = button.querySelector('.taskbar-extension-badge');
      button.insertBefore(newLabel, badge ?? null);
    }
  } else if (label) {
    label.remove();
  }

  const badgeElement = button.querySelector('.taskbar-extension-badge');
  if (badgeElement) {
    const badge = normalizeBadge(definition.badge);
    badgeElement.hidden = !badge.visible;
    badgeElement.classList.toggle('dot', badge.dot);
    badgeElement.textContent = badge.text;
    badgeElement.setAttribute('aria-hidden', badge.visible ? 'false' : 'true');
  }
}

function renderRegisteredButtons() {
  const container = getContainer();
  if (!container) return false;

  const ordered = [...registrations.values()]
    .sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
  const liveIds = new Set(ordered.map((definition) => definition.id));

  for (const [id, element] of renderedButtons.entries()) {
    if (!liveIds.has(id) || !element.isConnected) {
      element.remove();
      renderedButtons.delete(id);
    }
  }

  for (const definition of ordered) {
    let button = renderedButtons.get(definition.id);
    if (!button || !button.isConnected) {
      button = createButtonElement(definition);
      renderedButtons.set(definition.id, button);
    }
    applyDefinitionToElement(button, definition);
    container.appendChild(button);
  }

  return true;
}

function createButtonHandle(id) {
  return Object.freeze({
    id,
    update: (patch) => updateButton(id, patch),
    unregister: () => unregisterButton(id),
    setActive: (active) => setButtonActive(id, active),
    setBadge: (badge) => setButtonBadge(id, badge),
    setVisible: (visible) => setButtonVisible(id, visible),
    setDisabled: (disabled) => setButtonDisabled(id, disabled)
  });
}

function registerButton(definition) {
  const id = String(definition?.id ?? '').trim();
  const previous = id ? registrations.get(id) ?? null : null;
  const normalized = normalizeButtonDefinition(definition, previous);
  registrations.set(normalized.id, normalized);
  renderRegisteredButtons();
  Hooks?.callAll?.('lichsoma-taskbar.buttonRegistered', normalized.id, createButtonHandle(normalized.id));
  return createButtonHandle(normalized.id);
}

function unregisterButton(id) {
  const key = String(id ?? '').trim();
  if (!key) return false;
  const existed = registrations.delete(key);
  const element = renderedButtons.get(key);
  if (element) element.remove();
  renderedButtons.delete(key);
  if (existed) Hooks?.callAll?.('lichsoma-taskbar.buttonUnregistered', key);
  return existed;
}

function updateButton(id, patch) {
  const key = String(id ?? '').trim();
  const previous = registrations.get(key);
  if (!previous) return false;
  const normalized = normalizeButtonDefinition({ ...patch, id: key }, previous);
  registrations.set(key, normalized);
  renderRegisteredButtons();
  Hooks?.callAll?.('lichsoma-taskbar.buttonUpdated', key, createButtonHandle(key));
  return true;
}

function setButtonActive(id, active) {
  return updateButton(id, { active: Boolean(active) });
}

function setButtonBadge(id, badge) {
  return updateButton(id, { badge });
}

function setButtonVisible(id, visible) {
  return updateButton(id, { visible: Boolean(visible) });
}

function setButtonDisabled(id, disabled) {
  return updateButton(id, { disabled: Boolean(disabled) });
}

function getButton(id) {
  const value = registrations.get(String(id ?? '').trim());
  return value ? { ...value } : null;
}

function listButtons() {
  return [...registrations.values()]
    .sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id))
    .map((value) => ({ ...value }));
}

function notifyTaskbarReady() {
  readyGeneration += 1;
  renderRegisteredButtons();
  Hooks?.callAll?.('lichsoma-taskbar.ready', publicApi, readyGeneration);
}

const publicApi = Object.freeze({
  apiVersion: API_VERSION,
  capabilities: CAPABILITIES,
  supports: feature => typeof feature === 'string' && Object.hasOwn(CAPABILITIES, feature) && CAPABILITIES[feature] === true,
  registerButton,
  unregisterButton,
  updateButton,
  setButtonActive,
  setButtonBadge,
  setButtonVisible,
  setButtonDisabled,
  getButton,
  listButtons,
  render: renderRegisteredButtons,
  notifyTaskbarReady
});

function installPublicApi() {
  window.LichsomaTaskbar = window.LichsomaTaskbar || {};
  window.LichsomaTaskbar.api = publicApi;

  const module = game?.modules?.get?.(MODULE_ID);
  if (module) {
    try {
      module.api = publicApi;
    } catch (error) {
      try {
        Object.defineProperty(module, 'api', {
          configurable: true,
          enumerable: true,
          writable: false,
          value: publicApi
        });
      } catch (defineError) {
        console.error('lichsoma-taskbar | public API could not be attached to module:', defineError);
      }
    }
  }
}

installPublicApi();
Hooks.once('init', installPublicApi);

export { publicApi as taskbarApi, normalizeButtonDefinition, normalizeBadge };
