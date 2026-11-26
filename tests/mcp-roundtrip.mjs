// Integration test for a disposable macOS CI runner with an empty app data directory.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const binary = process.argv[2];
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run on an isolated GitHub Actions runner');
assert.equal(existsSync(join(homedir(), 'Library/Application Support/kuro-cat-pet/settings.json')), false);
function rpc(method, params) {
  const request = JSON.stringify({jsonrpc: '2.0', id: 1, method, params});
  const result = JSON.parse(execFileSync(binary, ['--mcp'], {input: request + '\n', encoding: 'utf8'})).result;
  assert.ok(result && !result.isError);
  return result;
}
const call = (name, args = {}) => JSON.parse(rpc('tools/call', {name, arguments: args}).content[0].text);
const tools = rpc('tools/list', {}).tools;
assert.deepEqual(tools.find(t => t.name === 'update_settings').inputSchema.properties.keyboardLayout.enum,
  ['65', '108', 'macbook']);
assert.equal(call('get_settings').keyboardLayout, '65');
for (const id of ['108', 'macbook', '65']) {
  assert.equal(call('update_settings', {keyboardLayout: id}).keyboardLayout, id);
  assert.equal(call('update_settings', {showKeyBubbles: false}).keyboardLayout, id);
  assert.equal(call('get_settings').keyboardLayout, id);
}
console.log('MCP layout switching, partial updates and persisted settings passed across process restarts');
