// Authored content and interaction contracts: run after `npm run content`.
// Uses the actual components without a browser, and never changes content or progress.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const loadTypeScript = (relative) => {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', code)(require, module.exports, module);
  return module.exports;
};
const { SCIENCE_WIDGETS } = loadTypeScript('src/features/learn/ScienceWidgets.tsx');
const { nextActivityRecord, nextTransferAnswer } = loadTypeScript('src/services/progress/evidence.ts');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const unique = (values) => new Set(values).size === values.length;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ids = (items) => items.map((item) => item.id);

function questionContract(question, label) {
  check(text(question?.prompt), `${label}: missing prompt`);
  check(Array.isArray(question.options) && question.options.length >= 2, `${label}: at least two choices`);
  check(unique(ids(question.options)), `${label}: duplicate option IDs`);
  check(question.options.every((option) => text(option.id) && text(option.text) && text(option.feedback)), `${label}: each option needs text and specific feedback`);
  check(question.options.filter((option) => option.id === question.answer).length === 1, `${label}: answer must identify exactly one option`);
}

function activityContract(activity, label) {
  const p = activity.props;
  check(typeof SCIENCE_WIDGETS[activity.widget] === 'function', `${label}: unknown widget ${activity.widget}`);
  check(p && typeof p === 'object', `${label}: missing props`);
  if (activity.widget === 'reasoning') questionContract(p, label);
  if (['spectrumLab', 'starForge', 'compositionLab'].includes(activity.widget)) questionContract(p.question, label);
  if (activity.widget === 'spectrumLab') {
    const min = p.min ?? 380, max = p.max ?? 720;
    check(Number.isFinite(min) && Number.isFinite(max) && min < max, `${label}: invalid wavelength axis`);
    check(p.sources?.length > 0 && unique(ids(p.sources)), `${label}: reference sources need distinct IDs`);
    for (const source of p.sources) check(text(source.label) && source.lines?.length > 0 && source.lines.every((line) => Number.isFinite(line) && line > 0) && unique(source.lines), `${label}/${source.id}: invalid reference lines`);
    check(p.unknownLines?.length > 0 && p.unknownLines.every((line) => Number.isFinite(line) && line >= min && line <= max) && unique(p.unknownLines), `${label}: observed lines must be inside the observation range`);
    if (p.unknownLabel?.includes('흡수')) check(p.unknownKind === 'absorption', `${label}: absorption label must render dark absorption lines`);
    check(text(p.simplification), `${label}: spectrum assumptions required`);
  }
  if (activity.widget === 'cosmicTimeline') {
    check(p.events?.length >= 2 && unique(ids(p.events)), `${label}: distinct timeline events required`);
    check(p.events.every((event) => text(event.id) && text(event.label)), `${label}: named events required`);
    check(unique(p.answer) && same([...p.answer].sort(), ids(p.events).sort()), `${label}: answer must be a permutation of all events`);
    const given = p.initialOrder ?? ids(p.events).reverse();
    check(unique(given) && same([...given].sort(), ids(p.events).sort()), `${label}: invalid initial event order`);
    const effective = same(given, p.answer) ? [...given.slice(1), given[0]] : given;
    check(!same(effective, p.answer), `${label}: initial order must require reconstruction`);
    check(text(p.explanation), `${label}: timeline reasoning required`);
  }
  if (activity.widget === 'starForge') {
    check(p.stars?.length > 0 && unique(ids(p.stars)), `${label}: distinct star paths required`);
    for (const star of p.stars) {
      check(text(star.label) && star.stages?.length > 0 && unique(ids(star.stages)), `${label}/${star.id}: distinct named stages required`);
      for (const stage of star.stages) check(text(stage.label) && text(stage.detail) && stage.layers?.length > 0 && stage.layers.every((layer) => text(layer.label)), `${label}/${stage.id}: stages need explanations and named layers`);
    }
    check(text(p.simplification), `${label}: stellar model assumptions required`);
  }
  if (activity.widget === 'compositionLab') {
    check(p.samples?.length > 0 && unique(ids(p.samples)), `${label}: distinct composition samples required`);
    for (const sample of p.samples) {
      check(text(sample.label) && text(sample.basis) && text(sample.unit), `${label}/${sample.id}: label, denominator basis and unit required`);
      check(Number.isFinite(sample.total) && sample.total > 0, `${label}/${sample.id}: positive denominator required`);
      check(sample.parts?.length > 0 && sample.parts.every((part) => text(part.label) && Number.isFinite(part.value) && part.value >= 0), `${label}/${sample.id}: valid parts required`);
      check(sample.parts.reduce((sum, part) => sum + part.value, 0) <= sample.total + 1e-6, `${label}/${sample.id}: parts exceed the stated denominator`);
    }
  }
  if (activity.widget === 'evidenceSort') {
    check(text(p.prompt) && p.bins?.length >= 2 && unique(ids(p.bins)), `${label}: distinct sorting bins required`);
    check(p.items?.length > 0 && unique(ids(p.items)), `${label}: distinct evidence items required`);
    for (const item of p.items) check(text(item.text) && text(item.feedback) && p.bins.some((bin) => bin.id === item.bin), `${label}/${item.id}: item needs a valid bin and its own explanation`);
  }
}

let rendered = 0, activities = 0, cards = 0;
for (const unitId of ['unit-1-1', 'unit-1-2']) {
  const authored = JSON.parse(fs.readFileSync(path.join(root, `content/interactives/${unitId}.json`), 'utf8'));
  const unit = JSON.parse(fs.readFileSync(path.join(root, `public/content/units/${unitId}.json`), 'utf8'));
  check(authored.pilot && unit.pilot, `${unitId}: regenerate pilot content first`);
  const allIds = [...authored.activities, ...authored.lessons, ...authored.notebooks, ...authored.review].map((item) => item.id);
  check(allIds.every(text) && unique(allIds), `${unitId}: stable IDs must be present and unique`);
  for (const activity of authored.activities) {
    const label = `${unitId}/${activity.id}`;
    activityContract(activity, label);
    activities++;
    const question = activity.widget === 'reasoning' ? activity.props : activity.props.question;
    const correctDraft = question ? { choice: question.answer, checked: true, attempts: 2 }
      : activity.widget === 'cosmicTimeline' ? { order: activity.props.answer, checked: true, attempts: 2, moved: true }
      : { assignments: Object.fromEntries(activity.props.items.map((item) => [item.id, item.bin])), checked: true, attempts: 2 };
    for (const savedState of [undefined, correctDraft, { choice: [], order: null, assignments: [], stage: 'invalid', attempts: -2 }]) {
      let results = 0, mutations = 0;
      const html = renderToStaticMarkup(React.createElement(SCIENCE_WIDGETS[activity.widget], {
        props: activity.props, savedState, onResult: () => results++, onState: () => mutations++,
      }));
      check(html.includes('science-lab') && !html.includes('NaN'), `${label}: valid component markup required`);
      check(results === 0 && mutations === 0, `${label}: mounting/restoring must not grade or save a response`);
      if (savedState === correctDraft) check(html.includes('고쳐 풀기'), `${label}: restored correction must remain labelled practice`);
      if (activity.widget === 'spectrumLab' && activity.props.unknownKind === 'absorption') check(html.includes('어두운 흡수선'), `${label}: absorption representation missing`);
      rendered++;
    }
  }
  for (const stage of unit.stages) for (const [index, step] of stage.steps.entries()) {
    if (step.type === 'question') continue;
    cards++;
    const label = `${unitId}/${stage.key}/${index}`;
    check(step.activities?.length > 0 && step.activities.every((activity) => !activity.auto && authored.activities.some((source) => source.id === activity.id && same(source.props, activity.props))), `${label}: generated activity must match authored source`);
    check(step.lesson && authored.lessons.some((lesson) => lesson.id === step.lesson.id), `${label}: missing lesson plan`);
    check(step.lesson.terms.every((term) => text(unit.glossary[term]?.definition)), `${label}: every lesson term needs a definition`);
    check(step.lesson.video?.scenes?.length > 0 && step.lesson.video.sources?.length > 0, `${label}: video production brief and references required`);
    if (step.lesson.notebookId) check(unit.notebooks.some((sheet) => sheet.id === step.lesson.notebookId), `${label}: notebook sheet missing`);
  }
  for (const question of authored.review) {
    check(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < question.options.length, `${unitId}/${question.id}: invalid transfer answer`);
    check(question.options.every((option) => text(option.text) && text(option.feedback)), `${unitId}/${question.id}: missing transfer feedback`);
  }
}

// A correction is learning evidence, but must never overwrite the independent first response.
const firstWrong = nextActivityRecord(undefined, { done: true, correct: false }, '2026-10-19T00:00:00Z');
const corrected = nextActivityRecord(firstWrong, { done: true, correct: true }, '2026-10-19T00:01:00Z');
const repeated = nextActivityRecord(corrected, { done: true, correct: true }, '2026-10-19T00:02:00Z');
check(firstWrong.firstCorrect === false && firstWrong.points === 5, 'wrong first attempt must remain honest learning evidence');
check(corrected.correct === true && corrected.firstCorrect === false && corrected.attempts === 2 && corrected.points === 10, 'correction must retain first attempt and bounded points');
check(repeated.points === corrected.points, 'repeated submissions must not farm points');
const firstTransfer = nextTransferAnswer(undefined, 0, false, '2026-10-19T00:00:00Z');
check(nextTransferAnswer(firstTransfer, 1, true, '2026-10-19T00:01:00Z').firstCorrect === false, 'transfer retries must preserve first independent result');

console.log(`Pilot checks passed: ${checks} assertions, ${activities} authored activities, ${cards} learning cards, ${rendered} component renders. First-answer evidence and capped rewards verified.`);
