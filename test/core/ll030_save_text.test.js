// LL-030: save strings reached innerHTML. Core side: strict text schema; labels never come from saves.
// (UI side: src/main.js now renders save-derived text through esc(); see docs/STAGE0_REPORT.md.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveError } from '../../core/index.js';
import { makeSim, naomi } from './helpers.js';

const withMem = (mem) => { const s = makeSim(); const d = JSON.parse(s.serialize()); d.agents[0].memories = [mem]; return { s, d }; };

test('LL-030: memory text is stored as inert plain text', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const { s, d } = withMem({ t: 'Mon', day: 0, text: evil, tags: [] });
  s.load(d); assert.equal(naomi(s).memories[0].text, evil); // stored verbatim; UIs must use textContent
});

for (const [what, mem] of [
  ['non-string text', { t: 'Mon', day: 0, text: { toString: 1 }, tags: [] }],
  ['overlong text', { t: 'Mon', day: 0, text: 'x'.repeat(5000), tags: [] }],
  ['control characters', { t: 'Mon', day: 0, text: 'a\u0000b', tags: [] }],
  ['non-string tag', { t: 'Mon', day: 0, text: 'ok', tags: [1] }],
]) {
  test(`LL-030: rejects memory with ${what}`, () => { const { s, d } = withMem(mem); assert.throws(() => s.load(d), SaveError); });
}

test('LL-030: relationship labels and unknown relations are not imported from saves', () => {
  const s = makeSim(); const d = JSON.parse(s.serialize());
  d.agents[0].rel.darius.label = '<script>x</script>'; d.agents[0].rel.mallory = { label: 'x', affection: 1 };
  s.load(d);
  assert.equal(naomi(s).rel.darius.label, 'Husband'); assert.equal(naomi(s).rel.mallory, undefined);
});

test('LL-030: oversized save is rejected before parsing', () => {
  const s = makeSim(); assert.throws(() => s.load('{"v":2,"pad":"' + 'x'.repeat(600 * 1024) + '"}'), /too large/);
});
