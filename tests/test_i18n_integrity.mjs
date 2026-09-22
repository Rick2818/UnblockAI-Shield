import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Bilingual i18n DOM IDs and dictionary completeness', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract all safeSet IDs
  const safeSetMatches = [...html.matchAll(/safeSet\('([^']+)'/g)].map(m => m[1]);
  assert.ok(safeSetMatches.length > 50, 'Should have at least 50 localized elements');

  const missingFromHtml = [];
  for (const id of safeSetMatches) {
    if (!html.includes(`id="${id}"`)) {
      missingFromHtml.push(id);
    }
  }

  assert.deepStrictEqual(missingFromHtml, [], `All safeSet IDs must exist in HTML: ${missingFromHtml.join(', ')}`);

  // Verify English and Spanish VTT subtitles exist
  const vttEs = path.resolve('assets/videos/gerente_general_estrategia_ejecutiva.vtt');
  const vttEn = path.resolve('assets/videos/gerente_general_estrategia_ejecutiva_en.vtt');

  assert.ok(fs.existsSync(vttEs), 'Spanish VTT file must exist');
  assert.ok(fs.existsSync(vttEn), 'English VTT file must exist');
});
