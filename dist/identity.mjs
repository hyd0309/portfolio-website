const cloud = document.querySelector('.identity-cloud');
if (cloud) {
  let active = null;
  let leaveTimer;
  const words = [...cloud.querySelectorAll('.identity-word')];
  for (const [index, word] of words.entries()) {
    const bubble = document.createElement('span');
    bubble.className = 'thought-bubble';
    bubble.id = `identity-thought-${index}`;
    bubble.setAttribute('aria-hidden', 'true');
    const surface = document.createElement('span');
    surface.className = 'thought-surface';
    const copy = document.createElement('span');
    copy.className = 'thought-copy';
    copy.textContent = word.dataset.thought || '';
    if (word.dataset.thoughtLinkText && word.dataset.thoughtLink) {
      const [before, after] = copy.textContent.split(word.dataset.thoughtLinkText);
      const link = document.createElement('a');
      link.textContent = word.dataset.thoughtLinkText;
      link.href = word.dataset.thoughtLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      copy.replaceChildren(before, link, after || '');
    }
    if (copy.textContent) {
      bubble.setAttribute('role', copy.querySelector('a') ? 'group' : 'tooltip');
      word.setAttribute('aria-describedby', bubble.id);
    }
    surface.append(copy);
    bubble.append(surface);
    word.append(bubble);
    word.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') show(word);
    });
    word.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return;
      if (!word.contains(document.activeElement)) leaveTimer = setTimeout(() => hide(word), 260);
    });
    word.addEventListener('focusin', () => show(word));
    word.addEventListener('focusout', event => {
      if (!word.contains(event.relatedTarget)) hide(word);
    });
    word.addEventListener('pointerdown', event => {
      if (event.target.closest('a')) return;
      if (event.pointerType === 'touch') {
        event.preventDefault();
        active === word ? hide(word) : show(word);
      }
    });
  }
  function place(word) {
    const bubble = word.querySelector('.thought-bubble');
    const rect = word.getBoundingClientRect();
    const bounds = cloud.getBoundingClientRect();
    const width = bubble.offsetWidth;
    const min = Math.max(12, bounds.left) + width / 2;
    const max = Math.min(innerWidth - 12, bounds.right) - width / 2;
    const center = Math.max(min, Math.min(rect.left + rect.width / 2, Math.max(min, max)));
    bubble.style.left = `${center - rect.left}px`;
    const tail = Math.max(25, Math.min(width - 25, rect.left + rect.width / 2 - center + width / 2));
    bubble.style.setProperty('--tail-x', `${tail}px`);
    bubble.dataset.side = 'above';
  }
  function show(word) {
    clearTimeout(leaveTimer);
    if (active && active !== word) hide(active);
    active = word;
    place(word);
    word.classList.add('is-bubble-open');
    if (word.dataset.thought) word.querySelector('.thought-bubble').setAttribute('aria-hidden', 'false');
  }
  function hide(word) {
    if (!word) return;
    word.classList.remove('is-bubble-open');
    word.querySelector('.thought-bubble').setAttribute('aria-hidden', 'true');
    if (active === word) active = null;
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { clearTimeout(leaveTimer); hide(active); }
  });
  document.addEventListener('pointerdown', event => {
    if (!cloud.contains(event.target)) hide(active);
  });
  window.addEventListener('resize', () => { if (active) place(active); });
  window.addEventListener('scroll', () => { if (active) place(active); }, { passive: true });
}
