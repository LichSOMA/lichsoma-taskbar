import assert from 'node:assert/strict';

const hooks = new Map();
globalThis.window = globalThis;
globalThis.Hooks = {
  once(name, fn) { hooks.set(name, fn); },
  callAll() {}
};
globalThis.game = { modules: new Map([['lichsoma-taskbar', {}]]) };
globalThis.document = {
  getElementById() { return null; }
};

const { taskbarApi, normalizeButtonDefinition, normalizeBadge } = await import('../scripts/lichsoma-taskbar-api.js');

assert.equal(taskbarApi.apiVersion, 1);
assert.equal(Object.isFrozen(taskbarApi), true);
assert.equal(Object.isFrozen(taskbarApi.capabilities), true);
for (const feature of ['buttons', 'buttonState', 'buttonBadges', 'buttonOrder', 'readyHook']) {
  assert.equal(taskbarApi.supports(feature), true);
}
for (const feature of ['unknown', 'toString', '__proto__', null, ['buttons']]) {
  assert.equal(taskbarApi.supports(feature), false);
}
assert.equal(game.modules.get('lichsoma-taskbar').api, taskbarApi);
assert.equal(window.LichsomaTaskbar.api, taskbarApi);

const def = normalizeButtonDefinition({
  id: 'module.test',
  icon: 'fa-solid fa-desktop',
  order: 5,
  badge: 3,
  onClick() {}
});
assert.equal(def.id, 'module.test');
assert.equal(def.order, 5);
assert.equal(def.visible, true);
assert.equal(def.disabled, false);

assert.deepEqual(normalizeBadge(null), { visible: false, text: '', dot: false });
assert.deepEqual(normalizeBadge(true), { visible: true, text: '', dot: true });
assert.deepEqual(normalizeBadge(120), { visible: true, text: '99+', dot: false });
assert.deepEqual(normalizeBadge(3), { visible: true, text: '3', dot: false });

const handle = taskbarApi.registerButton({ id: 'module.test', icon: 'fa-solid fa-desktop' });
assert.equal(handle.id, 'module.test');
assert.equal(taskbarApi.getButton('module.test').active, false);
assert.equal(handle.setActive(true), true);
assert.equal(taskbarApi.getButton('module.test').active, true);
assert.equal(handle.setBadge(7), true);
assert.equal(taskbarApi.getButton('module.test').badge, 7);
assert.equal(handle.unregister(), true);
assert.equal(taskbarApi.getButton('module.test'), null);

assert.throws(() => normalizeButtonDefinition({ id: '', icon: 'x' }), /id is required/);
assert.throws(() => normalizeButtonDefinition({ id: 'bad id', icon: 'x' }), /Invalid taskbar button id/);
assert.throws(() => normalizeButtonDefinition({ id: 'no-content' }), /requires an icon or label/);

console.log('Taskbar API tests passed');
