import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const source = await fs.readFile(new URL('../src/services/progress/evidence.ts', import.meta.url), 'utf8');
const evidence = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);

test('오답 교정은 최초 기록을 보존하고 보상을 중복 지급하지 않는다', () => {
  let record = evidence.nextActivityRecord(undefined, { done: true, correct: false }, 'first');
  assert.equal(record.points, 5);
  record = evidence.nextActivityRecord(record, { done: true, correct: true }, 'second');
  assert.equal(record.firstCorrect, false);
  assert.equal(record.correct, true);
  assert.equal(record.points, 10);
  for (let i = 0; i < 10; i++) record = evidence.nextActivityRecord(record, { done: true, correct: true }, 'again');
  assert.equal(record.points, 10);
  assert.equal(record.firstCorrect, false);
  assert.equal(record.attempts, 12);
  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
});

test('예전 형식의 기록을 이어받아도 첫 오답을 정답으로 덮어쓰지 않는다', () => {
  const record = evidence.nextActivityRecord({ done: true, correct: false, at: 'old' }, { done: true, correct: true }, 'new');
  assert.equal(record.firstCorrect, false);
  assert.equal(record.attempts, 2);
});

test('새 자료 문제의 재시도는 최초 독립 응답을 보존한다', () => {
  let record = evidence.nextTransferAnswer(undefined, 0, false, 'first');
  record = evidence.nextTransferAnswer(record, 1, true, 'second');
  assert.equal(record.firstCorrect, false);
  assert.equal(record.correct, true);
  assert.equal(record.attempts, 2);
});

test('모든 탐구 화면을 렌더링하며 제출 전 해설·모범 필기를 숨긴다', async () => {
  const server = await createServer({ server: { middlewareMode: true, watch: null }, cacheDir: 'node_modules/.vite-pilot-check', logLevel: 'error' });
  try {
    const { PilotLesson, PilotUnitPanel, TransferReview } = await server.ssrLoadModule('/src/features/learn/PilotLesson.tsx');
    const { TermContext } = await server.ssrLoadModule('/src/features/learn/TermContext.tsx');
    const { SCIENCE_WIDGETS } = await server.ssrLoadModule('/src/features/learn/ScienceWidgets.tsx');
    let cards = 0;
    let activities = 0;
    for (const id of ['unit-1-1', 'unit-1-2']) {
      const unit = JSON.parse(await fs.readFile(`public/content/units/${id}.json`, 'utf8'));
      const wrap = (element) => renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(TermContext.Provider, { value: { unit, openTerm() {} } }, element)));
      assert.ok(wrap(React.createElement(PilotUnitPanel, { unit })).includes('구조적 필기장'));
      const review = wrap(React.createElement(TransferReview, { unit }));
      assert.ok(!review.includes('w-feedback'));
      for (const stage of unit.stages) {
        for (const step of stage.steps) {
          if (step.type === 'question') continue;
          const html = wrap(React.createElement(PilotLesson, { unit, step }));
          assert.ok(html.includes('영상 제작 가이드 열기'), step.lesson.id);
          assert.ok(!html.includes('pilot-note-model'), `${step.lesson.id}: model answer exposed`);
          assert.ok(!html.includes('재제작 필요'), `${step.lesson.id}: reference art still visible`);
          cards++;
          for (const activity of step.activities) {
            const Widget = SCIENCE_WIDGETS[activity.widget];
            assert.ok(Widget, activity.widget);
            const renderWidget = (savedState) => renderToStaticMarkup(React.createElement(Widget, { props: activity.props, savedState, onResult() { assert.fail('render submitted an answer'); }, onState() { assert.fail('render changed a draft'); } }));
            const fresh = renderWidget(undefined);
            assert.ok(!fresh.includes('science-feedback'), `${activity.id}: feedback exposed before submission`);
            let saved = { choice: (activity.props.question ?? activity.props).answer, checked: true, attempts: 2 };
            if (activity.widget === 'cosmicTimeline') saved = { order: activity.props.answer, checked: true, attempts: 2, moved: true };
            if (activity.widget === 'evidenceSort') saved = { assignments: Object.fromEntries(activity.props.items.map((item) => [item.id, item.bin])), checked: true, attempts: 2 };
            const restored = renderWidget(JSON.parse(JSON.stringify(saved)));
            assert.ok(restored.includes('이번 기록은 고쳐 풀기'), `${activity.id}: restored correction mislabeled`);
            activities++;
          }
        }
      }
    }
    assert.equal(cards, 30);
    assert.equal(activities, 31);
  } finally {
    await server.close();
  }
});
