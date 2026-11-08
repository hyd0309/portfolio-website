import { AlbumPlayer } from './audio-engine.mjs';
import { setupSpotify } from './spotify-player.mjs';
import { setupSoundCloud } from './soundcloud-player.mjs';
const hue = document.querySelector('#hue'), blur = document.querySelector('#blur'), experiment = document.querySelector('#experiment');
function updateExperiment() {
  const h = Number(hue.value), b = Number(blur.value);
  experiment.style.setProperty('--angle', `${-h * 1.35}deg`); experiment.style.setProperty('--diffusion', `${10 + b * .5}px`);
  document.querySelector('#hue-value').textContent = h === 0 ? '蓝 / BLUE' : `${h}%`; document.querySelector('#blur-value').textContent = `${b}%`;
}
hue.addEventListener('input', updateExperiment); blur.addEventListener('input', updateExperiment);
document.querySelector('#reset').addEventListener('click', () => { hue.value = '0'; blur.value = '50'; updateExperiment(); }); updateExperiment();
const audio = document.querySelector('#album-audio'), toggle = document.querySelector('#play-toggle');
const status = document.querySelector('#player-status'), seek = document.querySelector('#seek'), volume = document.querySelector('#volume'), list = document.querySelector('#track-list');
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const messages = { empty: '等待音源 · 可选择本地音频试听', ready: '准备就绪', loading: '正在加载音频…', playing: '正在播放', paused: '已暂停', blocked: '点击播放，让音乐缓缓进入', buffering: '正在缓冲…', ended: '本次聆听结束 · 可重新播放', error: '音频暂时无法播放，请检查音源连接' };
let objectURLs = [], player;
function showState(state) {
  const playing = ['playing', 'buffering', 'loading'].includes(state);
  toggle.textContent = playing ? 'Ⅱ' : '▶'; toggle.setAttribute('aria-label', playing ? '暂停音乐' : '播放音乐'); toggle.setAttribute('aria-pressed', String(playing)); toggle.disabled = state === 'empty';
  document.querySelector('#previous').disabled = !player?.tracks.length; document.querySelector('#next').disabled = !player?.tracks.length;
  document.querySelector('.record').classList.toggle('spinning', state === 'playing'); status.textContent = messages[state];
}
function renderTracks(tracks) {
  list.replaceChildren(); tracks.forEach((track, index) => {
    const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
    const number = document.createElement('span'), title = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0'); title.textContent = track.title || `Track ${index + 1}`;
    button.append(number, title); button.addEventListener('click', () => player.select(index, true)); li.append(button); list.append(li);
  });
}
async function setup() {
  let config;
  try { const response = await fetch('./music.json'); if (!response.ok) throw new Error('config'); config = await response.json(); }
  catch { config = { tracks: [], autoplay: false }; document.querySelector('#source-help').textContent = '音源配置暂不可用，仍可选择本地音频试听。'; }
  if (config.provider === 'spotify') { setupSpotify(config); return; }
  if (config.provider === 'soundcloud') { setupSoundCloud(config); return; }
  player = new AlbumPlayer(audio, {
    fadeInSeconds: config.fadeInSeconds ?? 3, volume: config.volume ?? .45, onState: showState,
    onTrack: (track, index) => {
      document.querySelector('#track-name').textContent = track.title || `Track ${index + 1}`;
      document.querySelector('#track-counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(player.tracks.length).padStart(2, '0')}`;
      [...list.querySelectorAll('button')].forEach((button, i) => { if (i === index) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current'); });
    },
    onProgress: ({ current, duration }) => {
      document.querySelector('#current-time').textContent = time(current); document.querySelector('#duration').textContent = time(duration); seek.disabled = duration <= 0;
      seek.value = duration ? String(current / duration * 1000) : '0'; seek.setAttribute('aria-valuetext', `${time(current)} / ${time(duration)}`);
    }
  });
  const tracks = Array.isArray(config.tracks) ? config.tracks.filter(track => {
    if (!track || typeof track.src !== 'string') return false;
    try { return ['http:', 'https:'].includes(new URL(track.src, location.href).protocol); } catch { return false; }
  }) : [];
  renderTracks(tracks); player.setTracks(tracks); volume.value = String(player.targetVolume * 100); document.querySelector('#volume-value').textContent = `${Math.round(player.targetVolume * 100)}%`;
  if (tracks.length) { document.querySelector('#local-audio-form').hidden = true; if (config.autoplay) player.play({ automatic: true }); }
}
toggle.addEventListener('click', () => player?.toggle()); document.querySelector('#next').addEventListener('click', () => player?.next()); document.querySelector('#previous').addEventListener('click', () => player?.previous());
seek.addEventListener('input', () => player?.seek(Number(seek.value) / 1000));
volume.addEventListener('input', () => { player?.setVolume(Number(volume.value) / 100); document.querySelector('#volume-value').textContent = `${volume.value}%`; });
document.querySelector('#local-audio').addEventListener('change', event => {
  const files = [...event.target.files].filter(file => file.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav|flac|aac)$/i.test(file.name)); if (!files.length || !player) return;
  player.pause(); objectURLs.forEach(url => URL.revokeObjectURL(url)); objectURLs = [];
  const tracks = files.map(file => { const src = URL.createObjectURL(file); objectURLs.push(src); return { title: file.name.replace(/\.[^.]+$/, ''), src }; });
  renderTracks(tracks); player.setTracks(tracks); document.querySelector('#source-help').textContent = '本地试听 · 文件仅在当前浏览器中使用，不会上传';
});
window.addEventListener('pagehide', () => player?.pause()); setup();
