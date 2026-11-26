import * as THREE from 'three';
import { KuroCatEngine } from '../src/catEngine';
import { KuroCatEngine3D } from '../src/catEngine3d';
import { getKeyboardLayout } from '../src/keyboardLayout';

const result = document.querySelector('#result');
const canvas = document.querySelector('canvas');
const is3d = new URLSearchParams(location.search).get('mode') === '3d';
const check = (condition, message) => { if (!condition) throw new Error(message); };
try {
  const engine = is3d ? new KuroCatEngine3D(canvas, {embedded: true}) : new KuroCatEngine(canvas, {embedded: true});
  engine.resize();
  engine.showKeyBubbles = false;
  engine.setTailKeyConfig('off', []);
  const screenshots = {};
  for (const id of ['65', '108', 'macbook']) {
    const spec = getKeyboardLayout(id);
    for (const facing of ['cat', 'viewer']) {
      engine.setKeyboardConfig(id, facing);
      const code = id === 'macbook' ? 0x5c : 0x41;
      const pressed = id === 'macbook' ? 'rcommand' : 'a';
      engine.onKeyDown(code, false);
      if (is3d) {
        const desk = engine.desk;
        const key = desk.resolveKey(code);
        check(key.spec.id === pressed && key.down, '3D keydown');
        check(Object.values(engine.paws).some(p => p.keyId === pressed && p.down), '3D paw target');
        const batches = desk.boardGroup.children.filter(c => c.isInstancedMesh);
        check(batches.length === 2 && batches.every(b => b.count === spec.keys.length), 'key batches');
        check((desk.getKeyById('esc').x < 0) === (facing === 'viewer'), '3D orientation');
        for (let i = 0; i < 8; i++) engine.update(1/60);
        check(key.depth > 0 && key.depth < key.scaleY, '3D key travel');
        engine.renderer.render(engine.scene, engine.camera);
      } else {
        check(engine.keyAnims.get(pressed).pressed && engine.heldKeys.get(code).specId === pressed, '2D paw/keydown');
        const esc = engine.getKeyWorldCenter(spec.keys[0]);
        check((esc.x < engine.kbCenterX) === (facing === 'viewer'), '2D orientation');
        engine.update(1/60, performance.now());
        engine.render();
      }
      if (id === 'macbook') screenshots[facing] = canvas.toDataURL('image/png').split(',')[1];
      engine.onKeyUp(code);
      check(is3d ? !engine.desk.resolveKey(code).down : !engine.keyAnims.get(pressed).pressed, 'keyup');
    }
  }
  if (is3d) {
    // Photograph the production board from above, retaining the installed key geometry and atlas.
    const board = engine.desk.boardGroup;
    const center = board.getWorldPosition(new THREE.Vector3());
    const cam = new THREE.OrthographicCamera(-1.31, 1.31, 0.55, -0.55, 0.1, 8);
    cam.up.set(0, 0, -1);
    cam.position.copy(center).add(new THREE.Vector3(0, 2.6, 0));
    cam.lookAt(center);
    const scene = new THREE.Scene();
    scene.attach(board);
    engine.renderer.setSize(1440, 605, false);
    engine.renderer.render(scene, cam);
    screenshots.detail = canvas.toDataURL('image/png').split(',')[1];
  }
  engine.stop();
  result.textContent = JSON.stringify({screenshots});
} catch (error) {
  result.textContent = JSON.stringify({error: String(error), stack: error.stack});
}
