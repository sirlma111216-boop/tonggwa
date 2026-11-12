import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chooseSet, emptyJournal, makeSession, recordGraded, restoreJournal } from '../src/features/march/model.ts';
const bank=JSON.parse(fs.readFileSync('public/march/bank.json','utf8'));
const answers=JSON.parse(fs.readFileSync('public/march/answers.json','utf8'));
test('all 145 questions classified, selected keys/pages valid and no solutions in bank',()=>{
  assert.equal(bank.audit.length,145);assert.equal(bank.questions.length,57);
  assert.equal(new Set(bank.audit.map(q=>q.id)).size,145);
  assert.deepEqual(bank.exams.map(e=>e.selected),[20,4,3,25,4,1]);
  for(const q of bank.questions){assert.ok(answers[q.id]);assert.ok(q.page>=1&&q.page<=(q.exam==='2503'?4:6));assert.ok(answers[q.id].answer>=1&&answers[q.id].answer<=5);assert.equal(typeof answers[q.id].correct,'boolean');assert.ok(answers[q.id].hint&&answers[q.id].idea&&answers[q.id].check);assert.equal(q.answer,undefined);}
  assert.equal(bank.audit.filter(q=>q.scope==='high-or-mixed').length,88);
});
test('new set is subject-balanced, unique, and reserves March 2026',()=>{
  const journal=emptyJournal();const ids=chooseSet(bank.questions,journal,'new');
  assert.equal(ids.length,5);assert.equal(new Set(ids).size,5);
  assert.equal(new Set(ids.map(id=>bank.questions.find(q=>q.id===id).domain)).size,5);
  assert.ok(ids.every(id=>!id.startsWith('march-2603')));
});
test('retries preserve first score, grading is idempotent, uncertainty routes to review',()=>{
  let j=emptyJournal();const id='march-2503-1';
  let s=makeSession([id],'practice');s.responses[id]={choice:1,confidence:'sure',at:new Date().toISOString()};
  j=recordGraded(j,s,answers);j=recordGraded(j,j.session,answers);assert.equal(j.attempts.length,1);assert.equal(j.attempts[0].correct,false);
  assert.ok(chooseSet(bank.questions,j,'review').includes(id));assert.ok(!chooseSet(bank.questions,j,'new').includes(id));
  s=makeSession([id],'practice');s.responses[id]={choice:answers[id].answer,confidence:'guess',at:new Date().toISOString()};j=recordGraded(j,s,answers);
  assert.equal(j.attempts[0].correct,false);assert.equal(j.attempts[1].correct,true);assert.ok(chooseSet(bank.questions,j,'review').includes(id));
  assert.deepEqual(restoreJournal(JSON.stringify(j),bank),j);
});
test('invalid saved sessions and invalid answer keys fail instead of silently grading',()=>{
  const j=emptyJournal();j.session=makeSession(['missing'],'practice');assert.throws(()=>restoreJournal(JSON.stringify(j),bank));
  assert.throws(()=>restoreJournal('{broken',bank));
  const s=makeSession(['march-2503-1'],'practice');s.responses[s.ids[0]]={choice:1,confidence:'sure',at:'now'};
  assert.throws(()=>recordGraded(emptyJournal(),s,{}));assert.throws(()=>makeSession([],'practice'));
});
