// 교재 마크다운(content/source/교재)을 학생용 JSON(public/content)으로 변환한다.
// - 본문·문항은 units/<unitId>.json, 정답·해설은 answers/<unitId>.json 으로 분리한다.
// - 평가원 공식 예시 37문항은 exams/kice.json(원문) + exams/kice-solutions.json(해설)으로 분리한다.
// - 교재_구성과문항색인.json 과 대조하여 문항 ID 누락·중복이 있으면 실패한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content', 'source', '교재');
const IDX = path.join(ROOT, 'content', 'source', 'index');
const OUT = path.join(ROOT, 'public', 'content');

const STAGES = [
  { key: 'prerequisite', label: '선개념', heading: '1. 선개념', kind: 'check' },
  { key: 'concept', label: '개념', heading: '2. 개념', kind: 'read' },
  { key: 'concept_check', label: '개념평가', heading: '3. 개념평가', kind: 'check' },
  { key: 'advanced', label: '심화개념', heading: '4. 심화개념', kind: 'read' },
  { key: 'advanced_check', label: '심화평가', heading: '5. 심화평가', kind: 'check' },
  { key: 'strategy', label: '수능대비 전략', heading: '6. 수능대비 전략', kind: 'read' },
  { key: 'exam_check', label: '수능대비평가', heading: '7. 수능대비평가', kind: 'check' },
];

const CHAPTER_FILES = [
  { file: '01_과학의기초.md', chapter: 'ch1', semester: 1 },
  { file: '02_물질과규칙성.md', chapter: 'ch2', semester: 1 },
  { file: '03_시스템과상호작용.md', chapter: 'ch3', semester: 1 },
  { file: '04_변화와다양성.md', chapter: 'ch4', semester: 2 },
  { file: '05_환경과에너지.md', chapter: 'ch5', semester: 2 },
  { file: '06_과학과미래사회.md', chapter: 'ch6', semester: 2 },
  { file: '07_도판으로익히는풀이전략.md', chapter: 'ch7', semester: 1, extra: true },
];

const QID_RE = /^\*\*((?:T[12]-\d\d-\d\d-[PCAS]\d+)|(?:D-[PCAS]\d+))(?:(?:\s*·\s*|\.\s+)([^*.]{1,30}?))?\.\*\*\s*/;
const CIRCLED = ['①', '②', '③', '④', '⑤'];

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const blocks = (md) => md.split(/\n[ \t]*\n/).map((b) => b.trim()).filter(Boolean);

function splitSections(md, level) {
  // returns { preamble, sections: [{ heading, body }] } for headings of the given level (## or ###)
  const marker = '#'.repeat(level) + ' ';
  const lines = md.split('\n');
  const sections = [];
  let preamble = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith(marker)) {
      cur = { heading: line.slice(marker.length).trim(), lines: [] };
      sections.push(cur);
    } else if (line.startsWith('#') && /^#{1,6} /.test(line) && line.indexOf(' ') < level) {
      // higher-level heading: stop collecting into current section
      cur = null;
      preamble.push(line);
    } else if (cur) cur.lines.push(line);
    else preamble.push(line);
  }
  return {
    preamble: preamble.join('\n').trim(),
    sections: sections.map((s) => ({ heading: s.heading, body: s.lines.join('\n').trim() })),
  };
}

function rewriteImages(md) {
  return md.replace(/\]\((images\/[^)]+)\)/g, (_, p) => `](/content/${p})`);
}

function parseChoices(block) {
  if (!block.startsWith('①') || !block.includes('②')) return null;
  const parts = [];
  let rest = block;
  for (let i = 0; i < CIRCLED.length; i++) {
    const idx = rest.indexOf(CIRCLED[i]);
    if (idx < 0) break;
    const next = i + 1 < CIRCLED.length ? rest.indexOf(CIRCLED[i + 1]) : -1;
    const seg = next >= 0 ? rest.slice(idx + 1, next) : rest.slice(idx + 1);
    parts.push(seg.trim());
    if (next < 0) break;
  }
  return parts.length >= 2 ? parts : null;
}

function parseStage(body) {
  // returns { items: [{type:'md',md}|{type:'question',id}], questions: {id: {...}} }
  const bs = blocks(body);
  const items = [];
  const questions = {};
  let cur = null;
  let mdBuf = [];
  const flushMd = () => {
    if (mdBuf.length) {
      items.push({ type: 'md', md: rewriteImages(mdBuf.join('\n\n')) });
      mdBuf = [];
    }
  };
  for (const b of bs) {
    const m = b.match(QID_RE);
    if (m) {
      flushMd();
      cur = { id: m[1], label: m[2] ? m[2].trim() : undefined, prompt: [b.slice(m[0].length)], choices: null };
      questions[cur.id] = cur;
      items.push({ type: 'question', id: cur.id });
      continue;
    }
    if (cur && (b.startsWith('**막혔다면') || b.startsWith('#'))) {
      cur = null;
    }
    if (cur) {
      const ch = parseChoices(b);
      if (ch) cur.choices = ch;
      else if (/^[①②③④⑤]/.test(b)) (cur.choices ||= []).push(b.slice(1).trim()); // 선지가 문단마다 하나씩
      else cur.prompt.push(b);
    } else {
      mdBuf.push(b);
    }
  }
  flushMd();
  for (const q of Object.values(questions)) {
    q.prompt = rewriteImages(q.prompt.join('\n\n'));
    q.kind = q.choices ? 'choice' : 'short';
    if (!q.choices) delete q.choices;
  }
  return { items, questions };
}

function parseAnswers(body, fullIds) {
  // 형식: "**P1 — 답.** 해설" | "**D-P1. 답.** 해설" | "- **P1:** 답. 해설" | "- **S1 정답 ②.** 해설"
  const out = {};
  const notes = [];
  const lines = [];
  for (const b of blocks(body)) {
    if (/^[-*] /.test(b)) lines.push(...b.split('\n').map((l) => l.replace(/^[-*] /, '').trim()).filter(Boolean));
    else lines.push(b);
  }
  const add = (short, key, explanation) => {
    const full = fullIds.find((id) => id.endsWith('-' + short));
    if (!full) throw new Error(`정답 ${short} 에 해당하는 문항 ID 없음 (${fullIds[0]} …)`);
    key = key.trim().replace(/\.$/, '').trim();
    const circ = CIRCLED.findIndex((c) => key.startsWith(c));
    out[full] = { key, explanation: rewriteImages(explanation.trim()), ...(circ >= 0 ? { choiceIndex: circ } : {}) };
  };
  for (const l of lines) {
    let m = l.match(/^\*\*(?:D-)?([PCAS]\d+)\s*정답\s*([^*]*?)\s*\*\*\s*([\s\S]*)$/);
    if (m) { add(m[1], m[2], m[3]); continue; }
    m = l.match(/^\*\*(?:D-)?([PCAS]\d+):\*\*\s*([\s\S]*)$/);
    if (m) {
      const rest = m[2];
      const i = rest.search(/\.\s/);
      add(m[1], i >= 0 ? rest.slice(0, i) : rest, i >= 0 ? rest.slice(i + 1) : '');
      continue;
    }
    m = l.match(/^\*\*(?:D-)?([PCAS]\d+)(?:\s*[—–-]\s*|\.\s*|:\s*)([\s\S]*?)\*\*\s*([\s\S]*)$/);
    if (m) { add(m[1], m[2], m[3]); continue; }
    if (/^\*\*(?:D-)?[PCAS]\d+/.test(l)) throw new Error(`해석 못 한 정답 줄: ${l.slice(0, 60)}`);
    notes.push(l);
  }
  return { answers: out, notes: rewriteImages(notes.join('\n\n')) };
}

function parseChapter(cfg, index, prereqIndex) {
  const md = read(path.join(SRC, cfg.file));
  const titleLine = md.split('\n').find((l) => l.startsWith('# '));
  const chapterTitle = titleLine.slice(2).trim();
  const { preamble, sections } = splitSections(md, 2);
  const units = [];
  let outro = null;
  for (const sec of sections) {
    if (sec.heading.startsWith('편집자')) continue; // 제작 메타데이터: 학생 화면 제외
    if (sec.heading.startsWith('이 영역을 마친 뒤')) {
      outro = rewriteImages(sec.body);
      continue;
    }
    const codeM = sec.heading.match(/\[(10통과\d-\d\d-\d\d)\]\s*$/);
    if (!codeM) throw new Error(`${cfg.file}: 성취기준 코드 없는 ## 제목: ${sec.heading}`);
    const code = codeM[1];
    const title = sec.heading.replace(/\s*\[10통과[^\]]+\]\s*$/, '').trim();
    const idxUnit = index.units.find((u) => u.standard === code && u.source_file === cfg.file);
    if (!idxUnit) throw new Error(`${cfg.file}: 색인에 없는 단원 ${code}`);
    const sub = splitSections(sec.body, 3);
    const goalM = sub.preamble.match(/\*\*도달 목표:\*\*\s*([\s\S]*)/);
    const goal = goalM ? goalM[1].trim() : '';
    const stages = [];
    const questions = {};
    for (const st of STAGES) {
      const s = sub.sections.find((x) => x.heading === st.heading);
      if (!s) throw new Error(`${cfg.file} ${code}: 단계 누락 ${st.heading}`);
      const parsed = parseStage(s.body);
      Object.assign(questions, parsed.questions);
      stages.push({ key: st.key, label: st.label, kind: st.kind, items: parsed.items, questionIds: Object.keys(parsed.questions) });
    }
    const ansSec = sub.sections.find((x) => x.heading === '정답과 해설');
    if (!ansSec) throw new Error(`${cfg.file} ${code}: 정답과 해설 누락`);
    const { answers, notes: answerNotes } = parseAnswers(ansSec.body, idxUnit.question_ids);
    // 대조
    const parsedIds = Object.keys(questions).sort();
    const idxIds = [...idxUnit.question_ids].sort();
    if (JSON.stringify(parsedIds) !== JSON.stringify(idxIds)) {
      throw new Error(`${code}: 문항 ID 불일치\n 파싱=${parsedIds}\n 색인=${idxIds}`);
    }
    for (const id of idxIds) if (!answers[id]) throw new Error(`${code}: 정답 없음 ${id}`);
    for (const id of idxIds) {
      const q = questions[id];
      const a = answers[id];
      if (q.kind === 'choice' && a.choiceIndex === undefined) throw new Error(`${id}: 선택형인데 정답 번호 없음 (${a.key})`);
      if (q.kind === 'choice' && a.choiceIndex >= q.choices.length) throw new Error(`${id}: 정답 번호가 선지 범위를 벗어남`);
    }
    const pre = prereqIndex.integrated_science.find((p) => p.code === code) || null;
    units.push({
      id: idxUnit.id,
      code,
      title,
      goal,
      chapter: { id: cfg.chapter, title: chapterTitle },
      semester: cfg.semester,
      extra: !!cfg.extra,
      sourceFile: cfg.file,
      stages,
      questions,
      prerequisite: pre && { topic: pre.topic, middleUnits: pre.middle_units, summary: pre.prerequisites, boundary: pre.boundary_or_gap },
      answerNotes,
      _answers: answers,
    });
  }
  return { id: cfg.chapter, title: chapterTitle, semester: cfg.semester, extra: !!cfg.extra, intro: rewriteImages(preamble), outro, units };
}

function parseAnswerKey(text) {
  // "3번" | "③ — …" | "③ | 원문: …" → choiceIndex
  const circ = CIRCLED.findIndex((c) => text.includes(c));
  if (circ >= 0) return circ;
  const m = text.match(/([1-5])번/);
  return m ? Number(m[1]) - 1 : -1;
}

function parseKice() {
  const orig = read(path.join(SRC, '08_평가원공식예시원문.md'));
  const top = splitSections(orig, 2);
  const items = [];
  const byId = {};
  // 1) 문제 원문: 페이지 이미지 (2025는 한 페이지에 여러 문항)
  const origSec = top.sections.find((s) => s.heading === '문제 원문');
  for (const s of splitSections(origSec.body, 3).sections) {
    const ids = s.heading.split(',').map((x) => x.trim()).filter((x) => /^KICE-\d{4}-Q\d\d$/.test(x));
    if (!ids.length) continue;
    const img = s.body.match(/\]\((images\/[^)]+)\)/);
    const page = s.body.match(/원본 PDF (\d+)쪽/);
    for (const id of ids) {
      const m = id.match(/^KICE-(\d{4})-Q(\d\d)$/);
      const it = { id, year: Number(m[1]), number: Number(m[2]), image: img ? `/content/${img[1]}` : null, pdfPage: page ? Number(page[1]) : null, sharedPage: ids.length > 1 };
      items.push(it);
      byId[id] = it;
    }
  }
  // 2) 공식 정답과 풀이 출발점
  const solutions = {};
  const startSec = top.sections.find((s) => s.heading.startsWith('공식 정답'));
  for (const s of splitSections(startSec.body, 3).sections) {
    const id = s.heading.trim();
    if (!byId[id]) continue;
    const ans = s.body.match(/\*\*공식 정답:\s*([^*]*)\*\*\s*([^\n]*)/);
    if (!ans) throw new Error(`KICE ${id}: 공식 정답 줄 없음`);
    const choiceIndex = parseAnswerKey(ans[1]);
    if (choiceIndex < 0) throw new Error(`KICE ${id}: 정답 번호 해석 실패 (${ans[1]})`);
    byId[id].topic = ans[2].trim();
    solutions[id] = { key: CIRCLED[choiceIndex], choiceIndex, startMd: rewriteImages(s.body.replace(/\*\*공식 정답:[^\n]*\n?/, '').trim()), md: '' };
  }
  // 3) 09·10 문항별 심층 풀이
  for (const f of ['09_평가원2024_문항별풀이.md', '10_평가원2025_문항별풀이.md']) {
    const md = read(path.join(SRC, f));
    const { sections } = splitSections(md, 2);
    for (const s of sections) {
      const m = s.heading.match(/^(.*)\[(KICE-\d{4}-Q\d\d)\]\s*$/);
      if (!m) continue;
      const id = m[2];
      if (!byId[id]) throw new Error(`해설 ${id}: 08 원문에 없음`);
      byId[id].title = m[1].replace(/^\d\d\s*/, '').trim();
      const ans = s.body.match(/\*\*공식 정답:\s*([^*]*)\*\*/);
      if (ans) {
        const ci = parseAnswerKey(ans[1]);
        if (ci >= 0 && solutions[id] && ci !== solutions[id].choiceIndex) throw new Error(`KICE ${id}: 08과 ${f}의 공식 정답 불일치`);
      }
      solutions[id].md = rewriteImages(s.body);
    }
  }
  for (const it of items) {
    if (!solutions[it.id]) throw new Error(`KICE ${it.id}: 공식 정답 없음`);
    if (!solutions[it.id].md) throw new Error(`KICE ${it.id}: 심층 풀이 없음`);
    if (!it.title) throw new Error(`KICE ${it.id}: 제목 없음`);
  }
  if (items.length !== 37) throw new Error(`평가원 문항 수 ${items.length} ≠ 37`);
  items.sort((a, b) => a.year - b.year || a.number - b.number);
  return { items, solutions, intro: rewriteImages(top.preamble) };
}

function copyImages() {
  const srcImg = path.join(SRC, 'images');
  const dst = path.join(OUT, 'images');
  fs.cpSync(srcImg, dst, { recursive: true });
}

function main() {
  const index = JSON.parse(read(path.join(IDX, '교재_구성과문항색인.json')));
  const prereqIndex = JSON.parse(read(path.join(IDX, '중학교과학_선수개념_연결색인.json')));
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'units'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'answers'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'exams'), { recursive: true });

  const chapters = CHAPTER_FILES.map((c) => parseChapter(c, index, prereqIndex));
  let totalQ = 0;
  const allIds = new Set();
  const manifestChapters = [];
  for (const ch of chapters) {
    const units = [];
    for (const u of ch.units) {
      const { _answers, ...pub } = u;
      if (ch.units[ch.units.length - 1] === u && ch.outro) pub.chapterOutro = ch.outro;
      fs.writeFileSync(path.join(OUT, 'units', `${u.id}.json`), JSON.stringify(pub));
      fs.writeFileSync(path.join(OUT, 'answers', `${u.id}.json`), JSON.stringify(_answers));
      const qc = Object.keys(u.questions).length;
      totalQ += qc;
      for (const id of Object.keys(u.questions)) {
        if (allIds.has(id)) throw new Error(`중복 문항 ID ${id}`);
        allIds.add(id);
      }
      units.push({ id: u.id, code: u.code, title: u.title, goal: u.goal, questionCount: qc, extra: u.extra, stageCount: u.stages.length });
    }
    manifestChapters.push({ id: ch.id, title: ch.title, semester: ch.semester, extra: ch.extra, intro: ch.intro, units });
  }
  if (totalQ !== index.question_count) throw new Error(`문항 수 ${totalQ} ≠ 색인 ${index.question_count}`);
  const idxSet = new Set(index.question_ids);
  for (const id of allIds) if (!idxSet.has(id)) throw new Error(`색인에 없는 문항 ${id}`);

  const kice = parseKice();
  fs.writeFileSync(path.join(OUT, 'exams', 'kice.json'), JSON.stringify({ intro: kice.intro, items: kice.items }));
  fs.writeFileSync(path.join(OUT, 'exams', 'kice-solutions.json'), JSON.stringify(kice.solutions));

  copyImages();
  // 이미지 경로 검사
  const allJson = fs.readdirSync(path.join(OUT, 'units')).map((f) => read(path.join(OUT, 'units', f))).join('') + read(path.join(OUT, 'exams', 'kice.json'));
  const imgRefs = [...allJson.matchAll(/\/content\/(images\/[^")]+)/g)].map((m) => m[1]);
  for (const r of new Set(imgRefs)) {
    if (!fs.existsSync(path.join(OUT, r))) throw new Error(`깨진 이미지 경로 ${r}`);
  }

  const manifest = {
    contentVersion: index.version,
    sourceDate: index.date,
    generatedAt: new Date().toISOString(),
    stageOrder: STAGES.map(({ key, label, kind }) => ({ key, label, kind })),
    semesters: [
      { id: 1, title: '1학기 · 통합과학1', chapters: manifestChapters.filter((c) => c.semester === 1) },
      { id: 2, title: '2학기 · 통합과학2', chapters: manifestChapters.filter((c) => c.semester === 2) },
    ],
    stats: { standards: index.standards.length, units: allIds.size && chapters.reduce((n, c) => n + c.units.length, 0), questions: totalQ, kiceQuestions: kice.items.length, images: new Set(imgRefs).size },
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`content OK: units=${manifest.stats.units} standards=${manifest.stats.standards} questions=${totalQ} kice=${kice.items.length} images=${manifest.stats.images}`);
}

main();
