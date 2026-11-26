import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const url = 'http://127.0.0.1:1420/tests/render.html';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], {stdio: 'inherit'});
const profile = await mkdtemp(join(tmpdir(), 'kurocat-chrome-'));
try {
  for (let i = 0; i < 50; ++i) {
    if (await fetch(url).then(r => r.ok).catch(() => false)) break;
    await delay(200);
  }
  await mkdir('render-results', {recursive: true});
  for (const mode of ['2d', '3d']) {
    const {stdout} = await promisify(execFile)(process.env.CHROME_BIN || 'google-chrome', [
      '--headless', '--no-first-run', '--disable-dev-shm-usage', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--user-data-dir=' + profile, '--virtual-time-budget=12000',
      '--dump-dom', url + '?mode=' + mode,
    ], {maxBuffer: 12 * 1024 * 1024, timeout: 90000});
    const payload = stdout.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
    assert.ok(payload, 'Browser fixture did not finish: ' + stdout.slice(-1000));
    const result = JSON.parse(payload.replaceAll('&amp;', '&'));
    assert.ok(!result.error, result.stack);
    for (const [facing, png] of Object.entries(result.screenshots)) {
      const image = Buffer.from(png, 'base64');
      assert.ok(image.length > 4000, 'Empty render');
      await writeFile(`render-results/macbook-${mode}-${facing}.png`, image);
    }
    console.log(mode + ': 3 layouts × 2 orientations, key down/up and paw targets passed');
  }
} finally {
  server.kill();
  await rm(profile, {recursive: true, force: true, maxRetries: 3});
}
