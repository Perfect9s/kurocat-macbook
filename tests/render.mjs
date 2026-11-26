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
    if (is3d) for (let i = 0; i < 48; i++) engine.update(1 / 60);
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
      const catEdge = obj => obj.localToWorld(new THREE.Vector3(0, 0, obj === desk.boardGroup
        ? -(getKeyboardLayout('macbook').totalRows * .15 + .14) / 2
        : desk.padDepth / 2 * (facing === 'cat' ? 1 : -1)));
      const dz = catEdge(desk.padGroup).sub(catEdge(desk.boardGroup)).dot(new THREE.Vector3(0,0,1)
        .applyQuaternion(desk.boardGroup.getWorldQuaternion(new THREE.Quaternion())));
      check(Math.abs(dz) < .001, 'cat-side edges line up');
      check(desk.clickMarker.isMesh, 'click marker lies on the glass');
      check(normal(desk.padGroup).dot(normal(desk.boardGroup)) > .99999, 'trackpad and keyboard share inclination');
      const axes = obj => new THREE.Vector3(1, 0, 0).applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion()));
      check(Math.abs(axes(desk.padGroup).dot(axes(desk.boardGroup))) > .99999, 'parallel long edges');
      check(desk.clickMarker.visible && desk.padDots.count === 0, 'released click visible on its own');
      for (const x of [-1,1]) for (const z of [-1,1]) {
        const ndc = desk.padGroup.localToWorld(new THREE.Vector3(x * desk.padWidth / 2, .042, z * desk.padDepth / 2)).project(engine.camera);
        check(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1, 'whole trackpad fits camera');
      }
    } else {
      const catEdge = engine.padCenterY - engine.padDepth / 2;
      check(Math.abs(catEdge + engine.kbHeight / 2) < 1e-5, '2D cat-side edges line up');
      const far = engine.padOffset({x: .5, y: facing === 'viewer' ? 0 : 1});
      const near = engine.padOffset({x: .5, y: facing === 'viewer' ? 1 : 0});
      check(near.x < far.x && near.y > far.y, 'the left-hand pad converges toward the shared vanishing point');
      const a = engine.padWorldPoint({x: .2, y: .5}), b = engine.padWorldPoint({x: .8, y: .5});
      check(Math.abs((b.y - a.y) / (b.x - a.x) - Math.tan(engine.kbTiltRad)) < 1e-5, 'paw and surface follow keyboard angle');
    }
    for (const x of [0, 1]) for (const y of [0, 1]) {
      const point = {id: 21, x, y};
      engine.onTrackpad([point]);
      engine.onMouseDown('left', point);
      if (is3d) {
        const desk = engine.desk;
        engine.update(1 / 60);
        const dot = new THREE.Matrix4();
        desk.padDots.getMatrixAt(0, dot);
        const paw = desk.padGroup.worldToLocal(desk.mouseTopWorld(new THREE.Vector3()));
        const marker = desk.clickMarker.position;
        check(Math.hypot(marker.x - dot.elements[12], marker.z - dot.elements[14]) < 1e-5, 'corner click and dot coincide');
        check(Math.hypot(marker.x - paw.x, marker.z - paw.z) < 1e-5, 'corner paw and click coincide');
      } else {
        const dx = (x - .5) * engine.padWidth * .9 * (facing === 'cat' ? -1 : 1);
        const dy = (y - .5) * engine.padDepth * .9 * (facing === 'cat' ? -1 : 1);
        const planeY = engine.padCenterY + dy;
        const planeX = (engine.padCenterX + dx) * engine.deskWidthScale(planeY);
        const c = Math.cos(engine.kbTiltRad), s = Math.sin(engine.kbTiltRad);
        const got = engine.padWorldPoint();
        const expectedX = engine.kbCenterX + c * planeX - s * (planeY + engine.padTravel);
        const expectedY = engine.kbCenterY + engine.deskHopY + s * planeX + c * (planeY + engine.padTravel);
        check(Math.hypot(got.x - expectedX, got.y - expectedY) < 1e-5, '2D corner matches keyboard desk projection');
      }
      engine.onMouseUp('left');
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
