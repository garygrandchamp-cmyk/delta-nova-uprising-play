/* Landscape P1 controls. Loaded before Godot starts; no synthetic DOM keys.
   The left pad is a d-pad: a button's data-action may hold several actions (◤ = left + up). */
(() => {
  'use strict';
  let callback = null, active = false, screen = '', usedTouch = false, mobileNotified = false;
  const pointers = new Map(), counts = new Map(), movementPointers = new Set();
  const root = document.createElement('nav');
  root.id = 'uprising-touch';
  root.setAttribute('aria-label', 'Player one touch controls');
  root.hidden = true;
  const groups = {
    movement: [['left up', '◤'], ['up', '▲'], ['right up', '◥'], ['left', '◀'], ['drop', '▼'], ['right', '▶']],
    actions: [['melee', 'POP'], ['jump', 'JUMP'], ['slide', 'SLIDE'], ['fire', 'BUBBLE']],
    utility: [['flip', 'FLIP'], ['defense', 'DEFEND'], ['special', 'SPECIAL'], ['cycle_special', 'NEXT']],
    pause: [['pause', 'PAUSE']]
  };
  for (const [group, actions] of Object.entries(groups)) {
    const panel = document.createElement('div'); panel.className = `touch-${group}`;
    for (const [action, label] of actions) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.action = action; button.textContent = label;
      button.setAttribute('aria-label', action.replaceAll('_', ' ').replace(' up', ' and up'));
      panel.append(button);
    }
    root.append(panel);
  }
  const hint = document.createElement('div'); hint.id = 'uprising-rotate';
  hint.textContent = 'Rotate to landscape for touch controls'; hint.hidden = true;
  function mount() { document.body.append(root, hint); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, {once: true});
  const landscape = () => window.innerWidth > window.innerHeight;
  const capable = () => usedTouch || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  const emit = (action, down) => { if (callback) callback(action, down); };
  function clear() {
    pointers.clear(); counts.clear(); movementPointers.clear();
    root.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
    emit('clear', false);
  }
  function render() {
    const show = Boolean(callback && active && capable() && landscape() && !document.hidden);
    if (!show && !root.hidden) clear();
    root.hidden = !show;
    // Portrait mid-run: the controls vanish, so pause rather than leave the player defenceless.
    if (callback && active && screen === 'play' && capable() && !landscape() && !document.hidden) {
      clear(); active = false; emit('pause', true);
    }
    hint.hidden = !(callback && capable() && ['play', 'pause'].includes(screen) && !landscape() && !document.hidden);
    if (callback && capable() && !mobileNotified) { mobileNotified = true; emit('mobile', true); }
  }
  const actionsOf = button => button.dataset.action.split(' ');
  function release(id, button = pointers.get(id)) {
    if (!button) return;
    if (pointers.get(id) === button) pointers.delete(id);
    if (![...pointers.values()].includes(button)) button.classList.remove('held');
    for (const action of actionsOf(button)) {
      const count = (counts.get(action) || 1) - 1;
      if (count > 0) counts.set(action, count);
      else { counts.delete(action); emit(action, false); }
    }
  }
  function press(id, button) {
    pointers.set(id, button); button.classList.add('held');
    for (const action of actionsOf(button)) {
      const count = counts.get(action) || 0;
      counts.set(action, count + 1);
      if (!count) emit(action, true);
    }
  }
  // A thumb can slide across the d-pad, but never onto DROP: that takes a deliberate tap.
  const slides = button => button.parentElement.classList.contains('touch-movement') && button.dataset.action !== 'drop';
  root.addEventListener('pointerdown', event => {
    const button = event.target.closest('button[data-action]');
    if (!button || !active || root.hidden || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    release(event.pointerId);
    if (button.dataset.action === 'pause') {
      clear(); active = false; emit('pause', true); render(); return;
    }
    button.setPointerCapture(event.pointerId);
    if (slides(button)) movementPointers.add(event.pointerId);
    press(event.pointerId, button);
  });
  root.addEventListener('pointermove', event => {
    if (!movementPointers.has(event.pointerId)) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('button[data-action]');
    const next = target && slides(target) ? target : null;
    const previous = pointers.get(event.pointerId);
    if (previous === next) return;
    // Press before releasing so an action both buttons share (◥ to ▶ keeps right) never drops.
    if (next) press(event.pointerId, next);
    if (previous) release(event.pointerId, previous);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    root.addEventListener(type, event => { event.preventDefault(); release(event.pointerId); movementPointers.delete(event.pointerId); });
  }
  root.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !usedTouch) { usedTouch = true; render(); }
  }, {capture: true, passive: true});
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { clear(); render(); });
  window.addEventListener('resize', () => { clear(); render(); });
  window.addEventListener('orientationchange', () => { clear(); render(); });
  window.addEventListener('pagehide', clear);
  window.visualViewport?.addEventListener('resize', () => { clear(); render(); });
  window.UprisingTouch = Object.freeze({
    bind(fn) { clear(); callback = fn; mobileNotified = false; render(); },
    unbind() { clear(); callback = null; active = false; render(); },
    setState(enabled, nextScreen, mode) {
      if (active !== Boolean(enabled) || screen !== nextScreen) clear();
      active = Boolean(enabled); screen = nextScreen; render();
      root.querySelector('[data-action="slide"]').textContent = mode === 'bike' ? 'BOOST' : 'SLIDE';
      root.querySelector('[data-action="flip"]').textContent = mode === 'bike' ? 'WHEELIE' : 'FLIP';
    }
  });
})();
