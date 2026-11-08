import test from 'node:test';
import assert from 'node:assert/strict';
import { setupSoundCloud } from '../dist/soundcloud-player.mjs';

test('SoundCloud starts on a user gesture, fades, pauses and reports provider failure', () => {
  const nodes = new Map();
  const makeNode = () => ({ hidden: true, disabled: true, listeners: {}, attrs: {}, classList: { toggle() {} }, addEventListener(name, fn) { this.listeners[name] = fn; }, setAttribute(k, v) { this.attrs[k] = v; } });
  const timers = new Map(), frames = new Map(); let id = 0, script, volume, paused = true;
  const events = {}, calls = [];
  const widget = { bind(name, fn) { events[name] = fn; }, setVolume(value) { volume = value; }, play() { calls.push('play'); }, pause() { paused = true; events.PAUSE(); }, getDuration(fn) { fn(171739); }, seekTo(value) { calls.push(value); } };
  const Widget = () => widget;
  Widget.Events = Object.fromEntries(['READY', 'PLAY', 'PAUSE', 'FINISH', 'PLAY_PROGRESS', 'ERROR'].map(k => [k, k]));
  const previous = Object.fromEntries(['document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'].map(k => [k, globalThis[k]]));
  try {
    globalThis.document = { body: { dataset: {}, append(node) { script = node; } }, querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, makeNode()); return nodes.get(selector); }, createElement: makeNode };
    globalThis.window = { SC: { Widget }, addEventListener() {} };
    globalThis.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
    globalThis.cancelAnimationFrame = key => frames.delete(key);
    globalThis.setTimeout = fn => { timers.set(++id, fn); return id; };
    globalThis.clearTimeout = key => timers.delete(key);
    setupSoundCloud({ soundcloudUrl: 'https://soundcloud.com/antoniocarlosjobim/wave-2', autoplay: true, fadeInSeconds: 3, volume: .45, showArtwork: false });
    const node = selector => nodes.get(selector);
    assert.equal(new URL(node('#soundcloud-embed').src).searchParams.get('show_artwork'), 'false');
    script.listeners.load(); events.READY();
    assert.equal(node('#play-toggle').disabled, false);
    assert.equal(calls.length, 1);
    // Provider may reject autoplay without emitting PLAY; UI stays paused.
    for (const fn of [...timers.values()]) fn();
    assert.equal(node('#player-status').textContent, '点击播放，让音乐缓缓进入');
    node('#play-toggle').listeners.click(); assert.equal(calls.length, 2);
    events.PLAY(); paused = false;
    assert.equal(volume, 0); assert.equal(node('#play-toggle').attrs['aria-pressed'], 'true');
    [...frames.values()].at(-1)(performance.now() + 4000);
    assert.equal(volume, 45);
    node('#seek').value = '500'; node('#seek').listeners.input();
    assert.equal(calls.at(-1), 171739 / 2);
    node('#play-toggle').listeners.click();
    assert.equal(paused, true); assert.equal(node('#play-toggle').attrs['aria-pressed'], 'false');
    events.ERROR(); assert.match(node('#player-status').textContent, /无法播放此曲/);
  } finally {
    for (const [key, value] of Object.entries(previous)) globalThis[key] = value;
  }
});
