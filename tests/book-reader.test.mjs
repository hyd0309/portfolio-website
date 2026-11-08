import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
test('cover copy, disclosure and upward bubble contract', () => {
  for (const text of ['FICTION', '点此展开', '点此收起', '2020“岭南杯”获奖作品', '你知道流星的寿命', '<small>题记</small>']) assert.ok(html.includes(text), text);
  const bubble = readFileSync(new URL('../dist/identity.mjs', import.meta.url), 'utf8');
  assert.ok(bubble.includes("bubble.dataset.side = 'above'"));
  assert.ok(!bubble.includes("? 'below'"));
});

test('real browser: modal isolation, pagination, notes, resize and focus restoration', { skip: !process.env.BOOK_READER_BROWSER, timeout: 90000 }, async () => {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  const browser = await chromium.launch({ executablePath: process.env.BOOK_READER_BROWSER, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 824, height: 642 } });
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4180/?test=reader-02#writing');
    await page.waitForSelector('.reader-dialog', { state: 'attached' });
    const original = await page.locator('.literary-paragraph, .literary-date').allTextContents();
    await page.locator('#meteor-title').click();
    assert.equal(await page.locator('.when-expanded').isVisible(), true);
    await page.locator('.book-cover').click();
    await page.waitForSelector('dialog[open]');
    assert.equal(await page.evaluate(() => !!document.querySelector('dialog:modal')), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'hidden');
    assert.equal(await page.evaluate(() => { document.querySelector('.nav a').focus(); return document.querySelector('dialog').contains(document.activeElement); }), true);
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true); }
    const next = page.locator('.book-controls [data-turn="1"]');
    const edgeNext = page.locator('.reader-edge-next');
    await edgeNext.hover();
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.reader-edge-next span')).opacity) > .9);
    const firstPosition = await page.locator('.book-position').textContent();
    await edgeNext.click();
    assert.notEqual(await page.locator('.book-position').textContent(), firstPosition);
    await page.locator('.reader-edge-prev').click();
    assert.equal(await page.locator('.book-position').textContent(), firstPosition);
    for (const viewport of [{width:824,height:642},{width:375,height:812},{width:320,height:568},{width:1280,height:800}]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(220);
      assert.deepEqual(await page.locator('.literary-paragraph, .literary-date').allTextContents(), original);
      // Visit all pages and check no outer-page clipping and bottom-aligned notes.
      await page.evaluate(() => { location.hash = '#meteor-ref-1'; });
      await page.waitForTimeout(100);
      while (await page.locator('.book-controls [data-turn="-1"]').isEnabled()) await page.locator('.book-controls [data-turn="-1"]').click();
      let turns = 0;
      do {
        await page.locator('.reader-dialog').evaluate(async dialog => {
          await Promise.all(dialog.getAnimations({subtree:true}).map(animation => animation.finished.catch(() => {})));
        });
        const issues = await page.locator('.reader-dialog').evaluate(dialog => {
          const result=[];
          for (const leaf of dialog.querySelectorAll('.literary-page:not([hidden])')) {
            if (leaf.scrollHeight > leaf.clientHeight + 2) result.push('outer page overflow');
            const note=leaf.querySelector('.literary-notes');
            if(note) {
              const gap=leaf.getBoundingClientRect().bottom-note.getBoundingClientRect().bottom;
              const pad=parseFloat(getComputedStyle(leaf).paddingBottom);
              if(Math.abs(gap-pad)>3) result.push('note not bottom aligned: '+gap);
            }
          }
          return result;
        });
        assert.deepEqual(issues, [], JSON.stringify(viewport));
        if (!(await next.isEnabled())) break;
        await next.click(); turns++; assert.ok(turns < 40);
      } while (true);
      assert.equal(await next.isDisabled(), true);
    }
    await page.setViewportSize({width:824,height:642}); await page.waitForTimeout(220);
    await page.evaluate(() => { location.hash = '#meteor-note-1'; });
    await page.waitForFunction(() => !document.querySelector('#meteor-note-1').closest('.literary-page').hidden);
    mkdirSync(new URL('../qa/', import.meta.url), {recursive:true});
    await page.screenshot({path: new URL('../qa/reader-desktop.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog[open]', { state: 'hidden' });
    assert.equal(await page.locator('.book-cover').evaluate(node => node === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('reader-active')), false);
    await page.locator('.book-cover').click();
    await page.locator('.reader-exit').click();
    await page.waitForSelector('dialog[open]', { state: 'hidden' });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
