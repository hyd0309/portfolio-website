import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

test('thought bubbles: full copy, upward placement, keyboard link and touch', {skip:!process.env.BOOK_READER_BROWSER,timeout:30000}, async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  const browser=await chromium.launch({executablePath:process.env.BOOK_READER_BROWSER,headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1100,height:850},hasTouch:true});
    await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4180/?v=thought-03#music');
    await page.waitForSelector('.thought-bubble',{state:'attached'});
    assert.equal(await page.locator('.thought-copy').count(),11);
    for(const word of await page.locator('.identity-word').all()){
      await word.focus();
      assert.equal(await word.locator('.thought-copy').textContent(),await word.getAttribute('data-thought'));
      assert.equal(await word.locator('.thought-bubble').getAttribute('aria-hidden'),'false');
      assert.equal(await word.locator('.thought-bubble').getAttribute('data-side'),'above');
    }
    const finance=page.locator('.word-finance');
    await finance.focus();
    await page.keyboard.press('Tab');
    const link=finance.getByRole('link',{name:'岭南学院'});
    assert.equal(await link.evaluate(el=>el===document.activeElement),true);
    assert.equal(await finance.locator('.thought-bubble').getAttribute('aria-hidden'),'false');
    assert.equal(await link.getAttribute('href'),'https://lingnan.sysu.edu.cn/');
    await page.waitForTimeout(1000);
    await page.screenshot({path:fileURLToPath(new URL('../qa/identity-desktop.png',import.meta.url))});
    const popupPromise=context.waitForEvent('page');
    await page.keyboard.press('Enter');
    const popup=await popupPromise; await popup.close();
    await page.keyboard.press('Escape');
    assert.equal(await finance.locator('.thought-bubble').getAttribute('aria-hidden'),'true');
    await page.setViewportSize({width:375,height:812});
    const music=page.locator('.word-music > .identity-label');
    await music.tap();
    assert.equal(await page.locator('.word-music .thought-bubble').getAttribute('aria-hidden'),'false');
    await music.tap();
    assert.equal(await page.locator('.word-music .thought-bubble').getAttribute('aria-hidden'),'true');
    await page.locator('#about').scrollIntoViewIfNeeded();
    await page.screenshot({path:fileURLToPath(new URL('../qa/closing-mobile.png',import.meta.url))});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#meteor-title').click();
    await page.locator('.book-cover').click();
    await page.evaluate(()=>{location.hash='#meteor-note-1'});
    await page.waitForFunction(()=>!document.querySelector('#meteor-note-1').closest('.literary-page').hidden);
    await page.screenshot({path:fileURLToPath(new URL('../qa/reader-mobile.png',import.meta.url))});
  }finally{await browser.close()}
});
