// 단원 JSON 보강: 용어집(glossary)과 카드별 활동(activity)을 붙인다.
// - 용어집: 본문의 **용어:** 정의와 **굵은 용어**가 쓰인 문장을 모은다 (용어 패널의 재료).
// - 활동: content/interactives/<unitId>.json 에 집필된 위젯이 있으면 그것, 없으면 자동 생성
//   (① 이 카드의 정의 빈칸 → ② 수치 빈칸 → ③ 방금 읽은 문장 순서 맞추기).
import fs from 'node:fs';
import path from 'node:path';

const normTerm = (t) => t.replace(/[:：.。!?]+$/g, '').trim();
const stripMd = (s) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
const sentences = (text) => stripMd(text).split(/(?<=[.!?])\s+(?=[^\s])/).map((s) => s.trim()).filter((s) => s.length > 6);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STOP = new Set(['오답 원인', '복습', '정답', '공식 정답', '도달 목표', '막혔다면 여기부터 읽어요', '공식 평가 초점']);

export function buildGlossary(unit) {
  const g = {};
  for (const st of unit.stages) {
    st.steps.forEach((step, idx) => {
      if (step.type === 'question') return;
      const blocks = step.md.split(/\n\n+/);
      for (const b of blocks) {
        if (b.startsWith('|') || b.startsWith('#')) continue;
        // 정의: **용어:** 정의문
        const def = b.match(/^\*\*([^*\n]{1,30}?)[:：]\*\*\s*([\s\S]+)$/);
        if (def) {
          const term = normTerm(def[1]);
          if (STOP.has(term)) continue;
          g[term] ??= { term, mentions: [] };
          g[term].definition ??= stripMd(def[2].split(/\n/)[0]).trim();
          g[term].definedAt ??= { stageKey: st.key, step: idx, title: step.title };
          continue;
        }
        for (const m of b.matchAll(/\*\*([^*\n]{1,30}?)\*\*/g)) {
          const term = normTerm(m[1]);
          if (!term || STOP.has(term) || /^[①-⑩]/.test(term) || term.length > 16) continue;
          if (/[<>=→]/.test(term) || /[.!?]$/.test(m[1])) continue; // 비교식·문장 전체 강조는 용어가 아님
          if (/(는지|인지|하기|하라|된다|이다|한다|않다|이지|거나|라도|것|조건|경우|때)$/.test(term) && term.includes(' ')) continue; // 문장 조각
          if (term.split(/\s+/).length >= 4) continue;
          g[term] ??= { term, mentions: [] };
          const sent = sentences(b).find((s) => s.includes(term));
          if (sent && g[term].mentions.length < 4 && !g[term].mentions.some((x) => x.sentence === sent)) {
            g[term].mentions.push({ stageKey: st.key, step: idx, title: step.title, sentence: sent });
          }
        }
      }
    });
  }
  return g;
}

function clozeFromDefinition(step, glossary, allTerms, seed) {
  const defs = Object.values(glossary).filter((e) => e.definition && e.definedAt && e.definedAt.title === step.title && step.md.includes(`**${e.term}`));
  if (!defs.length) return null;
  const e = defs[seed % defs.length];
  const pool = allTerms.filter((t) => t !== e.term && Math.abs(t.length - e.term.length) <= 6);
  const distractors = shuffle(pool, seed).slice(0, 3);
  if (distractors.length < 2) return null;
  return {
    widget: 'cloze',
    title: '방금 읽은 정의, 빈칸을 채워 볼까요?',
    auto: true,
    props: { sentence: `____ : ${e.definition}`, answer: e.term, choices: shuffle([e.term, ...distractors], seed + 7) },
  };
}

function clozeFromNumber(step, seed) {
  const cands = [];
  for (const b of step.md.split(/\n\n+/)) {
    if (b.startsWith('|') || b.startsWith('#')) continue;
    for (const s of sentences(b)) {
      const m = [...s.matchAll(/(?<![\d.×⁻⁰-⁹])(\d+(?:\.\d+)?)(?=\s?(?:m|cm|mm|μm|nm|km|s|ms|μs|g|kg|N|J|배|m\/s|g\/cm³|kg\/m³|℃|K|%|개|단위)\b)/g)];
      if (m.length >= 1 && s.length < 140) cands.push({ s, m });
    }
  }
  if (!cands.length) return null;
  const c = cands[seed % cands.length];
  const pick = c.m[seed % c.m.length];
  const answer = pick[1];
  const n = Number(answer);
  const variants = new Set();
  for (const f of [10, 0.1, 2, 0.5, 100, 0.01, 3]) {
    const v = n * f;
    const txt = Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(3)));
    if (txt !== answer) variants.add(txt);
  }
  const choices = shuffle([answer, ...shuffle([...variants], seed).slice(0, 3)], seed + 3);
  const sentence = c.s.slice(0, pick.index) + '____' + c.s.slice(pick.index + answer.length);
  return { widget: 'cloze', title: '수치를 기억하나요?', auto: true, props: { sentence, answer, choices } };
}

function orderFromParagraph(step, seed) {
  let best = null;
  for (const b of step.md.split(/\n\n+/)) {
    if (b.startsWith('|') || b.startsWith('#') || b.startsWith('**') && /[:：]\*\*/.test(b)) continue;
    const ss = sentences(b).filter((s) => s.length <= 110);
    if (ss.length >= 3 && (!best || ss.length > best.length)) best = ss.slice(0, 4);
  }
  if (!best) return null;
  return {
    widget: 'order',
    title: '방금 읽은 설명을 순서대로 놓아 보세요',
    auto: true,
    props: { items: shuffle(best, seed), answer: best, hint: '글의 흐름(원인 → 결과, 일반 → 예시)을 떠올려 보세요.' },
  };
}

export function attachActivities(unit, interactivesDir) {
  const file = path.join(interactivesDir, `${unit.id}.json`);
  const authored = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { activities: [] };
  const glossary = unit.glossary;
  const allTerms = Object.keys(glossary);
  const used = new Set();
  let authoredCount = 0;
  let autoCount = 0;
  for (const st of unit.stages) {
    st.steps.forEach((step, idx) => {
      if (step.type === 'question') return;
      const seed = hash(`${unit.id}/${st.key}/${idx}`);
      const found = (authored.activities || []).filter((a) => a.match.stage === st.key && (a.match.title === step.title || a.match.step === idx) && (a.match.part === undefined || a.match.part === step.part));
      if (found.length) {
        step.activities = found.map((a) => ({ widget: a.widget, title: a.title, intro: a.intro, props: a.props }));
        found.forEach((a) => used.add(a));
        authoredCount += found.length;
        return;
      }
      if (step.type === 'remediation') return;
      const auto =
        clozeFromDefinition(step, glossary, allTerms, seed) ||
        clozeFromNumber(step, seed) ||
        orderFromParagraph(step, seed) || {
          widget: 'reflect',
          title: '내 말로 한 줄',
          auto: true,
          props: { prompt: `‘${step.title}’에서 기억할 한 가지를 내 말로 적어 보세요.`, placeholder: '예: 같은 부피를 섞어도 단위부피당 이온 수가 다르면 중성이 아니다.' },
        };
      step.activities = [auto];
      autoCount++;
    });
  }
  for (const a of authored.activities || []) {
    if (!used.has(a)) throw new Error(`${unit.id}: 집필 활동이 어느 카드에도 연결되지 않음 → ${JSON.stringify(a.match)}`);
  }
  unit.glossaryExtra = authored.glossaryExtra || {};
  unit.links = authored.links || {};
  return { authoredCount, autoCount };
}

export function enrichUnit(unit, interactivesDir) {
  unit.glossary = buildGlossary(unit);
  return attachActivities(unit, interactivesDir);
}
