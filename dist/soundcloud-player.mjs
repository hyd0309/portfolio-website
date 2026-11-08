// Keep playback inside SoundCloud's official widget; no audio extraction.
export function setupSoundCloud(config) {
  document.body.dataset.provider = 'soundcloud';
  const panel = document.querySelector('#soundcloud-panel');
  const status = document.querySelector('#player-status');
  const toggle = document.querySelector('#play-toggle');
  const seek = document.querySelector('#seek');
  const volume = document.querySelector('#volume');
  let widget, ready = false, paused = true, duration = 0, frame, promptTimer;
  let target = Math.max(0, Math.min(100, (config.volume ?? .45) * 100));
  let alive = true, userPaused = false, playedOnce = false;
  const iframe = document.querySelector('#soundcloud-embed');
  const embedURL = new URL('https://w.soundcloud.com/player/');
  embedURL.search = new URLSearchParams({ url: 'https://api.soundcloud.com/tracks/286477865', color: '#153cbb', auto_play: 'false', show_artwork: String(config.showArtwork === true), visual: 'false', show_user: 'true', show_comments: 'false', show_reposts: 'false', show_teaser: 'false' }).toString();
  iframe.src = embedURL.href;
  const format = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  panel.hidden = false;
  document.querySelector('#local-audio-form').hidden = true;
  document.querySelector('#track-name').textContent = 'Wave';
  document.querySelector('#track-counter').textContent = 'SOUNDCLOUD';
  document.querySelector('.listening-note').innerHTML = '一首 Wave，留一点空间给声音。<br>点按播放或暂停，调到舒服的音量。';
  status.textContent = '正在连接 SoundCloud…';
  volume.value = String(target);
  document.querySelector('#volume-value').textContent = `${Math.round(target)}%`;
  const setPaused = value => {
    paused = value;
    toggle.textContent = value ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-label', value ? '播放音乐' : '暂停音乐');
    toggle.setAttribute('aria-pressed', String(!value));
    document.querySelector('.record').classList.toggle('spinning', !value);
  };
  const stopFade = () => { cancelAnimationFrame(frame); frame = undefined; };
  const fade = () => {
    stopFade();
    const seconds = Math.max(0, Number(config.fadeInSeconds ?? 3));
    if (!seconds) { widget.setVolume(target); return; }
    widget.setVolume(0);
    const start = performance.now();
    const step = now => {
      if (!alive || paused) return;
      const progress = Math.min(1, (now - start) / (seconds * 1000));
      widget.setVolume(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
  const fallback = () => {
    if (!ready && alive) status.textContent = '音乐连接暂不可用';
  };
  toggle.addEventListener('click', () => {
    if (!ready) return;
    if (paused) {
      widget.setVolume(0); widget.play();
      status.textContent = '正在请求播放…';
      clearTimeout(promptTimer);
      promptTimer = setTimeout(() => { if (paused && alive) status.textContent = '请轻点播放器开始聆听'; }, 5000);
    } else { stopFade(); widget.pause(); }
  });
  volume.addEventListener('input', () => {
    target = Number(volume.value); stopFade();
    if (ready) widget.setVolume(target);
  });
  seek.addEventListener('input', () => {
    if (ready && duration) widget.seekTo(Number(seek.value) / 1000 * duration);
  });
  const script = document.createElement('script');
  script.src = 'https://w.soundcloud.com/player/api.js'; script.async = true;
  script.addEventListener('error', fallback);
  script.addEventListener('load', () => {
    if (!alive || !window.SC?.Widget) { fallback(); return; }
    widget = window.SC.Widget(iframe);
    const events = window.SC.Widget.Events;
    widget.bind(events.READY, () => {
      if (!alive) return;
      ready = true; toggle.disabled = false; widget.setVolume(target);
      status.textContent = '点击播放，让音乐缓缓进入';
      widget.getDuration(value => {
        duration = value; seek.disabled = !value;
        document.querySelector('#duration').textContent = format(value);
      });
      if (config.autoplay && !playedOnce && !userPaused) {
        widget.play();
        promptTimer = setTimeout(() => { if (paused && alive) status.textContent = '点击播放，让音乐缓缓进入'; }, 5000);
      }
    });
    widget.bind(events.PLAY, () => {
      if (!alive) { widget.pause(); return; }
      const starting = paused; playedOnce = true; setPaused(false); clearTimeout(promptTimer);
      status.textContent = '正在播放'; if (starting) fade();
    });
    widget.bind(events.PAUSE, () => {
      userPaused = playedOnce; stopFade(); setPaused(true); status.textContent = '已暂停 · 点击继续聆听';
    });
    widget.bind(events.FINISH, () => {
      stopFade(); setPaused(true); userPaused = true; widget.seekTo(0); widget.pause(); widget.load('https://api.soundcloud.com/tracks/286477865', { auto_play: false, show_artwork: false, visual: false, sharing: false, buying: false, download: false }); status.textContent = '本次聆听结束 · 点击重播 Wave';
    });
    widget.bind(events.PLAY_PROGRESS, event => {
      const current = event.currentPosition || 0;
      seek.value = duration ? String(current / duration * 1000) : '0';
      document.querySelector('#current-time').textContent = format(current);
      seek.setAttribute('aria-valuetext', `${format(current)} / ${format(duration)}`);
    });
    widget.bind(events.ERROR, () => {
      stopFade(); setPaused(true); status.textContent = 'SoundCloud 无法播放此曲，请检查网络或地区限制';
    });
  });
  document.body.append(script);
  const connectionTimer = setTimeout(fallback, 12000);
  // A real first interaction can unlock audio when arrival autoplay is blocked.
  const unlock = event => {
    if (!event.isTrusted || !ready || !alive || userPaused || playedOnce || !config.autoplay) return;
    if (panel.contains?.(event.target)) return;
    widget.setVolume(0); widget.play();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  window.addEventListener('pagehide', () => {
    alive = false; stopFade(); clearTimeout(promptTimer); clearTimeout(connectionTimer); widget?.pause();
  });
  window.addEventListener('pageshow', () => { alive = true; });
}
