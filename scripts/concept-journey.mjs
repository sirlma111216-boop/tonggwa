import fs from 'node:fs';
import path from 'node:path';

export function attachConceptJourney(unit, directory) {
  const file = path.join(directory, `${unit.id}-concept.json`);
  if (!fs.existsSync(file)) return;
  const journey = JSON.parse(fs.readFileSync(file, 'utf8'));
  const kinds = ['prism', 'wave', 'sources', 'axes', 'match', 'inference', 'atom', 'cooling', 'timeline', 'ratio', 'origins', 'transfer'];
  const ids = new Set();
  const lessonIds = unit.stages.flatMap(s => s.steps.map(step => step.lesson?.id));
  if (!journey.revision || journey.scenes?.length !== kinds.length) throw new Error(`${file}: invalid journey revision/scenes`);
  journey.scenes.forEach((scene, index) => {
    if (ids.has(scene.id) || !scene.id || scene.kind !== kinds[index]) throw new Error(`${file}: invalid scene ${index}`);
    ids.add(scene.id);
    for (const key of ['title', 'chapter', 'intro', 'instruction', 'takeaway']) {
      if (typeof scene[key] !== 'string' || !scene[key].trim() || /<!--|FIGURE:/.test(scene[key])) throw new Error(`${file}: invalid ${scene.id}/${key}`);
    }
    const q = scene.question;
    if (!q?.prompt || !q.explanation || q.options.length < 2 || new Set(q.options.map(o => o.id)).size !== q.options.length || q.options.filter(o => o.id === q.answer).length !== 1 || q.options.some(o => !o.text || !o.feedback)) throw new Error(`${file}: invalid question ${scene.id}`);
    if (!scene.terms?.length || scene.terms.some(t => !t.term || !t.meaning)) throw new Error(`${file}: undefined terms ${scene.id}`);
    if (scene.notebookId && !unit.notebooks.some(n => n.id === scene.notebookId)) throw new Error(`${file}: missing notebook ${scene.notebookId}`);
    if (scene.videoLessonId && !lessonIds.includes(scene.videoLessonId)) throw new Error(`${file}: missing video ${scene.videoLessonId}`);
  });
  unit.conceptJourney = journey;
  // Help links in other stages must land on the new concept scene, not the old page index.
  const legacyTargets = [2, 3, 4, 8, 5, 7];
  for (const entry of Object.values(unit.glossary ?? {})) {
    for (const reference of [entry.definedAt, ...(entry.mentions ?? [])]) {
      if (reference?.stageKey !== 'concept') continue;
      const named = journey.scenes.findIndex(scene => scene.terms.some(term => term.term === entry.term));
      const target = named >= 0 ? named : (legacyTargets[reference.step] ?? 0);
      reference.step = target;
      reference.title = journey.scenes[target].title;
    }
  }
}
