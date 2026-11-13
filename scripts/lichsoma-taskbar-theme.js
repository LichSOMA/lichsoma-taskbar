const MODULE_ID = 'lichsoma-taskbar';
import {getTaskbarAppearanceSetting, initializeWorldAppearance, APPEARANCE_CHANGED, APPEARANCE_DEFAULTS} from './lichsoma-taskbar-appearance-storage.js';
export const TASKBAR_THEMES = Object.freeze({
  'dark-simple': 'Taskbar.Theme.DarkSimple',
  'simple-light': 'Taskbar.Theme.SimpleLight',
  'retro-terminal': 'Taskbar.Theme.RetroTerminal',
  'terminal-red': 'Taskbar.Theme.TerminalRed'
});
export const TASKBAR_THEME_PRESETS = Object.freeze({
  'dark-simple': Object.freeze({color:APPEARANCE_DEFAULTS.taskbarColor, opacity:APPEARANCE_DEFAULTS.taskbarOpacity}),
  'simple-light': Object.freeze({color:'#cdd1d6', opacity:APPEARANCE_DEFAULTS.taskbarOpacity}),
  'retro-terminal': Object.freeze({color:'#050908', opacity:APPEARANCE_DEFAULTS.taskbarOpacity}),
  'terminal-red': Object.freeze({color:'#0b0505', opacity:APPEARANCE_DEFAULTS.taskbarOpacity})
});
export const TASKBAR_THEME_APPLIED = 'lichsoma-taskbar:themeApplied';
export function getInheritedSpeakerTheme() {
  const selector = globalThis.game?.modules?.get?.('lichsoma-speaker-selector');
  if (!selector?.active) return null;
  try {
    const value = selector.api?.getChatTheme?.() ?? game.settings.get('lichsoma-speaker-selector', 'chatTheme');
    return Object.hasOwn(TASKBAR_THEMES, value) ? value : 'dark-simple';
  } catch { return 'dark-simple'; }
}
export async function initializeTaskbarAppearance() {
  initializeWorldAppearance();
}
export function getTaskbarTheme() {
  const inherited = getInheritedSpeakerTheme();
  if (inherited) return inherited;
  const value = getTaskbarAppearanceSetting('theme');
  return Object.hasOwn(TASKBAR_THEMES, value) ? value : 'dark-simple';
}
export function applyTaskbarTheme() {
  if (!document.body) return;
  const theme = getTaskbarTheme();
  document.body.dataset.taskbarTheme = theme;
  const inherited = getInheritedSpeakerTheme();
  const color = inherited ? TASKBAR_THEME_PRESETS[theme].color : getTaskbarAppearanceSetting('taskbarColor') || APPEARANCE_DEFAULTS.taskbarColor;
  document.documentElement.style.setProperty('--taskbar-color', color);
  const opacity = Number(getTaskbarAppearanceSetting('taskbarOpacity'));
  document.documentElement.style.setProperty('--taskbar-opacity', String(Math.max(0, Math.min(100, Number.isFinite(opacity) ? opacity : APPEARANCE_DEFAULTS.taskbarOpacity)) / 100));
  document.dispatchEvent(new CustomEvent(TASKBAR_THEME_APPLIED));
}
export function markTaskbarFilePicker(app, html) {
  const element = html?.jquery ? html[0] : html;
  const appElement = app?.element?.jquery ? app.element[0] : app?.element;
  const root = element?.closest?.('.application, .window-app') ?? appElement ?? element;
  root?.classList?.add('lichsoma-taskbar-filepicker');
}
export function registerTaskbarThemeSetting() {
  Hooks.on('lichsoma-speaker-selector.themeChanged', applyTaskbarTheme);
  Hooks.once?.('ready', applyTaskbarTheme);
  Hooks.on('renderFilePicker', markTaskbarFilePicker);
  Hooks.on('renderFilePickerV2', markTaskbarFilePicker);
  document.addEventListener(APPEARANCE_CHANGED, applyTaskbarTheme);
  game.settings.register(MODULE_ID, 'theme', {
    name: 'Taskbar.Theme.Name', hint: 'Taskbar.Theme.Hint',
    scope: 'client', config: false, type: String, default: 'dark-simple',
    choices: TASKBAR_THEMES, onChange: applyTaskbarTheme
  });
  game.settings.register(MODULE_ID, 'appearanceVersion', {scope:'client', config:false, type:Number, default:0});
}
