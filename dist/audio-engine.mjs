export class AlbumPlayer {
  constructor(audio, { fadeInSeconds = 3, volume = 0.45, onState = () => {}, onTrack = () => {}, onProgress = () => {} } = {}) {
    this.audio = audio; this.fadeSeconds = Math.max(0, Number(fadeInSeconds) || 0);
    this.targetVolume = Math.min(1, Math.max(0, Number(volume) || 0));
    this.onState = onState; this.onTrack = onTrack; this.onProgress = onProgress;
    this.tracks = []; this.index = 0; this.intent = 0; this.state = 'empty';
    audio.addEventListener('timeupdate', () => this.progress());
    audio.addEventListener('loadedmetadata', () => this.progress());
    audio.addEventListener('durationchange', () => this.progress());
    audio.addEventListener('ended', () => { if (this.index < this.tracks.length - 1) this.select(this.index + 1, true); else this.setState('ended'); });
    audio.addEventListener('waiting', () => { if (!audio.paused) this.setState('buffering'); });
    audio.addEventListener('playing', () => this.setState('playing'));
    audio.addEventListener('pause', () => { if (this.state === 'playing' || this.state === 'buffering') this.setState('paused'); });
    audio.addEventListener('error', () => { ++this.intent; this.clearFade(); this.setState('error'); });
  }
  setState(state) { this.state = state; this.onState(state); }
  progress() { this.onProgress({ current: this.audio.currentTime || 0, duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0 }); }
  setTracks(tracks) {
    this.pause(); this.tracks = tracks.filter(track => track && typeof track.src === 'string' && track.src.trim()); this.index = 0;
    if (this.tracks.length) this.select(0, false);
    else { this.audio.removeAttribute('src'); this.audio.load(); this.setState('empty'); }
  }
  select(index, play = false) {
    if (!this.tracks.length) return Promise.resolve(false);
    this.pause(); this.index = Math.min(this.tracks.length - 1, Math.max(0, index));
    this.audio.src = this.tracks[this.index].src; this.audio.load();
    this.onTrack(this.tracks[this.index], this.index); this.progress(); this.setState('ready');
    return play ? this.play() : Promise.resolve(true);
  }
  async prepareGraph() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return;
    if (!this.context) {
      this.context = new Context(); this.gain = this.context.createGain();
      this.source = this.context.createMediaElementSource(this.audio);
      this.source.connect(this.gain); this.gain.connect(this.context.destination); this.audio.volume = 1;
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }
  clearFade() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0; }
  level(value) {
    if (this.gain) { this.gain.gain.cancelScheduledValues(this.context.currentTime); this.gain.gain.setValueAtTime(value, this.context.currentTime); }
    else this.audio.volume = value;
  }
  async play({ automatic = false } = {}) {
    if (!this.tracks.length) return false;
    const ticket = ++this.intent; this.clearFade(); this.setState('loading');
    try {
      // Start media inside the gesture call stack; never bypass autoplay policy.
      if (!automatic) {
        const preparing = this.prepareGraph(); this.level(0);
        const starting = this.audio.play(); await Promise.all([preparing, starting]);
      } else { this.level(0); await this.audio.play(); }
      if (ticket !== this.intent) return false;
      this.setState('playing'); const started = performance.now();
      const fade = now => {
        if (ticket !== this.intent) return;
        const ratio = this.fadeSeconds ? Math.min(1, (now - started) / (this.fadeSeconds * 1000)) : 1;
        this.level(this.targetVolume * ratio);
        if (ratio < 1) this.frame = requestAnimationFrame(fade); else this.frame = 0;
      };
      this.frame = requestAnimationFrame(fade); return true;
    } catch (error) {
      if (ticket !== this.intent) return false;
      this.audio.pause(); this.clearFade(); this.setState(error.name === 'NotAllowedError' ? 'blocked' : 'error'); return false;
    }
  }
  pause() { ++this.intent; this.clearFade(); this.audio.pause(); if (this.tracks.length) this.setState('paused'); }
  toggle() { return ['playing', 'buffering', 'loading'].includes(this.state) ? this.pause() : this.play(); }
  next() { return this.select((this.index + 1) % this.tracks.length, true); }
  previous() { if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; } return this.select((this.index - 1 + this.tracks.length) % this.tracks.length, true); }
  seek(ratio) { if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) this.audio.currentTime = Math.min(1, Math.max(0, ratio)) * this.audio.duration; }
  setVolume(value) { this.targetVolume = Math.min(1, Math.max(0, value)); if (!this.frame) this.level(this.targetVolume); }
}
