// The independent app owns its releases. Only its stable public URL belongs here.
async function connectApplication() {
  try {
    const response = await fetch('./project.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Configuration unavailable');
    const { launchUrl } = await response.json();
    if (launchUrl === null) return;
    if (typeof launchUrl !== 'string') throw new Error('Invalid configuration');
    const url = new URL(launchUrl);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
      throw new Error('A public HTTPS application URL is required');
    }
    const link = document.querySelector('#application-launch');
    link.href = url.href;
    link.hidden = false;
    document.querySelector('#application-status').textContent = '在线入口已开放';
    document.querySelector('#application-note').textContent = '前往效果器档案室，继续探索。';
  } catch {
    document.querySelector('#application-status').textContent = '在线入口暂不可用';
    document.querySelector('#application-note').textContent = '作品介绍仍可阅读，请稍后再试。';
  }
}
connectApplication();
