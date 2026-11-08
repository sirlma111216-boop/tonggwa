import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

test('교사용 답안은 학생용과 같은 5쪽·15칸을 채우고 학생 양식과 학습 본문에는 노출되지 않는다', async () => {
  const payload = JSON.parse(await fs.readFile('content/interactives/unit-1-1.json', 'utf8'));
  const guide = JSON.parse(await fs.readFile('content/lessons/unit-1-1-notebook-teacher.json', 'utf8'));
  const unit = { id: 'unit-1-1', title: '빛으로 읽는 원소와 초기 우주', notebooks: payload.notebooks };
  const server = await createServer({ server: { middlewareMode: true, watch: null }, cacheDir: 'node_modules/.vite-teacher-check', logLevel: 'error' });
  try {
    const { WorkbookSheets } = await server.ssrLoadModule('/src/features/learn/WorkbookPage.tsx');
    const { StructuredNotebook } = await server.ssrLoadModule('/src/features/learn/PilotLesson.tsx');
    const student = renderToStaticMarkup(React.createElement(WorkbookSheets, { unit }));
    const teacher = renderToStaticMarkup(React.createElement(WorkbookSheets, { unit, teacher: true }));
    assert.equal((student.match(/<article /g) ?? []).length, 5);
    assert.equal((teacher.match(/<article /g) ?? []).length, 5);
    assert.equal((teacher.match(/class="workbook-model"/g) ?? []).length, 15);
    assert.equal((teacher.match(/role="img"/g) ?? []).length, 3);
    assert.ok(!student.includes('workbook-model'));
    assert.ok(!student.includes('workbook-teacher-guidance'));
    for (const sheet of unit.notebooks) {
      assert.ok(teacher.includes(sheet.title));
      for (const section of sheet.modelSections) {
        assert.ok(teacher.includes(section.content), `${sheet.id}: missing model`);
        assert.ok(!student.includes(section.content), `${sheet.id}: model leaked to student sheet`);
      }
      for (const criterion of sheet.criteria) assert.ok(teacher.includes(criterion));
      for (const tip of guide.sheets[sheet.id].misconceptions) assert.ok(teacher.includes(tip));
      assert.ok(teacher.includes(guide.sheets[sheet.id].ask));
      const notebook = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(StructuredNotebook, { unit, sheet })));
      assert.ok(notebook.includes(`/workbook/unit-1-1?view=teacher#sheet-${sheet.id}`));
      assert.ok(notebook.includes('교사용 답안 보기'));
      assert.ok(notebook.includes('필기했어요'));
      assert.ok(!notebook.includes('pilot-note-model'), `${sheet.id}: inline answer revealed before writing`);
    }
    assert.ok(teacher.includes('430과 610 나노미터'));
  } finally {
    await server.close();
  }
});
