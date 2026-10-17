// 화면 검사용 스크린샷. 시스템 Chrome/Edge 를 헤드리스로 띄운다.
//   npm run build && npx vite preview --port 4173   (다른 터미널)
//   node scripts/screenshots.mjs [baseUrl] [outDir] [width] [height]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? 'shots';
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 900);
fs.mkdirSync(out, { recursive: true });

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error('Chrome/Edge 를 찾지 못했어요');

const browser = await chromium.launch({ executablePath, headless: true });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'ko-KR' });
const page = await ctx.newPage();
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });
  console.log('shot', name);
};

await page.goto(`${base}/login`);
await shot('01-login');
await page.fill('#email', 'sirlma111216@gmai.com');
await page.fill('#pw', '966Kh4148!');
await page.click('button:has-text("로그인")');
await page.waitForURL(`${base}/`);
await shot('02-start-empty');
await page.click('text=처음으로 학습하기');
await page.waitForURL(/start\/semester/);
await shot('03-semester');
await page.click('text=1학기 · 통합과학1');
await page.waitForURL(/start\/units\/1/);
await page.waitForSelector('.unit-row');
await shot('04-units');
await page.goto(`${base}/learn/unit-0-1`);
await page.waitForSelector('.path');
await shot('05-unit-map');
await page.goto(`${base}/learn/unit-0-1/concept?s=0`);
await page.waitForSelector('.lesson-card');
await shot('06-concept-step');
await page.goto(`${base}/learn/unit-0-1/concept?s=2`);
await page.waitForSelector('.lesson-card');
await shot('07-concept-table');
await page.goto(`${base}/learn/unit-0-1/exam_check?s=0`);
await page.waitForSelector('.choices');
await shot('08-question');
await page.click('.choices li:nth-child(2) label');
await shot('09-question-selected');
await page.click('.lesson-actions .btn-primary');
await page.waitForSelector('.feedback');
await shot('10-question-feedback');
await page.click('.lesson-actions .btn-primary');
await page.waitForSelector('.choices');
await page.click('.choices li:nth-child(4) label');
await page.click('.lesson-actions .btn-primary');
await page.waitForSelector('.feedback');
await page.click('.lesson-actions .btn-primary');
await page.waitForSelector('.summary');
await shot('11-stage-summary');
await page.goto(`${base}/learn/unit-0-1/prerequisite?s=0`);
await page.waitForSelector('textarea');
await page.fill('textarea', '0.35 m');
await page.click('.lesson-actions .btn-primary');
await page.waitForSelector('.feedback');
await shot('12-short-feedback');
await page.goto(`${base}/learn/unit-0-1/prerequisite?s=2`);
await page.waitForSelector('.lesson-card');
await shot('13-remediation');
await page.click('text=도움 · 노트');
await shot('14-help-open');
await page.goto(`${base}/`);
await page.waitForSelector('.start-hero');
await shot('15-start-resume');
await page.goto(`${base}/exams`);
await page.waitForSelector('.exam-grid');
await shot('16-exams');
await page.goto(`${base}/exams/KICE-2024-Q01`);
await page.waitForSelector('.exam-img');
await shot('17-exam-q');
await page.goto(`${base}/record`);
await page.waitForSelector('.table');
await shot('18-record');
await page.goto(`${base}/learn/unit-5-1/concept?s=0`);
await page.waitForSelector('.lesson-card');
await shot('19-concept-unit51');
await browser.close();
