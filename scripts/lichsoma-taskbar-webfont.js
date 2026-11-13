import {getTaskbarAppearanceSetting, setTaskbarAppearanceSetting, APPEARANCE_CHANGED} from './lichsoma-taskbar-appearance-storage.js';
const MODULE_ID = 'lichsoma-taskbar';
const SETTING = 'taskbarWebfontCSS';
const ROOTS = ':is(#lichsoma-taskbar, #taskbar-player-list-panel, #taskbar-system-menu-panel, #taskbar-quest-list-panel, #taskbar-screen-panel, #context-menu.lichsoma-taskbar-context-menu, .lichsoma-taskbar-filepicker)';
export function registerTaskbarWebfontSetting() {
  document.addEventListener(APPEARANCE_CHANGED, event => { if (event.detail.key === SETTING || event.detail.key === '*') applyTaskbarWebfont(); });
  game.settings.register(MODULE_ID, SETTING, {scope:'client', config:false, type:String, default:'', onChange:applyTaskbarWebfont});
}
export function applyTaskbarWebfont() {
  const css = getTaskbarAppearanceSetting(SETTING) || '';
  let style = document.getElementById('lichsoma-taskbar-webfont-css');
  if (!css.trim()) { style?.remove(); return; }
  if (!style) { style = document.createElement('style'); style.id='lichsoma-taskbar-webfont-css'; document.head.append(style); }
  const clean = css.replace(/\/\*[\s\S]*?\*\//g,' ');
  const marker = clean.match(/\.(?:lichsoma-webfont-settings|lichsoma-webfont-family-marker)\s*\{([^}]+)\}/i)?.[1];
  const property = key => {
    const pattern = new RegExp(`${key}\\s*:\\s*([^;}]+)`, 'i');
    return ((marker?.match(pattern) || clean.match(pattern))?.[1] || '').replace(/\s*!important\s*$/i,'').trim();
  };
  const family = property('font-family').split(',')[0]?.trim().replace(/^["']|["']$/g,'');
  const weight = property('font-weight'), fontStyle = property('font-style'), variation = property('font-variation-settings');
  const rules = [];
  if (family) rules.push(`font-family:${JSON.stringify(family)} !important`);
  if (/^(normal|bold|bolder|lighter|[1-9]\d{0,2}|1000)$/i.test(weight)) rules.push(`font-weight:${weight} !important`);
  if (/^(normal|italic|oblique(?:\s+-?[\d.]+deg)?)$/i.test(fontStyle)) rules.push(`font-style:${fontStyle} !important`);
  if (variation) rules.push(`font-variation-settings:${variation} !important`);
  // Target text controls/labels only. Font Awesome and document payloads keep
  // their own font face; removing the CSS restores theme typography naturally.
  const text = ':is(button:not(.icon, [class*="fa-"], .fas, .far), input, select, .taskbar-datetime-line, .stat-label, .stat-value, .player-name, .screen-title, .screen-item-name, .quest-item-title, .quest-objective-text, .system-menu-btn, .system-menu-search-item .item-name, .window-title, label, .file-name, .directory-name)';
  style.textContent = `${css}\nbody[data-taskbar-theme] ${ROOTS}, body[data-taskbar-theme] ${ROOTS} ${text} {${rules.join(';')}}`;
}

const ApplicationV2 = window.LichsomaTaskbarCompat?.ApplicationV2 ?? foundry.applications.api.ApplicationV2;
export class TaskbarWebfontEditor extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id:'lichsoma-taskbar-webfont-editor', classes:['lichsoma-taskbar-webfont-editor'], tag:'div',
    window:{title:'Taskbar.Webfont.Name', resizable:true, minimizable:false}, position:{width:800,height:600}
  };
  editor = null;
  resizeObserver = null;
  async _prepareContext() { return {css:getTaskbarAppearanceSetting(SETTING) || ''}; }
  async _renderHTML(context) {
    const form=document.createElement('form'); form.className='taskbar-webfont-form';
    form.innerHTML=`<div class="webfont-main"><label>${game.i18n.localize('Taskbar.Webfont.CSSCode')}</label><textarea name="css" rows="20" spellcheck="false"></textarea></div><div class="webfont-actions"><button type="button" class="save-css"><i class="fa-solid fa-floppy-disk"></i> ${game.i18n.localize('Taskbar.Save')}</button><button type="button" class="cancel-css"><i class="fa-solid fa-xmark"></i> ${game.i18n.localize('Taskbar.Cancel')}</button></div>`;
    form.querySelector('textarea').value=context.css; return form;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  async _onFirstRender() {
    const textarea=this.element.querySelector('textarea');
    const CodeMirrorClass=window.CodeMirror || globalThis.CONFIG?.CM?.CodeMirror;
    if (CodeMirrorClass) {
      this.editor=CodeMirrorClass.fromTextArea(textarea,{mode:'css',theme:'foundry',lineNumbers:true,indentUnit:2,tabSize:2,lineWrapping:true,extraKeys:{'Ctrl-S':()=>void this.saveCSS(),'Cmd-S':()=>void this.saveCSS()}});
      this.resizeObserver=new ResizeObserver(()=>this.editor?.refresh()); this.resizeObserver.observe(this.element);
    }
    this.element.querySelector('.save-css').addEventListener('click',()=>void this.saveCSS());
    this.element.querySelector('.cancel-css').addEventListener('click',()=>void this.close());
    this.element.querySelector('form').addEventListener('submit',event=>{event.preventDefault();void this.saveCSS();});
  }
  async saveCSS() {
    try {
      await setTaskbarAppearanceSetting(SETTING,this.editor?.getValue() ?? this.element.querySelector('textarea').value);
      ui.notifications.info(game.i18n.localize('Taskbar.Webfont.Saved')); await this.close();
    } catch (error) { ui.notifications.error(error.message); }
  }
  async _onClose() { this.resizeObserver?.disconnect(); this.resizeObserver=null; this.editor?.toTextArea(); this.editor=null; }
}
