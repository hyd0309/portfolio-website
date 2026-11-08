"""Import the supplied literary work, ignoring DOCX instructions/metadata.

Direct paragraph runs are intentional: descendant text includes duplicate
DrawingML/VML copies of floating footnotes. This is a build-time importer.
"""
from pathlib import Path
import argparse
import html
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def extract(path):
    with zipfile.ZipFile(path) as source:
        tree = ET.fromstring(source.read("word/document.xml"))
    paragraphs = tree.findall(".//w:body/w:p", NS)
    text = lambda p: "".join(n.text or "" for n in p.findall("w:r/w:t", NS))
    body = [text(p) for p in paragraphs]
    notes = []
    for p in paragraphs:
        # Each anchored shape has one modern copy and one legacy fallback.
        box = p.find(".//w:txbxContent", NS)
        if box is not None:
            notes.extend(text(n) for n in box.findall("w:p", NS) if text(n))
    assert body[0] == "流星记忆" and len(body) == 30 and len(notes) == 5
    return body, notes


def paragraph(text, date=False):
    value = html.escape(text)
    value = re.sub(r"\[([1-5])\]", lambda m: (
        f'<sup><a id="meteor-ref-{m[1]}" href="#meteor-note-{m[1]}" '
        f'aria-label="注释 {m[1]}">[{m[1]}]</a></sup>'), value)
    return f'<p class="{"literary-date" if date else "literary-paragraph"}">{value}</p>'


def render(body, notes):
    pages = []
    groups, group, length = [], [], 0
    # Keep original paragraphs intact. Leaves flow vertically if a narrow screen
    # needs extra space; no fixed-height clipping or invisible overflow.
    for i in range(2, 29):
        refs = re.findall(r"\[([1-5])\]", body[i])
        weight = len(body[i]) + sum(len(notes[int(n)-1]) for n in refs)
        if group and length + weight > 430 and i != 28:
            groups.append(group)
            group, length = [], 0
        group.append(i)
        length += weight
    if group:
        groups.append(group)
    for group in groups:
        content = "\n".join(paragraph(body[i], i == 28) for i in group)
        references = [int(n) for i in group for n in re.findall(r"\[([1-5])\]", body[i])]
        footnotes = "\n".join(
            f'<li id="meteor-note-{n}" value="{n}">{html.escape(notes[n-1])}'
            f' <a href="#meteor-ref-{n}" aria-label="返回注释 {n} 的正文">↩</a></li>'
            for n in references)
        note_block = f'<aside class="literary-notes" aria-label="本页注释"><ol>{footnotes}</ol></aside>' if references else ''
        number = len(pages) + 1
        pages.append(f'''<section class="literary-page" id="meteor-page-{number}" aria-label="第 {number} 页">
          <div class="literary-columns">{content}</div>
          {note_block}
          <span class="book-folio" aria-hidden="true">{number}</span>
        </section>''')
    return '''<!-- METEOR:START -->
    <section class="writing-section narrative-section" id="writing" aria-labelledby="writing-title">
      <h2 class="module-title" id="writing-title"><span>还在用纸笔创作的日子</span><span lang="en">FICTION</span></h2>
      <blockquote class="writing-quote" cite="#meteor-work">
        <p>“这应是一份特别的馈赠，鱼儿却偏偏忘却，良久不能重忆。”</p>
      </blockquote>
      <details class="literary-work" id="meteor-work">
        <summary id="meteor-title"><h3>《流星记忆》</h3><span class="work-toggle-hint"><span class="when-collapsed">点此展开 <b aria-hidden="true">⌄</b></span><span class="when-expanded">点此收起 <b aria-hidden="true">⌃</b></span></span></summary>
        <details class="meteor-book" id="meteor-book">
          <summary class="book-cover">
            <span class="cover-face">
              <span class="cover-series" lang="en">A STORY TO KEEP</span>
              <span class="cover-title">流星记忆</span>
              <span class="cover-award">2020“岭南杯”获奖作品</span>
              <span class="cover-epigraph">你知道流星的寿命<br>有多久吗？<small>题记</small></span>
              <span class="cover-date">2020.07.30</span>
              <span class="cover-invitation">翻开这本书 <span aria-hidden="true">↗</span></span>
            </span>
            <span class="cover-close-label">← 合上书页，回到封面</span>
          </summary>
        <article class="literary-reader" aria-labelledby="meteor-title" tabindex="-1">
          <div class="book-spread">
          ''' + "\n".join(pages) + '''
          </div>
        </article>
        </details>
      </details>
    </section>
    <!-- METEOR:END -->'''


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("docx", type=Path)
    args = parser.parse_args()
    body, notes = extract(args.docx)
    target = ROOT / "dist/index.html"
    page = target.read_text(encoding="utf-8")
    block = render(body, notes)
    if "<!-- METEOR:START -->" in page:
        page = re.sub(r"<!-- METEOR:START -->.*?<!-- METEOR:END -->", lambda _: block, page, flags=re.S)
    else:
        anchor = '    <section class="lab section"'
        assert anchor in page
        page = page.replace(anchor, block + "\n" + anchor, 1)
    page = "\n".join(line.rstrip() for line in page.splitlines()) + "\n"
    target.write_text(page, encoding="utf-8")
    print(f"Imported {len(body[2:28])} body paragraphs, date, and {len(notes)} unique notes.")
