import test from 'node:test';
import assert from 'node:assert/strict';
import { AlbumPlayer } from '../dist/audio-engine.mjs';

let frames = new Map(), sequence = 0;
globalThis.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
class FakeAudio {
  constructor() { this.listeners = new Map(); this.paused = true; this.currentTime = 0; this.duration = 120; this.volume = 1; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  emit(type) { this.listeners.get(type)?.(); }
  load() { this.currentTime = 0; }
  removeAttribute(name) { delete this[name]; }
  play() { if (this.reject) return Promise.reject(this.reject); this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; this.emit('pause'); }
}
const tracks = [{ title: 'One', src: '/one.mp3' }, { title: 'Two', src: '/two.mp3' }];
test('blocked autoplay exposes a retry state, and an explicit play can recover', async () => {
  const audio = new FakeAudio(), player = new AlbumPlayer(audio); player.setTracks(tracks);
  audio.reject = Object.assign(new Error('Blocked'), { name: 'NotAllowedError' });
  assert.equal(await player.play({ automatic: true }), false); assert.equal(player.state, 'blocked'); assert.equal(audio.paused, true);
  audio.reject = null; assert.equal(await player.play(), true); assert.equal(player.state, 'playing'); player.pause();
});
test('fade starts silent, reaches target, and pause cancels future gain changes', async () => {
  const audio = new FakeAudio(), player = new AlbumPlayer(audio, { volume: .45, fadeInSeconds: 3 }); player.setTracks(tracks);
  await player.play(); assert.equal(audio.volume, 0);
  const callback = frames.get(player.frame); callback(performance.now() + 3100); assert.equal(audio.volume, .45);
  player.pause(); assert.equal(player.state, 'paused'); assert.equal(audio.paused, true); assert.equal(player.frame, 0);
});
test('album advances in order, stops on the last track, supports seek and volume', async () => {
  const audio = new FakeAudio(), player = new AlbumPlayer(audio); player.setTracks(tracks);
  audio.emit('ended'); await Promise.resolve(); assert.equal(player.index, 1); assert.equal(audio.src, '/two.mp3');
  player.seek(.5); assert.equal(audio.currentTime, 60); player.setVolume(2); assert.equal(player.targetVolume, 1);
  audio.emit('ended'); assert.equal(player.state, 'ended'); player.pause();
});
test('manual pause cancels an in-flight start without returning to playing', async () => {
  const audio = new FakeAudio(), player = new AlbumPlayer(audio); player.setTracks(tracks);
  let finish; audio.play = () => new Promise(resolve => { finish = resolve; });
  const pending = player.play(); player.pause(); finish(); await pending;
  assert.equal(player.state, 'paused'); assert.equal(player.frame, 0);
});
