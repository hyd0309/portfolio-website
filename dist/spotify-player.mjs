export function setupSpotify(config) {
  document.body.dataset.provider = 'spotify';
  const panel = document.querySelector('#spotify-panel'), status = document.querySelector('#player-status'), toggle = document.querySelector('#play-toggle');
  panel.hidden = false;
  document.querySelector('#local-audio-form').hidden = true;
  document.querySelector('#track-name').textContent = '一张唱片的时间';
  document.querySelector('#track-counter').textContent = 'SPOTIFY';
  document.querySelector('.listening-note').innerHTML = '点按播放，听一会儿。可随时暂停。<br>播放时长与可用曲目以 Spotify 为准。';
  status.textContent = '正在连接 Spotify…';
  toggle.disabled = true;
  let controller, lastPaused = true, didPlay = false, timer;
  const fallback = () => { if (!controller) status.textContent = '可使用下方播放器，或在 Spotify 中打开'; };
  const setPaused = paused => {
    lastPaused = paused; toggle.textContent = paused ? '▶' : 'Ⅱ'; toggle.setAttribute('aria-label', paused ? '播放音乐' : '暂停音乐');
    toggle.setAttribute('aria-pressed', String(!paused)); document.querySelector('.record').classList.toggle('spinning', !paused);
  };
  toggle.addEventListener('click', () => { if (controller) { controller.togglePlay(); status.textContent = lastPaused ? '正在请求播放…' : '正在暂停…'; } });
  window.onSpotifyIframeApiReady = api => {
    try {
      api.createController(document.querySelector('#spotify-embed'), { width: '100%', height: 352, uri: config.spotifyUri }, embed => {
        controller = embed;
        embed.addListener('ready', () => {
          toggle.disabled = false; status.textContent = '点击播放，让音乐进入';
          if (config.autoplay) {
            embed.play(); status.textContent = '正在尝试播放…';
            timer = setTimeout(() => { if (!didPlay) status.textContent = '点击播放，让音乐进入'; }, 4000);
          }
        });
        embed.addListener('playback_started', () => { didPlay = true; clearTimeout(timer); setPaused(false); status.textContent = '正在播放'; });
        embed.addListener('playback_update', event => {
          const data = event.data || {}; setPaused(Boolean(data.isPaused));
          status.textContent = data.isBuffering ? '正在缓冲…' : data.isPaused ? '已暂停 · 点击继续聆听' : '正在播放';
        });
      });
    } catch { fallback(); }
  };
  const script = document.createElement('script'); script.src = 'https://open.spotify.com/embed/iframe-api/v1'; script.async = true;
  script.addEventListener('error', fallback); document.body.append(script); setTimeout(fallback, 10000);
  window.addEventListener('pagehide', () => { clearTimeout(timer); controller?.pause(); });
}
