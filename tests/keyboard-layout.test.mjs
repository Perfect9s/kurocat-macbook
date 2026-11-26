import assert from 'node:assert/strict';
import test from 'node:test';
import { getKeyboardLayout, normalizeKeyboardLayout, resolveKeyByVk } from '../src/keyboardLayout.ts';

test('original layouts keep their compact aliases and full-size physical keys', () => {
  assert.equal(normalizeKeyboardLayout(undefined), '65');
  assert.equal(normalizeKeyboardLayout('future'), '65');
  assert.equal(resolveKeyByVk(0x70, '65').id, '1');
  assert.equal(resolveKeyByVk(0x70, '108').id, 'f1');
  assert.equal(resolveKeyByVk(0x10d, '108').id, 'np_ent');
  assert.equal(getKeyboardLayout('108').keys.length, 108);
});

const layout = getKeyboardLayout('macbook');
const rect = k => [k.uStart, k.rowY ?? k.row, k.uWidth, k.rowSpan ?? 1];
test('ANSI rows fit the deck without overlaps, duplicate IDs or duplicate bindings', () => {
  assert.deepEqual(Array.from({length: 6}, (_, row) => layout.keys.filter(k => k.row === row).length),
    [14, 14, 14, 13, 12, 11]);
  assert.equal(new Set(layout.keys.map(k => k.id)).size, 78);
  const codes = layout.keys.flatMap(k => k.vkCodes);
  assert.equal(new Set(codes).size, codes.length);
  for (const [i, key] of layout.keys.entries()) {
    const [x, y, w, h] = rect(key);
    assert.ok(x >= 0 && y >= 0 && x + w <= layout.totalUnits + 1e-8 && y + h <= layout.totalRows);
    for (const other of layout.keys.slice(i + 1)) {
      const [a, b, c, d] = rect(other);
      assert.ok(x + w <= a + 1e-8 || a + c <= x + 1e-8 || y + h <= b || b + d <= y,
        key.id + ' overlaps ' + other.id);
    }
  }
});

test('native transport IDs resolve independently of keycap text', () => {
  for (const [code, id] of [[0x5b,'lcommand'], [0x5c,'rcommand'], [0xa4,'loption'],
    [0xa5,'roption'], [0xa2,'lctrl'], [0x13f,'fn'], [0x20,'space'], [8,'bs'], [13,'enter'],
    [27,'esc'], [0x25,'left'], [0x26,'up'], [0x27,'right'], [0x28,'down']]) {
    assert.equal(resolveKeyByVk(code, 'macbook').id, id);
  }
  for (let i = 0; i < 12; i++) assert.equal(resolveKeyByVk(0x70 + i, 'macbook').id, 'f' + (i+1));
  assert.deepEqual(layout.keys.find(k => k.id === 'touchid').vkCodes, []);
  assert.equal(resolveKeyByVk(0xff, 'macbook'), null);
  assert.deepEqual(rect(layout.keys.find(k => k.id === 'down')), [13, 5.5, 1, 0.5]);
});
