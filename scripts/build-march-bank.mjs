import fs from 'node:fs';

// Editorial source: references and original teaching notes, never copied exam pages.
const root = 'content/march';
const source = JSON.parse(fs.readFileSync(`${root}/editorial.json`, 'utf8'));
const questions = [], answers = {}, audit = [];
for (const exam of source.exams) {
  const count = exam.code === '2503' ? 20 : 25;
  if (exam.keys.length !== count || exam.topics.length !== count) throw new Error(`Incomplete exam ${exam.code}`);
  for (let n = 1; n <= count; n++) {
    const selected = exam.selected.find(x => x.number === n);
    const id = `march-${exam.code}-${n}`;
    const reason = selected ? selected.reason : exam.exclusions[n];
    if (!reason) throw new Error(`Missing classification ${id}`);
    audit.push({ id, exam: exam.code, number: n, topic: exam.topics[n - 1], scope: selected ? 'middle' : 'high-or-mixed', reason });
    if (!selected) continue;
    const concept = source.concepts[selected.concept];
    if (!concept || !selected.page || !selected.hint) throw new Error(`Incomplete lesson ${id}`);
    questions.push({ id, exam: exam.code, number: n, page: selected.page, topic: exam.topics[n - 1], domain: concept.domain, concept: selected.concept });
    answers[id] = { answer: Number(exam.keys[n - 1]), hint: selected.hint, ...concept };
  }
}
if (audit.length !== 145 || questions.length !== 57) throw new Error('Unexpected coverage');
const bank = { version: 1, reviewedAt: '2026-11-10', policy: source.policy, exams: source.exams.map(e => ({ code: e.code, title: e.title, paper: e.paper, solution: e.solution, total: e.keys.length, selected: e.selected.length })), questions, audit };
fs.mkdirSync('public/march', { recursive: true });
fs.writeFileSync('public/march/bank.json', JSON.stringify(bank, null, 2));
fs.writeFileSync('public/march/answers.json', JSON.stringify(answers, null, 2));
const rows = [['id', '회차', '문항', '주제', '분류', '판정 근거'], ...audit.map(q => [q.id, q.exam, q.number, q.topic, q.scope, q.reason])];
fs.writeFileSync(`${root}/classification.csv`, '\uFEFF' + rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n'));
console.log(`March bank: ${questions.length} selected / ${audit.length} audited; ${Object.keys(source.concepts).length} review cards`);
