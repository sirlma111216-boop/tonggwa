// 학습 카드(본문 위계·용어 패널·활동 위젯) 검사용 스크린샷
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? 'shots-learn';
fs.mkdirSync(out, { recursive: true });
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
const page = await ctx.newPage();
const shot = async (name, full = false) => {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: full });
  console.log('shot', name);
};
await page.goto(`${base}/login`);
await page.fill('#email', 'sirlma111216@gmai.com');
await page.fill('#pw', '966Kh4148!');
await page.click('button:has-text("로그인")');
await page.waitForURL(`${base}/`);

const cards = [
  ['unit-0-1', 'concept', 0, 'c1-sorter-ladder'],
  ['unit-0-1', 'concept', 1, 'c2-order-ox'],
  ['unit-0-1', 'concept', 2, 'c3-converter'],
  ['unit-0-1', 'concept', 4, 'c5-ratio'],
  ['unit-0-1', 'concept', 5, 'c6-echo'],
  ['unit-0-1', 'advanced', 2, 'a3-resolve'],
  ['unit-0-1', 'strategy', 0, 's1-reflect'],
  ['unit-3-4', 'concept', 1, 'n2-ions'],
  ['unit-3-4', 'concept', 3, 'n4-figure-ox'],
  ['unit-5-1', 'concept', 0, 'u51-c1'],
  ['unit-2-4', 'concept', 1, 'u24-c2-auto'],
];
for (const [u, st, s, name] of cards) {
  await page.goto(`${base}/learn/${u}/${st}?s=${s}`);
  await page.waitForSelector('.lesson-card');
  await shot(name, true);
}
// 용어 패널
await page.goto(`${base}/learn/unit-0-1/concept?s=0`);
await page.waitForSelector('.lesson-card');
const term = page.locator('button.term').first();
if (await term.count()) {
  await term.click();
  await page.waitForSelector('.term-panel');
  await shot('term-panel');
}
// 위젯 조작: 이온
await page.goto(`${base}/learn/unit-3-4/concept?s=1`);
await page.waitForSelector('.ions-ctl');
await page.fill('.w-q input', '3');
await page.click('.w-q .btn-primary');
await shot('n2-ions-checked', true);
await browser.close();
