import { paginateBook } from './book-pagination.mjs';

const work = document.querySelector('#meteor-work');
if (work && typeof HTMLDialogElement !== 'undefined') {
  const summary = work.querySelector('#meteor-title');
  const book = work.querySelector('#meteor-book');
  const cover = book.querySelector('.book-cover');
  const reader = book.querySelector('article');
  const spread = reader.querySelector('.book-spread');
  const paragraphs = [...reader.querySelectorAll('.literary-paragraph, .literary-date')].map(p => p.cloneNode(true));
  const notes = new Map([...reader.querySelectorAll('.literary-notes li')].map(note => [note.id, note.cloneNode(true)]));
  const narrow = matchMedia('(max-width: 740px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let leaves = [], current = 0, resizeTimer;
  const dialog = document.createElement('dialog');
  dialog.className = 'reader-dialog';
  dialog.id = 'meteor-reader';
  dialog.setAttribute('aria-labelledby', 'reader-dialog-title');
  dialog.innerHTML = `<header class="reader-toolbar"><h2 id="reader-dialog-title">流星记忆 <span>阅读模式</span></h2><button type="button" class="reader-exit" autofocus aria-label="关闭阅读模式">关闭 <span aria-hidden="true">×</span></button></header><div class="reader-stage"></div><footer class="reader-bottom"><nav class="book-controls" aria-label="书页导航"><button type="button" data-turn="-1">上一页</button><span class="book-position" role="status" aria-live="polite"></span><button type="button" data-turn="1">下一页</button></nav></footer><button type="button" class="reader-edge reader-edge-prev" data-turn="-1" aria-label="上一页"><span aria-hidden="true">‹</span></button><button type="button" class="reader-edge reader-edge-next" data-turn="1" aria-label="下一页"><span aria-hidden="true">›</span></button>`;
  document.body.append(dialog);
  dialog.querySelector('.reader-stage').append(reader);
  const position = dialog.querySelector('.book-position');
  const exits = dialog.querySelector('.reader-exit');
  const turnButtons = [...dialog.querySelectorAll('[data-turn]')];
  cover.setAttribute('aria-haspopup', 'dialog');
  cover.setAttribute('aria-controls', dialog.id);

  function size() { return narrow.matches ? 1 : 2; }
  function showPage(index, animate = false) {
    const previous = current;
    current = Math.floor(Math.max(0, Math.min(index, leaves.length - 1)) / size()) * size();
    leaves.forEach((leaf, i) => {
      leaf.hidden = i < current || i >= current + size();
      if (!leaf.hidden) {
        leaf.querySelector('.literary-columns').scrollTop = 0;
        if (animate && !reducedMotion.matches && leaf.animate) {
          leaf.getAnimations().forEach(animation => animation.cancel());
          leaf.animate([
            { opacity: .45, transform: `perspective(1200px) rotateY(${current > previous ? -7 : 7}deg)` },
            { opacity: 1, transform: 'perspective(1200px) rotateY(0deg)' }
          ], { duration: 350, easing: 'ease-out' });
        }
      }
    });
    for (const button of turnButtons) button.disabled = Number(button.dataset.turn) < 0 ? current === 0 : current + size() >= leaves.length;
    const end = Math.min(current + size(), leaves.length);
    position.textContent = `${current + 1}${end > current + 1 ? ` — ${end}` : ''} / ${leaves.length}`;
  }
  function reflow() {
    if (!dialog.open) return;
    const paragraphIndex = leaves[current]?.querySelector('[data-paragraph]')?.dataset.paragraph || '0';
    leaves = paginateBook(spread, paragraphs, notes);
    const target = leaves.findIndex(leaf => leaf.querySelector(`[data-paragraph="${paragraphIndex}"]`));
    showPage(Math.max(0, target));
  }
  function clearBookHash() {
    if (location.hash.startsWith('#meteor-')) history.replaceState(null, '', `${location.pathname}${location.search}#writing`);
  }
  function openReader() {
    work.open = true;
    if (dialog.open) return;
    document.documentElement.classList.add('reader-active');
    dialog.showModal();
    reflow();
    exits.focus({ preventScroll: true });
  }
  function closeReader() { if (dialog.open) dialog.close(); }
  function revealTarget() {
    const id = location.hash.slice(1);
    if (!id.startsWith('meteor-')) return;
    if (id === 'meteor-title' || id === 'meteor-book' || id === 'meteor-work') { work.open = true; return; }
    // Validate before opening, and look up again after pagination recreates leaves.
    if (!dialog.querySelector(`#${CSS.escape(id)}`)) return;
    openReader();
    const target = dialog.querySelector(`#${CSS.escape(id)}`);
    const leaf = target?.closest('.literary-page');
    if (leaf) {
      showPage(leaves.indexOf(leaf));
      requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest' }));
    }
  }
  function turn(direction) {
    if (direction < 0 && current === 0 || direction > 0 && current + size() >= leaves.length) return;
    showPage(current + direction * size(), true);
    clearBookHash();
  }
  cover.addEventListener('click', event => { event.preventDefault(); openReader(); });
  exits.addEventListener('click', closeReader);
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('reader-active');
    clearBookHash();
    cover.focus({ preventScroll: true });
  });
  // Native modal dialog handles Escape, focus containment and background inertness.
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const stops = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')]
        .filter(node => node.getClientRects().length > 0);
      const first = stops[0], last = stops.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(event.key)) {
      event.preventDefault();
      turn(['ArrowLeft', 'PageUp'].includes(event.key) ? -1 : 1);
    }
  });
  for (const button of turnButtons) button.addEventListener('click', () => turn(Number(button.dataset.turn)));
  const collapse = document.createElement('button');
  collapse.type = 'button'; collapse.className = 'literary-close'; collapse.textContent = '收起《流星记忆》';
  collapse.addEventListener('click', () => {
    work.open = false;
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  work.append(collapse);
  work.addEventListener('toggle', () => {
    if (!work.open) { closeReader(); current = 0; book.open = false; clearBookHash(); }
  });
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reflow, 120);
  });
  window.addEventListener('hashchange', revealTarget);
  document.fonts?.ready.then(() => { if (dialog.open) { reflow(); revealTarget(); } });
  revealTarget();
}
