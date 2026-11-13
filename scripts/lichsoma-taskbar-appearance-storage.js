const MODULE_ID = 'lichsoma-taskbar';
export const APPEARANCE_DEFAULTS = Object.freeze({theme:'dark-simple', taskbarColor:'#0B0A13', taskbarOpacity:90, taskbarWebfontCSS:'', appearanceVersion:1});
export const APPEARANCE_CHANGED = 'lichsoma-taskbar:appearanceChanged';
const profileKey = () => `${MODULE_ID}:appearance:${encodeURIComponent(game.world.id)}:${encodeURIComponent(game.user.id)}`;

function normalizeProfile(value) {
  const opacity = Number(value.taskbarOpacity ?? APPEARANCE_DEFAULTS.taskbarOpacity);
  return {
    theme: ['dark-simple', 'simple-light', 'retro-terminal', 'terminal-red'].includes(value.theme) ? value.theme : APPEARANCE_DEFAULTS.theme,
    taskbarColor: /^#[0-9a-f]{6}$/i.test(value.taskbarColor) ? value.taskbarColor : APPEARANCE_DEFAULTS.taskbarColor,
    taskbarOpacity: Number.isFinite(opacity) ? Math.max(0, Math.min(100, opacity)) : APPEARANCE_DEFAULTS.taskbarOpacity,
    taskbarWebfontCSS: typeof value.taskbarWebfontCSS === 'string' ? value.taskbarWebfontCSS : '',
    appearanceVersion: value.appearanceVersion === 0 ? 0 : APPEARANCE_DEFAULTS.appearanceVersion
  };
}

function readProfile() {
  const raw = localStorage.getItem(profileKey());
  if (!raw) return null;
  try { const value=JSON.parse(raw); return value && typeof value==='object' && !Array.isArray(value) ? normalizeProfile(value) : null; }
  catch { return null; }
}
function notify(key) { document.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED,{detail:{key}})); }
export function getTaskbarAppearanceSetting(key) { return (readProfile() ?? APPEARANCE_DEFAULTS)[key]; }
export async function setTaskbarAppearanceSetting(key,value) {
  if (!Object.hasOwn(APPEARANCE_DEFAULTS,key)) throw new Error(`Unknown taskbar appearance setting: ${key}`);
  const profile=readProfile() ?? {...APPEARANCE_DEFAULTS};
  profile[key]=normalizeProfile({...profile,[key]:value})[key];
  localStorage.setItem(profileKey(),JSON.stringify(profile));
  notify(key); return profile[key];
}
export function initializeWorldAppearance() {
  if (readProfile()) return;
  const profile={...APPEARANCE_DEFAULTS};
  const migrationKey=`${MODULE_ID}:appearance-legacy-migrated`;
  // Legacy client settings have no world identity. Preserve them only for the
  // first world/user opened after this update; subsequent worlds start fresh.
  if (!localStorage.getItem(migrationKey)) {
    for (const key of Object.keys(APPEARANCE_DEFAULTS)) {
      try { const value=game.settings.get(MODULE_ID,key); if (value!==undefined) profile[key]=value; } catch { /* old versions may not register this key */ }
    }
    if (profile.appearanceVersion !== 1 && profile.theme !== 'dark-simple') profile.taskbarColor=profile.theme==='simple-light' ? '#cdd1d6' : '#050908';
    profile.appearanceVersion=1;
    localStorage.setItem(profileKey(),JSON.stringify(normalizeProfile(profile)));
    localStorage.setItem(migrationKey,profileKey());
  } else localStorage.setItem(profileKey(),JSON.stringify(profile));
  notify('*');
}
window.addEventListener('storage',event=>{
  if (game.world?.id && game.user?.id && event.key===profileKey()) notify('*');
});
