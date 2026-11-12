import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({executablePath,headless:true});
const out='tmp/march-exams/ui';fs.mkdirSync(out,{recursive:true});
const errors=[];
async function context(uid,viewport={width:1365,height:1000}) {
 const ctx=await browser.newContext({viewport});
 await ctx.addInitScript(uid=>{localStorage.setItem('tonggwa.session.v1',JSON.stringify({uid,displayName:'화면 검증',email:'qa@example.invalid',provider:'local'}));},uid);
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));return {ctx,page};
}
try {
 const {ctx,page}=await context('march-ui-practice');
 let answerRequests=0;page.on('request',r=>{if(r.url().endsWith('/march/answers.json'))answerRequests++;});
 await page.goto('http://127.0.0.1:5173/march');await page.getByRole('button',{name:'새 문제 5개 풀기'}).waitFor();
 await page.screenshot({path:`${out}/desktop.png`,fullPage:true});
 assert.equal(answerRequests,0);
 await page.getByRole('button',{name:'새 문제 5개 풀기'}).click();
 assert.equal(await page.getByText('10초 확인 · 개념 O/X').count(),0);
 // Each original source opens only after explicit user action.
 const source=page.getByRole('link',{name:'원문 문제지 열기 ↗'});assert.match(await source.getAttribute('href'),/^https:\/\/gichulbada.kr\/.+#page=\d+$/);
 assert.equal(answerRequests,0);
 for(let i=0;i<5;i++){
  await page.locator('input[name="answer"]').first().check();await page.getByLabel('찍었어요',{exact:true}).check();
  await page.getByRole('button',{name:'답 제출하기',exact:true}).click();await page.getByText('10초 확인 · 개념 O/X').waitFor();
  assert.ok(await page.getByRole('button',{name:i===4?'세트 결과 보기':'다음 문제',exact:true}).isDisabled());
  await page.getByRole('button',{name:'맞다',exact:true}).click();
  if(i===0){await page.reload();await page.getByText('10초 확인 · 개념 O/X').waitFor();await page.screenshot({path:`${out}/feedback.png`,fullPage:true});}
  await page.getByRole('button',{name:i===4?'세트 결과 보기':'다음 문제',exact:true}).click();
 }
 await page.getByRole('heading',{name:'세트를 마쳤어요'}).waitFor();
 let journal=await page.evaluate(()=>JSON.parse(localStorage.getItem('tonggwa:march:v1:march-ui-practice')));assert.equal(journal.attempts.length,5);
 await page.getByRole('button',{name:'다른 세트 고르기'}).click();assert.ok(await page.getByRole('button',{name:'오답·헷갈린 문제 복습'}).isEnabled());
 await ctx.close();
 const {ctx:mobile,page:mp}=await context('march-ui-assessment',{width:390,height:844});
 let requests=0;mp.on('request',r=>{if(r.url().endsWith('/march/answers.json'))requests++;});
 await mp.goto('http://127.0.0.1:5173/march');await mp.getByRole('button',{name:'2026년 3월 실력 점검 시작'}).waitFor();
 await mp.screenshot({path:`${out}/mobile.png`,fullPage:true});
 assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mp.getByRole('button',{name:'2026년 3월 실력 점검 시작'}).click();
 for(let i=0;i<25;i++){
  await mp.locator('input[name="answer"]').first().check();await mp.getByLabel('근거를 알아요',{exact:true}).check();
  await mp.getByRole('button',{name:'답 제출하기',exact:true}).click();
  if(i<24)await mp.getByRole('heading',{name:`${i+2} / 25 문제`,exact:true}).waitFor();
 }
 assert.equal(requests,0);assert.equal(await mp.getByText('10초 확인 · 개념 O/X').count(),0);
 await mp.getByRole('button',{name:'전체 제출하고 채점하기'}).click();await mp.getByRole('heading',{name:'세트를 마쳤어요'}).waitFor();
 journal=await mp.evaluate(()=>JSON.parse(localStorage.getItem('tonggwa:march:v1:march-ui-assessment')));assert.equal(journal.attempts.length,25);assert.equal(journal.session.done,true);
 await mobile.close();assert.deepEqual(errors,[]);
 console.log('UI PASS: desktop/mobile, practice/reload/review, 25-question assessment, answer withholding, account isolation');
}finally{await browser.close();}
