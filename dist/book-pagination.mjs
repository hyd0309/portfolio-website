// Pack intact paragraphs against the actual viewport and font metrics. A very
// tall single paragraph can scroll within its text area; notes stay on the page.
export function paginateBook(spread, paragraphs, notes) {
  spread.replaceChildren();
  const leaves = [];
  function newLeaf() {
    const leaf = document.createElement('section');
    leaf.className = 'literary-page measuring';
    const text = document.createElement('div');
    text.className = 'literary-columns';
    leaf.append(text);
    spread.append(leaf);
    return leaf;
  }
  function updateNotes(leaf) {
    leaf.querySelector('.literary-notes')?.remove();
    const references = [...leaf.querySelectorAll('a[href^="#meteor-note-"]')];
    if (!references.length) return;
    const aside = document.createElement('aside');
    aside.className = 'literary-notes';
    aside.setAttribute('aria-label', '本页注释');
    const list = document.createElement('ol');
    for (const ref of references) {
      const note = notes.get(ref.getAttribute('href').slice(1));
      if (note) list.append(note.cloneNode(true));
    }
    aside.append(list);
    leaf.append(aside);
  }
  function overflows(leaf) {
    const style = getComputedStyle(leaf);
    const available = leaf.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const text = leaf.querySelector('.literary-columns');
    const notesHeight = leaf.querySelector('.literary-notes')?.offsetHeight || 0;
    return text.scrollHeight + notesHeight > available + 1;
  }
  function finish(leaf) {
    const number = leaves.length + 1;
    leaf.id = `meteor-page-${number}`;
    leaf.setAttribute('aria-label', `第 ${number} 页`);
    const folio = document.createElement('span');
    folio.className = 'book-folio';
    folio.setAttribute('aria-hidden', 'true');
    folio.textContent = number;
    leaf.append(folio);
    leaf.classList.remove('measuring');
    leaf.hidden = true;
    leaves.push(leaf);
  }
  let leaf = newLeaf();
  for (const [index, original] of paragraphs.entries()) {
    const paragraph = original.cloneNode(true);
    paragraph.dataset.paragraph = index;
    let text = leaf.querySelector('.literary-columns');
    text.append(paragraph);
    updateNotes(leaf);
    if (text.children.length > 1 && overflows(leaf)) {
      paragraph.remove();
      updateNotes(leaf);
      finish(leaf);
      leaf = newLeaf();
      text = leaf.querySelector('.literary-columns');
      text.append(paragraph);
      updateNotes(leaf);
    }
  }
  finish(leaf);
  return leaves;
}
