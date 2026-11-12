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
    assert.equal(cards, 29); // unit-1-1 선개념은 두 개의 쉬운 선택형 문항으로 바로 마무리한다.
    assert.equal(activities, 30);
  } finally {
    await server.close();
  }
});

test('첫 선개념은 짧은 설명과 5지선다이며 예전 서술 답안으로 잠기거나 완료되지 않는다', async () => {
  const unit = JSON.parse(await fs.readFile('public/content/units/unit-1-1.json', 'utf8'));
  const answers = JSON.parse(await fs.readFile('public/content/answers/unit-1-1.json', 'utf8'));
  const stage = unit.stages.find(s => s.key === 'prerequisite');
  assert.deepEqual(stage.steps, [{ type: 'question', id: 'T1-02-01-P1' }, { type: 'question', id: 'T1-02-01-P2' }]);
  const server = await createServer({ server: { middlewareMode: true, watch: null }, cacheDir: 'node_modules/.vite-prerequisite-check', logLevel: 'error' });
  try {
    const { QuestionStep } = await server.ssrLoadModule('/src/features/learn/QuestionStep.tsx');
    const { currentAnswerRecord, firstUnansweredQuestionStep } = await server.ssrLoadModule('/src/features/learn/answerRecord.ts');
    const old = { value: '원자핵입니다. 전자는 밖에 있어요.', submittedAt: 'old', correct: null, selfMark: 'ok' };
    const snapshot = JSON.stringify(old);
    const records = Object.fromEntries(stage.questionIds.map(id => [id, old]));
    assert.equal(firstUnansweredQuestionStep(unit, stage, records), 0, 'old written answers must not complete the revised stage');
    for (const [i, id] of stage.questionIds.entries()) {
      const q = unit.questions[id];
      const answer = answers[id];
      assert.equal(q.kind, 'choice');
      assert.equal(q.choices.length, 5);
      assert.equal(new Set(q.choices).size, 5);
      assert.equal(answer.choiceIndex, [1, 3][i]);
      assert.match(q.prompt, /^\*\*개념 한 입\.\*\*/);
      assert.equal(q.prompt.split('\n\n').length, 2, 'one brief concept and one simple question share the screen');
      assert.ok(q.prompt.length < 220);
      assert.doesNotMatch(q.prompt, /이유를 쓰|서술하|근거를 쓰/);
      const render = record => renderToStaticMarkup(React.createElement(QuestionStep, {
        question: q, number: i + 1, total: 2, record, answer,
        onCheck() { assert.fail('render submitted an answer'); },
        onSelfMark() { assert.fail('render changed an old answer'); }, bind() {},
      }));
      for (const record of [undefined, old, { ...old, value: 5, correct: false }, { ...old, value: 1.5, correct: true }]) {
        const html = render(record);
        assert.equal((html.match(/type="radio"/g) || []).length, 5);
        assert.ok(html.includes('callout note') && html.includes('개념 한 입'));
        assert.doesNotMatch(html, /<textarea|disabled=""|self-mark-wrap|feedback-head/, 'fresh and incompatible records must allow a new choice without old feedback');
      }
      const current = { value: answer.choiceIndex, submittedAt: 'new', correct: true };
      assert.equal(currentAnswerRecord(q, current), current);
      assert.equal(currentAnswerRecord(q, old), undefined);
      const restored = render(current);
      assert.equal((restored.match(/disabled=""/g) || []).length, 5, 'a valid submitted choice is restored');
      assert.match(restored, /정답이에요/);
      assert.doesNotMatch(restored, /self-mark-wrap/);
      records[id] = current;
      assert.equal(firstUnansweredQuestionStep(unit, stage, records), i === 0 ? 1 : -1);
    }
    assert.equal(JSON.stringify(old), snapshot, 'compatibility checks preserve previous written responses');
  } finally {
    await server.close();
  }
});

test('첫 단원 평가는 9개 모두 5지선다이며 개념·심화의 옛 서술 기록을 새 응답으로 세지 않는다', async () => {
  const unit = JSON.parse(await fs.readFile('public/content/units/unit-1-1.json', 'utf8'));
  const answers = JSON.parse(await fs.readFile('public/content/answers/unit-1-1.json', 'utf8'));
  const expected = { P1: 1, P2: 3, C1: 2, C2: 4, C3: 0, A1: 1, A2: 3, S1: 0, S2: 2 };
  assert.equal(Object.keys(unit.questions).length, 9);
  for (const [suffix, index] of Object.entries(expected)) {
    const id = `T1-02-01-${suffix}`;
    const q = unit.questions[id];
    assert.equal(q.kind, 'choice', id);
    assert.equal(q.choices.length, 5, id);
    assert.equal(new Set(q.choices).size, 5, id);
    assert.equal(answers[id].choiceIndex, index, id);
    assert.doesNotMatch(q.prompt, /서술하시오|근거를 쓰시오|배열하시오|구하시오/, id);
  }
  // 심화평가는 자료표를 본문에 유지한다.
  for (const suffix of ['A1', 'A2']) {
    assert.match(unit.questions[`T1-02-01-${suffix}`].prompt, /\|---/, `${suffix}: observation and conditions must remain a readable data table`);
  }
  // 개념평가 C1~C3은 시험지 형식('그림은 …이다')으로 바꾸면서 자료표를 그림 설명으로 옮겼다.
  // 표가 사라진 만큼, 풀이에 필요한 조건이 그림 설명(캡션·패널)에 글자로 남아 있어야 한다.
  const mediaText = (suffix) => (unit.questions[`T1-02-01-${suffix}`].media ?? [])
    .map(m => [m.caption, ...(m.panels ?? []).map(p => `${p.label} ${p.description}`)].join(' ')).join(' ');
  for (const [suffix, required] of Object.entries({
    C1: [/470 nm/, /620 nm/, /어두운 선/, /연속/],
    C2: [/A 원자핵과 전자가 결합하여 중성 원자 형성/, /B 양성자·중성자 형성/, /C 초기 헬륨 원자핵 형성/],
    C3: [/440 nm/, /590 nm/, /방출선/, /흡수선/, /X 기체/],
  })) {
    assert.match(unit.questions[`T1-02-01-${suffix}`].prompt, /^그림/, `${suffix}: figure-led exam wording`);
    for (const pattern of required) assert.match(mediaText(suffix), pattern, `${suffix}: the figure description must carry the condition ${pattern}`);
  }
  const server = await createServer({ server: { middlewareMode: true, watch: null }, cacheDir: 'node_modules/.vite-unit-assessment-check', logLevel: 'error' });
  try {
    const { QuestionStep } = await server.ssrLoadModule('/src/features/learn/QuestionStep.tsx');
    const { firstUnansweredQuestionStep } = await server.ssrLoadModule('/src/features/learn/answerRecord.ts');
    const old = { value: '예전에 직접 쓴 풀이', submittedAt: 'old', correct: null, selfMark: 'ok' };
    for (const key of ['concept_check', 'advanced_check']) {
      const stage = unit.stages.find(s => s.key === key);
      const records = Object.fromEntries(stage.questionIds.map(id => [id, old]));
      assert.equal(firstUnansweredQuestionStep(unit, stage, records), 0);
      for (const [i, id] of stage.questionIds.entries()) {
        const html = renderToStaticMarkup(React.createElement(QuestionStep, {
          question: unit.questions[id], number: i + 1, total: stage.questionIds.length,
          record: old, answer: answers[id], onCheck() { assert.fail('render submitted an answer'); },
          onSelfMark() { assert.fail('render changed an old answer'); }, bind() {},
        }));
        assert.equal((html.match(/type="radio"/g) || []).length, 5, id);
        // 심화평가는 자료표, 개념평가는 그림과 그 설명이 선택지보다 먼저 렌더되어야 한다.
        if (key === 'advanced_check') assert.match(html, /<table/, `${id}: authored data table renders`);
        else {
          assert.match(html, /<figure class="question-media-card">[\s\S]*<figcaption>/, `${id}: figure and its description render`);
          assert.ok(html.indexOf('<figcaption>') < html.indexOf('role="radiogroup"'), `${id}: figure description comes before the choices`);
          assert.ok(html.lastIndexOf('?</p>') > html.indexOf('</figure>') && html.lastIndexOf('?</p>') < html.indexOf('role="radiogroup"'), `${id}: the question sentence sits between the figure and the choices`);
        }
        assert.doesNotMatch(html, /<textarea|disabled=""|self-mark-wrap|feedback-head/, `${id}: an old written response must allow a new choice`);
        records[id] = { value: answers[id].choiceIndex, correct: true, submittedAt: 'new' };
        assert.equal(firstUnansweredQuestionStep(unit, stage, records), i + 1 === stage.questionIds.length ? -1 : i + 1);
      }
    }
    assert.equal(old.value, '예전에 직접 쓴 풀이', 'compatibility does not erase the old record');
  } finally {
    await server.close();
  }
});

test('심화 활동의 관측 범위와 질량 자료가 같은 화면의 설명·질문과 일치한다', async () => {
  const unit = JSON.parse(await fs.readFile('public/content/units/unit-1-1.json', 'utf8'));
  const advanced = unit.stages.find(s => s.key === 'advanced');
  const rangeStep = advanced.steps.find(s => s.activities?.some(a => a.id === 'u11-advanced-0'));
  const range = rangeStep.activities.find(a => a.id === 'u11-advanced-0').props;
  assert.deepEqual(range.sources.map(s => s.lines), [[425, 515], [515, 675]]);
  assert.deepEqual(range.unknownLines, [515]);
  for (const candidate of range.sources) {
    assert.deepEqual(candidate.lines.filter(nm => nm >= range.min && nm <= range.max), range.unknownLines, 'both candidates give exactly the same observed lines in the selected window');
  }
  for (const value of [425, 515, 675, range.min, range.max]) assert.ok(rangeStep.md.includes(String(value)), `the reading must use the activity's wavelength ${value}`);
  const massStep = advanced.steps.find(s => s.activities?.some(a => a.id === 'u11-advanced-1'));
  const mass = massStep.activities.find(a => a.id === 'u11-advanced-1').props;
  const totals = mass.samples.find(s => s.id === 'mass');
  const counts = mass.samples.find(s => s.id === 'count');
  assert.deepEqual(totals.parts.map(p => p.value), [18, 12]);
  assert.deepEqual(counts.parts.map(p => p.value), [18, 3]);
  assert.deepEqual(totals.parts.map((p, i) => p.value / [1, 4][i]), counts.parts.map(p => p.value), 'mass and count tabs represent the same mixture');
  for (const sample of mass.samples) assert.equal(sample.parts.reduce((sum, p) => sum + p.value, 0), sample.total);
  assert.match(mass.question.prompt, /수소 18, 헬륨 12/);
  assert.match(massStep.md, /18:3 = 6:1/);
  assert.equal(mass.question.options.find(o => o.id === mass.question.answer).text, '6:1');
  for (const id of ['T1-02-01-A1', 'T1-02-01-S1']) {
    assert.match(unit.questions[id].prompt, /400~700 nm/, `${id}: exclusion needs an explicit observed range`);
  }
  assert.doesNotMatch(JSON.stringify(unit), /연속광/, 'the first unit uses explained classroom terminology');
});
