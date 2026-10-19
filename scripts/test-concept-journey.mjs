import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ts from 'typescript';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const journey = JSON.parse(await fs.readFile(new URL('../content/lessons/unit-1-1-concept.json', import.meta.url), 'utf8'));
const unit = JSON.parse(await fs.readFile(new URL('../public/content/units/unit-1-1.json', import.meta.url), 'utf8'));
const sceneOf = (kind) => journey.scenes.find(scene => scene.kind === kind);
const escapeHtml = (value) => renderToStaticMarkup(React.createElement('span', {}, value)).replace(/^<span>|<\/span>$/g, '');

// Run the real controlled event handlers without a DOM. Only useId is replaced;
// JSX, state transitions, SVG markup and button disabled conditions are real.
async function loadLab(filename) {
  const source = await fs.readFile(new URL(`../src/features/learn/journey/${filename}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let id = 0;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === 'react') return { ...React, useId: () => `test-lab-${++id}` };
    if (name.endsWith('.css')) return {};
    return require(name);
  }, module, module.exports);
  return module.exports;
}

const { LightLab } = await loadLab('LightLabs.tsx');
const { CosmicLab } = await loadLab('CosmicLabs.tsx');

function* elements(node) {
  if (Array.isArray(node)) { for (const item of node) yield* elements(item); return; }
  if (!React.isValidElement(node)) return;
  if (typeof node.type === 'function') { yield* elements(node.type(node.props)); return; }
  yield node;
  yield* elements(node.props.children);
}

function textOf(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf(node.props.children);
  return String(node);
}

function labHarness(kind, saved = {}) {
  const Component = ['atom', 'cooling', 'timeline', 'ratio', 'origins'].includes(kind) ? CosmicLab : LightLab;
  let state = { preserved: 'other draft data', ...saved };
  let changes = 0;
  const element = () => React.createElement(Component, { kind, state, onChange(next) { assert.equal(next.preserved, 'other draft data'); state = next; changes++; } });
  const nodes = () => [...elements(element())];
  const findButton = (name, aria = false) => {
    const matches = nodes().filter(node => node.type === 'button' && (aria ? node.props['aria-label'] === name : textOf(node).trim().startsWith(name)));
    assert.equal(matches.length, 1, `${kind}: button ${name} should be unique`);
    return matches[0];
  };
  return {
    get state() { return state; },
    get changes() { return changes; },
    html: () => renderToStaticMarkup(element()),
    nodes,
    button: findButton,
    click(name, aria = false) {
      const button = findButton(name, aria);
      assert.ok(!button.props.disabled, `${kind}: ${name} is disabled`);
      button.props.onClick();
    },
  };
}

test('12장면의 배포 콘텐츠·노트·영상 참조가 실제 자료와 일치한다', async () => {
  assert.equal(journey.scenes.length, 12);
  assert.equal(new Set(journey.scenes.map(scene => scene.id)).size, 12);
  assert.deepEqual(unit.conceptJourney, journey, 'Run npm run content: served JSON does not match authored journey');
  const notes = new Map(unit.notebooks.map(note => [note.id, note]));
  const lessons = unit.stages.flatMap(stage => stage.steps).filter(step => step.lesson).map(step => step.lesson);
  const usedNotes = new Set();
  for (const scene of journey.scenes) {
    assert.ok(scene.question.options.some(option => option.id === scene.question.answer), scene.id);
    assert.equal(new Set(scene.question.options.map(option => option.id)).size, scene.question.options.length, scene.id);
    assert.ok(scene.question.options.every(option => option.feedback.trim()), `${scene.id}: missing targeted feedback`);
    assert.ok(scene.terms.length && scene.terms.every(term => term.term && term.meaning), scene.id);
    assert.ok(lessons.find(lesson => lesson.id === scene.videoLessonId)?.video?.brief, `${scene.id}: video reference`);
    if (scene.notebookId) {
      const note = notes.get(scene.notebookId);
      assert.ok(note?.sections.length && note.modelSections?.length, `${scene.id}: structured notebook reference`);
      usedNotes.add(scene.notebookId);
    }
  }
  assert.equal(usedNotes.size, 5, 'All five printed notebook pages should have a learning checkpoint');
  await fs.access(new URL('../public/workbooks/unit-1-1-notebook.pdf', import.meta.url));
  for (const entry of Object.values(unit.glossary)) {
    for (const reference of [entry.definedAt, ...entry.mentions]) {
      if (reference?.stageKey === 'concept') assert.equal(reference.title, journey.scenes[reference.step]?.title, 'Term help must link to the new concept scene');
    }
  }
});

test('12개 모형의 최초 렌더는 탐구 완료나 저장을 발생시키지 않는다', () => {
  for (const scene of journey.scenes) {
    const lab = labHarness(scene.kind);
    const html = lab.html();
    assert.ok(html.includes('<svg') || ['ratio', 'origins'].includes(scene.kind), `${scene.id}: missing visual`);
    assert.equal(lab.changes, 0, `${scene.id}: render changed progress`);
    assert.notEqual(lab.state.explored, true, `${scene.id}: untouched model is already complete`);
    assert.ok(!html.includes('FIGURE:') && !html.includes('<del>'), scene.id);
  }
});

test('빛 실험은 실제 조작과 서로 다른 자료 비교 이후 질문을 연다', () => {
  const prism = labHarness('prism');
  assert.ok(!prism.html().includes('파장에 따라 펼쳐진 빛'));
  prism.click('빛 펼치기');
  assert.equal(prism.state.explored, true);
  assert.ok(prism.html().includes('파장에 따라 펼쳐진 빛'));

  const wave = labHarness('wave');
  wave.click('파장 50 나노미터 늘리기', true);
  assert.equal(wave.state.wavelength, 550);
  assert.equal(wave.state.explored, true);
  assert.ok(wave.html().includes('파장 550 nm'));

  const sources = labHarness('sources');
  sources.click('뜨거운 기체');
  assert.equal(sources.state.explored, false);
  sources.click('뜨거운 기체');
  assert.equal(sources.state.explored, false, 'Repeated clicks must not count as a new source');
  sources.click('연속광 + 차가운 기체');
  assert.equal(sources.state.explored, true);
  assert.ok(sources.html().includes('흡수 스펙트럼'));

  const axes = labHarness('axes');
  assert.ok(axes.html().includes('파장 범위 500에서 600'));
  axes.click('두 축을 400–700 nm로 맞추기');
  assert.equal(axes.state.explored, true);
  assert.ok(!axes.html().includes('파장 범위 500에서 600'));

  const match = labHarness('match');
  match.click('원소 A');
  assert.equal(match.state.explored, false);
  match.click('원소 A');
  assert.equal(match.state.explored, false, 'The same candidate is not a second comparison');
  match.click('원소 B');
  assert.equal(match.state.explored, false, 'The instruction requests all three candidates');
  match.click('원소 C');
  assert.equal(match.state.explored, true);

  const inference = labHarness('inference');
  assert.ok(!inference.html().includes('관측 ② · 조건 나'));
  inference.click('다른 관측 조건의 자료 열기');
  assert.equal(inference.state.explored, true);
  assert.ok(inference.html().includes('관측 ② · 조건 나'));

  const transfer = labHarness('transfer');
  transfer.click('원소 D');
  assert.equal(transfer.state.explored, false);
  transfer.click('원소 E');
  assert.equal(transfer.state.explored, true);
});

test('모형의 실제 수치와 질문의 정답이 같은 자료를 설명한다', () => {
  const axes = labHarness('axes', { axesAligned: true }).html();
  assert.ok(axes.includes('선의 위치 475 나노미터') && axes.includes('선의 위치 525 나노미터'));
  const axisAnswer = sceneOf('axes').question.options.find(option => option.id === sceneOf('axes').question.answer).text;
  assert.match(axisAnswer, /475 nm.*525 nm/);
  for (const [kind, answer, numbers, other] of [['match', 'A', [430, 610], [430, 550]], ['transfer', 'D', [440, 590], [440, 620]]]) {
    const matching = labHarness(kind, { candidate: answer }).html();
    assert.equal((matching.match(new RegExp(`선의 위치 ${numbers.join(', ')} 나노미터`, 'g')) ?? []).length, 2, `${kind}: reference and observation must agree`);
    const different = labHarness(kind, { candidate: kind === 'match' ? 'B' : 'E' }).html();
    assert.ok(different.includes(`선의 위치 ${other.join(', ')} 나노미터`));
    const question = sceneOf(kind).question;
    assert.ok(question.answer.startsWith(answer), `${kind}: content answer disagrees with displayed pattern`);
  }
  const ratio = labHarness('ratio');
  assert.ok(ratio.html().includes('12 : 1'));
  ratio.click('질량으로 보기');
  assert.ok(ratio.html().includes('12 : 4 = 3 : 1'));
  assert.match(sceneOf('ratio').question.options.find(option => option.id === sceneOf('ratio').question.answer).text, /질량비 3:1, 개수비 12:1/);
  const origins = labHarness('origins').html();
  assert.equal((origins.match(/class="jc-tile jc-tile-H /g) ?? []).length, 74);
  assert.equal((origins.match(/class="jc-tile jc-tile-He /g) ?? []).length, 24);
  assert.equal((origins.match(/class="jc-tile jc-tile-other /g) ?? []).length, 2);
  assert.ok(origins.includes('100칸 = 질량 100%'), 'Composition tiles must not imply atom counts');
});

test('헬륨은 전자 2개에서만 처음 완료되며 고온·저온 실험은 모두 시도해야 한다', () => {
  const atom = labHarness('atom');
  atom.click('+ 전자 넣기');
  assert.equal(atom.state.electrons, 1);
  assert.equal(atom.state.explored, false);
  atom.click('+ 전자 넣기');
  assert.equal(atom.state.electrons, 2);
  assert.equal(atom.state.explored, true);
  assert.equal(atom.button('+ 전자 넣기').props.disabled, true, 'Do not imply a stable three-electron helium atom');
  const neutral = atom.html();
  assert.equal((neutral.match(/>p⁺<\/text>/g) ?? []).length, 2);
  assert.equal((neutral.match(/>n⁰<\/text>/g) ?? []).length, 2);
  assert.equal((neutral.match(/>e⁻<\/text>/g) ?? []).length, 2);
  assert.ok(neutral.includes('전체 전하 0'));

  const cooling = labHarness('cooling');
  cooling.click('충분히 식었을 때');
  assert.notEqual(cooling.state.explored, true, 'Temperature selection alone is not a trial');
  cooling.click('아주 뜨거울 때');
  cooling.click('결합해 보기');
  assert.equal(cooling.state.explored, false);
  assert.ok(cooling.html().includes('서로 끌어당기는 힘은 있어요'));
  cooling.click('한 번 더 결합해 보기');
  assert.equal(cooling.state.explored, false, 'Repeated hot trials must not substitute for the cold trial');
  cooling.click('충분히 식었을 때');
  cooling.click('결합해 보기');
  assert.equal(cooling.state.explored, true);
  assert.ok(cooling.html().includes('중성 원자로 유지돼요'));
  assert.deepEqual(new Set(cooling.state.tried), new Set(['hot', 'cool']));
});

test('연대표는 오답 순서로 완료되지 않으며 수정한 순서를 확인해야 한다', () => {
  const timeline = labHarness('timeline');
  const atomCard = timeline.button('중성 원자 형성');
  const atomImage = renderToStaticMarkup(atomCard);
  assert.equal((atomImage.match(/>p⁺<\/text>/g) ?? []).length, 1, '380,000-year icon should represent neutral hydrogen');
  assert.equal((atomImage.match(/>e⁻<\/text>/g) ?? []).length, 1);
  assert.equal(timeline.button('순서 확인하기').props.disabled, true);
  timeline.click('중성 원자 형성');
  timeline.click('양성자·중성자 등 형성');
  timeline.click('헬륨 원자핵 등 형성');
  timeline.click('순서 확인하기');
  assert.equal(timeline.state.explored, false);
  assert.ok(timeline.html().includes('순서를 다시 바꿔 보세요'));
  timeline.click('중성 원자 형성 뒤로 옮기기', true);
  timeline.click('중성 원자 형성 뒤로 옮기기', true);
  assert.deepEqual(timeline.state.order, ['particles', 'nuclei', 'atoms']);
  assert.equal(timeline.state.explored, false, 'The corrected order still needs explicit checking');
  timeline.click('순서 확인하기');
  assert.equal(timeline.state.explored, true);
  assert.ok(timeline.html().includes('우주 탄생 후 수 분 무렵') && timeline.html().includes('약 38만 년 무렵'));
  assert.ok(timeline.html().includes('시간 간격을 같은 비율로 그린 그림이 아닙니다'));
});

test('질량 전환과 두 생성 장소를 관찰해야 완료되며 저장 상태를 복원할 수 있다', () => {
  const ratio = labHarness('ratio');
  ratio.click('개수로 보기');
  assert.equal(ratio.state.explored, false);
  ratio.click('질량으로 보기');
  assert.equal(ratio.state.explored, true);
  const restored = labHarness('ratio', JSON.parse(JSON.stringify(ratio.state)));
  assert.equal(restored.state.explored, true);
  assert.ok(restored.html().includes('12 : 4 = 3 : 1'));
  assert.equal(restored.changes, 0);

  const origins = labHarness('origins');
  origins.click('수소');
  assert.notEqual(origins.state.explored, true);
  origins.click('초기 우주');
  assert.equal(origins.state.explored, false);
  origins.click('초기 우주');
  assert.equal(origins.state.explored, false);
  origins.click('별의 내부');
  assert.equal(origins.state.explored, true);
  assert.ok(origins.html().includes('대부분 별에서 만들어졌다'));
});

test('플레이어는 12장면 모두 관찰→판단→해설 순서를 지키고 필기 정답을 먼저 노출하지 않는다', async () => {
  const server = await createServer({ server: { middlewareMode: true, watch: null }, cacheDir: 'node_modules/.vite-concept-journey-check', logLevel: 'error' });
  try {
    const { ConceptJourneyPlayer } = await server.ssrLoadModule('/src/features/learn/journey/ConceptJourneyPlayer.tsx');
    const { progress } = await server.ssrLoadModule('/src/services/progress/store.ts');
    let stored = null;
    Object.defineProperty(progress, 'current', { configurable: true, get: () => stored });
    const render = (query) => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [`/learn/unit-1-1/concept?${query}`] }, React.createElement(ConceptJourneyPlayer, { unit, journey })));
    const setDraft = (scene, draft, record) => {
      stored = { version: 1, uid: 'isolated-ssr-test', units: { [unit.id]: { stages: {}, answers: {}, activityDrafts: { [scene.id]: draft }, activities: record ? { [scene.id]: record } : {} } }, exams: {} };
    };
    for (const scene of journey.scenes) {
      const query = `scene=${scene.id}`;
      setDraft(scene, { lab: {} });
      const fresh = render(query);
      assert.ok(fresh.includes('cj-observe-first'), scene.id);
      assert.ok(!fresh.includes('role="radiogroup"'), `${scene.id}: judgment opened before observation`);
      assert.ok(!fresh.includes('class="cj-understanding"') && !fresh.includes('cj-feedback good'), scene.id);
      assert.ok(!fresh.includes(escapeHtml(scene.question.explanation)), `${scene.id}: explanation exposed initially`);

      setDraft(scene, { lab: { explored: true } });
      const observed = render(query);
      assert.ok(observed.includes('role="radiogroup"'), scene.id);
      assert.ok(!observed.includes('class="cj-feedback'), `${scene.id}: feedback before answer submission`);

      const incorrect = scene.question.options.find(option => option.id !== scene.question.answer);
      setDraft(scene, { lab: { explored: true }, choice: incorrect.id, submitted: true }, { done: true, correct: false, firstCorrect: false, points: 5 });
      const wrong = render(query);
      assert.ok(wrong.includes(escapeHtml(incorrect.feedback)), `${scene.id}: missing targeted correction`);
      assert.ok(!wrong.includes('class="cj-understanding"'), `${scene.id}: full explanation exposed after wrong answer`);
      assert.match(wrong, /class="cj-primary" disabled=""/, `${scene.id}: wrong answer can advance`);

      setDraft(scene, { lab: { explored: true }, choice: scene.question.answer, submitted: true }, { done: true, correct: true, firstCorrect: false, points: 10 });
      const corrected = render(query);
      assert.ok(corrected.includes('고친 이유를 찾았어요!'), `${scene.id}: correction incorrectly labeled first success`);
      assert.ok(corrected.includes(escapeHtml(scene.question.explanation)), `${scene.id}: missing explanation after correct submission`);
      assert.ok(!corrected.includes('pilot-note-model'), `${scene.id}: model notebook exposed before writing`);
      assert.equal(corrected.includes('cj-notebook-stop'), !!scene.notebookId, `${scene.id}: notebook checkpoint`);
      assert.ok(!corrected.includes('FIGURE:') && !corrected.includes('<del>'), scene.id);
    }
    stored = null;
    for (const query of ['s=0.5', 's=not-a-number', 's=-9', 's=999', 's=Infinity', 'scene=unknown']) {
      assert.doesNotThrow(() => render(query), `Invalid preview index should not crash: ${query}`);
    }
  } finally {
    await server.close();
  }
});

test('과학의 물결표 범위는 취소선으로 바뀌지 않고 명시적인 이중 물결표만 취소선이 된다', async () => {
  const server = await createServer({ server: { middlewareMode: true, watch: null }, cacheDir: 'node_modules/.vite-concept-journey-check', logLevel: 'error' });
  try {
    const { Markdown } = await server.ssrLoadModule('/src/features/learn/Markdown.tsx');
    for (const plain of [false, true]) {
      const range = renderToStaticMarkup(React.createElement(Markdown, { md: '400~700 nm, 500~600 nm', plain }));
      assert.ok(range.includes('400~700 nm, 500~600 nm'));
      assert.ok(!range.includes('<del>'), `Scientific ranges became strikethrough (plain=${plain})`);
      const intentional = renderToStaticMarkup(React.createElement(Markdown, { md: '~~삭제~~', plain }));
      assert.ok(intentional.includes('<del>삭제</del>'), `Intentional strikethrough stopped working (plain=${plain})`);
    }
  } finally {
    await server.close();
  }
});
