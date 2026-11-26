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
  // Keep a gesture at its sampled time while software WebGL compiles or reads pixels.
  const frameTime = performance.now();
  Object.defineProperty(performance, 'now', {configurable: true, value: () => frameTime});
  const touches = [{id: 7, x: .16, y: .82}, {id: 11, x: .84, y: .18}];
  const renderFrame = () => {
    if (is3d) {
      engine.update(1/60);
      engine.renderer.render(engine.scene, engine.camera);
    } else {
      engine.update(1/60, performance.now());
      engine.render();
    }
  };
  for (const facing of ['cat', 'viewer']) {
    engine.setKeyboardConfig('macbook', facing, true);
    engine.setTrackpad(true);
    engine.onTrackpad(touches);
    const pad = is3d ? engine.desk.pad : engine.pad;
    check(pad.points.length === 2 && pad.target === undefined, 'two independent contacts');
    engine.onMouseDown('left');
    check(pad.pressed && !pad.target, 'ambiguous click depresses entire surface');
    engine.onMouseUp('left');
    engine.onTrackpad([touches[0]]);
    engine.onMouseDown('left', touches[0]);
    check(pad.target?.id === 7, 'click goes to physical point');
    engine.onMouseUp('left');
    engine.onTrackpad(touches);
    renderFrame();
    if (is3d) {
      check(engine.desk.padDots.count === 2 && !engine.desk.mouseShape.visible, '3D dot batch and mouse replacement');
      check(engine.desk.whiteKeyboard, '3D white finish');
      const local = engine.desk.padGroup.worldToLocal(engine.desk.mouseTopWorld(new THREE.Vector3()));
      check(local.x < 0 && local.z > 0, '3D paw uses same surface as dots');
    } else {
      check(engine.whiteKeyboard, '2D white finish');
      check((engine.padOffset(touches[0]).x < 0) === (facing === 'viewer'), '2D pad orientation');
    }
    screenshots['white-trackpad-' + facing] = canvas.toDataURL('image/png').split(',')[1];
    engine.onTrackpad([]);
    renderFrame();
    check(pad.clickMark()?.point.id === 7, 'a confirmed click remains visible after lift');
    if (is3d) {
      const desk = engine.desk;
      const normal = obj => new THREE.Vector3(0, 1, 0).applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion()));
      check(normal(desk.padGroup).dot(normal(desk.boardGroup)) > .99999, 'trackpad and keyboard share inclination');
      const axes = obj => new THREE.Vector3(1, 0, 0).applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion()));
      check(Math.abs(axes(desk.padGroup).dot(axes(desk.boardGroup))) > .99999, 'parallel long edges');
      check(desk.clickSprite.visible && desk.padDots.count === 0, 'released click visible on its own');
      for (const x of [-1,1]) for (const z of [-1,1]) {
        const ndc = desk.padGroup.localToWorld(new THREE.Vector3(x * desk.padWidth / 2, .042, z * desk.padDepth / 2)).project(engine.camera);
        check(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1, 'whole trackpad fits camera');
      }
    } else {
      const a = engine.padWorldPoint({x: .2, y: .5}), b = engine.padWorldPoint({x: .8, y: .5});
      check(Math.abs((b.y - a.y) / (b.x - a.x) - Math.tan(engine.kbTiltRad)) < 1e-5, 'paw and surface follow keyboard angle');
    }
    engine.setTrackpad(false);
    check(!pad.enabled && !pad.points.length, 'mouse mode clears contacts');
  }
  delete performance.now;
  engine.setKeyboardConfig('macbook', 'viewer');
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
