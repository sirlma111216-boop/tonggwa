import fs from 'node:fs';
import path from 'node:path';

/** Attach authored assessment illustrations without mixing answer data into questions. */
export function attachQuestionMedia(unit, directory, publicDirectory) {
  const file = path.join(directory, `${unit.id}-question-media.json`);
  if (!fs.existsSync(file)) return;
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const publicRoot = path.resolve(publicDirectory);
  if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') throw new Error(`${file}: question media must be keyed by question id`);
  for (const [questionId, media] of Object.entries(catalog)) {
    const question = unit.questions[questionId];
    if (!question) throw new Error(`${file}: unknown question ${questionId}`);
    if (!Array.isArray(media) || media.length === 0) throw new Error(`${file}: missing media for ${questionId}`);
    const sources = new Set();
    question.media = media.map(item => {
      if (!item || ['src', 'alt', 'caption'].some(key => typeof item[key] !== 'string' || !item[key].trim()) || Object.keys(item).some(key => !['src', 'alt', 'caption', 'panels'].includes(key))) throw new Error(`${file}: invalid media fields for ${questionId}`);
      if (!item.src.startsWith('/images/') || !/\.(png|jpe?g|webp|avif)$/i.test(item.src)) throw new Error(`${file}: expected a local raster image for ${questionId}`);
      const asset = path.resolve(publicRoot, `.${item.src}`);
      const relative = path.relative(publicRoot, asset);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(asset) || !fs.statSync(asset).isFile()) throw new Error(`${file}: missing or invalid image ${item.src}`);
      if (sources.has(item.src)) throw new Error(`${file}: duplicate image ${item.src} for ${questionId}`);
      sources.add(item.src);
      if (item.panels && (!Array.isArray(item.panels) || item.panels.length !== 3 || item.panels.some(p => !p.label?.trim() || !p.description?.trim()))) throw new Error('Invalid panel captions');
      return { src: item.src, alt: item.alt, caption: item.caption, ...(item.panels ? {panels: item.panels} : {}) };
    });
  }
}
