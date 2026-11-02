import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitProduct, SceneState, Station } from './state';

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/* ═══════════════ Shared textures (generated once, no network) ═══════════════ */

function radialSprite(inner: string, outer = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function verticalFade() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}

/* ═══════════════ Environment & reflections ═══════════════ */

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

/* ═══════════════ Scene 1: the Infinity relic (procedural gilded lemniscate) ═══════════════ */

/** Lemniscate of Bernoulli with a gentle twist in depth, so the band crosses over itself. */
class Lemniscate extends THREE.Curve<THREE.Vector3> {
  constructor(private a = 1.65) {
    super();
  }
  getPoint(u: number, target = new THREE.Vector3()) {
    const t = u * Math.PI * 2;
    const s = Math.sin(t);
    const d = 1 + s * s;
    return target.set((this.a * Math.cos(t)) / d, (this.a * s * Math.cos(t)) / d, 0.32 * s);
  }
}

function InfinityRelic({ state, reduce }: { state: SceneState; reduce: boolean }) {
  const group = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Sprite>(null);
  const curve = useMemo(() => new Lemniscate(), []);
  const g = useMemo(
    () => ({
      band: new THREE.TubeGeometry(curve, 480, 0.14, 40, true),
      // A soft gilded aura around the band.
      aura: new THREE.TubeGeometry(curve, 240, 0.26, 16, true),
    }),
    [curve],
  );
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d6ae63', metalness: 1, roughness: 0.24, envMapIntensity: 1.25 }), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f3d49a', transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const sparkMat = useMemo(() => new THREE.SpriteMaterial({ map: radialSprite('rgba(255,236,196,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const grp = group.current;
    if (!grp) return;
    const t = performance.now() / 1000;
    // Slow, continuous turn with a soft sway: never still, never hurried.
    grp.rotation.y = reduce ? 0.35 : Math.sin(t * 0.22) * 0.55;
    grp.rotation.x = reduce ? 0 : Math.sin(t * 0.17) * 0.08;
    const s = state.relicScale * (1 - smooth(0, 0.45, state.focus));
    grp.scale.setScalar(Math.max(0.0001, s));
    grp.position.y = 0.75 * state.relicScale + state.relicY + (reduce ? 0 : Math.sin(t / 2.6) * 0.06);
    grp.visible = state.temple < 0.5 && s > 0.002;
    glow.opacity = 0.07 + (reduce ? 0 : Math.sin(t * 1.3) * 0.025);
    // A point of light travels endlessly along the band.
    if (spark.current) {
      curve.getPoint(reduce ? 0.12 : (t * 0.07) % 1, p);
      spark.current.position.copy(p);
    }
  });
  return (
    <group ref={group}>
      <mesh geometry={g.band} material={gold} />
      <mesh geometry={g.aura} material={glow} />
      <sprite ref={spark} material={sparkMat} scale={[0.6, 0.6, 1]} />
    </group>
  );
}

/* ═══════════════ Artefacts riding the rings (real listing photographs) ═══════════════ */

function RingArtefacts({ state, images, rings, reduce }: { state: SceneState; images: string[]; rings: MutableRefObject<(THREE.Group | null)[]>; reduce: boolean }) {
  const textures = useLoader(THREE.TextureLoader, images);
  // Clones: the orbit crops the same cached textures to other shapes.
  const crops = useMemo(() => textures.map((t) => { const c = t.clone(); coverTexture(c, 1, 1); return c; }), [textures]);
  const face = useMemo(() => new THREE.CircleGeometry(0.34, 64), []);
  const back = useMemo(() => {
    const c = new THREE.CylinderGeometry(0.38, 0.38, 0.06, 64);
    c.rotateX(Math.PI / 2);
    c.translate(0, 0, -0.035);
    return c;
  }, []);
  const rim = useMemo(() => new THREE.TorusGeometry(0.37, 0.022, 10, 96), []);
  const faces = useMemo(() => crops.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.05, transparent: true })), [crops]);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a160', metalness: 1, roughness: 0.3, transparent: true }), []);
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2618', metalness: 0.8, roughness: 0.45, transparent: true }), []);
  const items = useRef<(THREE.Group | null)[]>([]);
  const { camera } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const t = performance.now() / 1000;
    const fade = state.ringOpacity * (1 - smooth(0, 0.55, state.orbit)) * (1 - smooth(0.1, 0.5, state.focus));
    gold.opacity = bronze.opacity = fade;
    images.forEach((_, i) => {
      const g = items.current[i];
      const ring = rings.current[i % RINGS.length];
      if (!g || !ring) return;
      g.visible = state.temple < 0.5 && fade > 0.01;
      if (!g.visible) return;
      faces[i].opacity = fade;
      // Evenly spaced along their ring, travelling with it.
      const perRing = Math.ceil(images.length / RINGS.length);
      const slot = Math.floor(i / RINGS.length);
      const a = (slot / perRing) * Math.PI * 2 + (i % RINGS.length) * 1.1 + (reduce ? 0 : t * 0.05 * (i % 2 ? -1 : 1));
      v.set(Math.cos(a), Math.sin(a), 0);
      ring.localToWorld(v);
      g.position.copy(v);
      g.quaternion.copy(camera.quaternion);
      // Objects at the back of the ring recede into the haze.
      g.scale.setScalar(0.6 + 0.3 * THREE.MathUtils.clamp((v.z + 2) / 4, 0, 1));
    });
  });
  return (
    <>
      {textures.map((_, i) => (
        <group key={images[i]} ref={(el) => (items.current[i] = el)}>
          <mesh geometry={back} material={bronze} />
          <mesh geometry={face} material={faces[i]} position={[0, 0, 0.002]} />
          <mesh geometry={rim} material={gold} />
        </group>
      ))}
    </>
  );
}

/* ═══════════════ Luminous elliptical rings ═══════════════ */

const RINGS = [
  { rx: 2.2, rz: 1.25, tilt: [1.2, 0.2, 0.35], speed: 0.12, color: '#f3dfae' },
  { rx: 2.75, rz: 1.6, tilt: [1.45, -0.5, -0.2], speed: -0.08, color: '#d2b783' },
  { rx: 3.3, rz: 1.9, tilt: [0.95, 0.9, 0.1], speed: 0.05, color: '#fff3dc' },
];

function Rings({ state, reduce, groups }: { state: SceneState; reduce: boolean; groups: MutableRefObject<(THREE.Group | null)[]> }) {
  const core = useMemo(() => new THREE.TorusGeometry(1, 0.006, 6, 256), []);
  const halo = useMemo(() => new THREE.TorusGeometry(1, 0.035, 8, 256), []);
  const bead = useMemo(() => new THREE.SphereGeometry(0.035, 12, 12), []);
  const mats = useMemo(
    () =>
      RINGS.map((r) => ({
        core: new THREE.MeshBasicMaterial({ color: r.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        halo: new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      })),
    [],
  );
  const beads = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    RINGS.forEach((r, i) => {
      const grp = groups.current[i];
      if (!grp) return;
      const spread = state.ringSpread;
      grp.scale.set(r.rx * spread, r.rz * spread, 1);
      // Centred on the infinity relic in the opening, on the product orbit once flattened.
      grp.position.y = 0.75 * (1 - state.ringFlat);
      // From free orbits to a calm, almost-flat halo around the product orbit.
      const flat = state.ringFlat;
      grp.rotation.x = THREE.MathUtils.lerp(r.tilt[0], Math.PI / 2 + (i - 1) * 0.06, flat);
      grp.rotation.y = THREE.MathUtils.lerp(r.tilt[1], 0, flat);
      grp.rotation.z += dt * (reduce ? 0 : r.speed) * (1 - flat * 0.7);
      const fade = state.ringOpacity * (1 - smooth(0.1, 0.6, state.focus));
      mats[i].core.opacity = 0.95 * fade;
      mats[i].halo.opacity = 0.14 * fade;
      grp.visible = state.temple < 0.5 && fade > 0.01;
      const b = beads.current[i];
      if (b) {
        const a = t * (0.6 + i * 0.25) * (reduce ? 0 : 1) + i * 2;
        b.position.set(Math.cos(a), Math.sin(a), 0);
        b.scale.set(1 / (r.rx * spread), 1 / (r.rz * spread), 1);
      }
    });
  });
  return (
    <>
      {RINGS.map((_, i) => (
        <group key={i} ref={(el) => (groups.current[i] = el)}>
          <mesh geometry={core} material={mats[i].core} />
          <mesh geometry={halo} material={mats[i].halo} />
          <mesh ref={(el) => (beads.current[i] = el)} geometry={bead} material={mats[i].core} />
        </group>
      ))}
    </>
  );
}

/* ═══════════════ Atmosphere: dust, fragments, haze, spotlight cone ═══════════════ */

function Dust({ state, count, reduce }: { state: SceneState; count: number; reduce: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 22;
      p[i * 3 + 1] = (Math.random() - 0.5) * 12;
      p[i * 3 + 2] = -24 + Math.random() * 34;
      s[i] = 0.4 + Math.random();
    }
    return { positions: p, speeds: s };
  }, [count]);
  const material = useMemo(
    () => new THREE.PointsMaterial({ size: 0.05, map: radialSprite('rgba(255,236,200,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#f2dfb5', sizeAttenuation: true }),
    [],
  );
  const moon = useMemo(() => new THREE.Color('#bcd2ff'), []);
  const warm = useMemo(() => new THREE.Color('#f2dfb5'), []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const rush = state.dustRush;
    const drift = reduce ? 0 : 0.08;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += step * drift * speeds[i] * 0.6;
      arr[i * 3 + 2] += step * (drift * 0.4 + rush * 9) * speeds[i];
      if (arr[i * 3 + 2] > 11) arr[i * 3 + 2] -= 34;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] -= 12;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    // Dust follows the camera's world so it stays around the visitor in every scene.
    const camZ = state.temple >= 0.5 ? CHAMBER.startZ + (CHAMBER.endZ - CHAMBER.startZ) * state.travel : state.camZ;
    pts.position.z = camZ - 9.5;
    material.color.copy(warm).lerp(moon, state.temple);
    material.opacity = 0.55 + rush * 0.4;
  });
  return (
    <points ref={ref} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
    </points>
  );
}

function Fragments({ state, count, reduce }: { state: SceneState; count: number; reduce: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.DodecahedronGeometry(0.07, 0), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d453b', roughness: 0.95, metalness: 0.05, flatShading: true }), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r: 2.4 + Math.random() * 4.2,
        a: (i / count) * Math.PI * 2 + Math.random(),
        y: (Math.random() - 0.5) * 3.2,
        s: 0.35 + Math.random() * 0.9,
        spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
        speed: 0.05 + Math.random() * 0.1,
      })),
    [count],
  );
  const m = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = reduce ? 0 : performance.now() / 1000;
    const spread = state.fragmentSpread;
    const fade = 1 - smooth(0, 0.6, state.orbit);
    seeds.forEach((s, i) => {
      const a = s.a + t * s.speed;
      m.position.set(Math.cos(a) * s.r * spread, s.y * (0.7 + spread * 0.3), Math.sin(a) * s.r * spread);
      m.rotation.set(s.spin.x * t, s.spin.y * t, s.spin.z * t);
      m.scale.setScalar(s.s * fade);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = state.temple < 0.5 && fade > 0.01;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} />;
}

function Atmosphere({ state }: { state: SceneState }) {
  const glow = useMemo(() => new THREE.SpriteMaterial({ map: radialSprite('rgba(210,183,131,0.55)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const coneMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fff1d6', alphaMap: verticalFade(), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    [],
  );
  const cone = useMemo(() => {
    const g = new THREE.ConeGeometry(2.4, 9, 48, 1, true);
    g.translate(0, -4.5, 0);
    return g;
  }, []);
  const halo = useRef<THREE.Sprite>(null);
  const beam = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const on = state.temple < 0.5;
    if (halo.current) {
      halo.current.visible = on;
      glow.opacity = 0.9 * (1 - state.orbit * 0.4);
    }
    if (beam.current) {
      beam.current.visible = on;
      coneMat.opacity = 0.07 * (1 - smooth(0.2, 1, state.focus));
    }
  });
  return (
    <>
      <sprite ref={halo} material={glow} position={[0, 0.2, -2.5]} scale={[9, 9, 1]} />
      <mesh ref={beam} geometry={cone} material={coneMat} position={[0, 6, 0]} />
    </>
  );
}

/* ═══════════════ Scene 3: circular product choreography ═══════════════ */

type Kind = 'disc' | 'arch' | 'book' | 'frame';
const kindFor = (slug: string): Kind =>
  slug === 'ancient-coins' || slug === 'decorative-collectibles' ? 'disc' : slug === 'manuscripts-prints' ? 'book' : slug === 'vintage-furniture' ? 'frame' : 'arch';
const FACE: Record<Kind, [number, number]> = { disc: [1.3, 1.3], arch: [1.15, 1.55], book: [1.1, 1.45], frame: [1.2, 1.5] };

function archShape(w: number, h: number) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, -h / 2);
  s.lineTo(r, -h / 2);
  s.lineTo(r, h / 2 - r);
  s.absarc(0, h / 2 - r, r, 0, Math.PI, false);
  s.lineTo(-r, -h / 2);
  return s;
}
function normalizeUV(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x);
    uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function useKindGeometry() {
  return useMemo(() => {
    const [aw, ah] = FACE.arch;
    const archFace = normalizeUV(new THREE.ShapeGeometry(archShape(aw, ah), 48));
    const archBack = new THREE.ExtrudeGeometry(archShape(aw + 0.14, ah + 0.14), { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 48 });
    archBack.translate(0, 0, -0.1);
    const [dw] = FACE.disc;
    const discFace = new THREE.CircleGeometry(dw / 2, 96);
    const discBody = new THREE.CylinderGeometry(dw / 2 + 0.06, dw / 2 + 0.06, 0.1, 96);
    discBody.rotateX(Math.PI / 2);
    discBody.translate(0, 0, -0.06);
    const discRim = new THREE.TorusGeometry(dw / 2 + 0.05, 0.035, 12, 128);
    const [bw, bh] = FACE.book;
    const bookFace = new THREE.PlaneGeometry(bw, bh);
    const bookBlock = new THREE.BoxGeometry(bw + 0.08, bh + 0.08, 0.28);
    bookBlock.translate(0, 0, -0.15);
    // Gilt spine rail so the active book glows like the other objects.
    const bookRail = new THREE.BoxGeometry(0.05, bh + 0.08, 0.03);
    const [fw, fh] = FACE.frame;
    const frameFace = new THREE.PlaneGeometry(fw, fh);
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-fw / 2 - 0.14, -fh / 2 - 0.14);
    frameShape.lineTo(fw / 2 + 0.14, -fh / 2 - 0.14);
    frameShape.lineTo(fw / 2 + 0.14, fh / 2 + 0.14);
    frameShape.lineTo(-fw / 2 - 0.14, fh / 2 + 0.14);
    const hole = new THREE.Path();
    hole.moveTo(-fw / 2, -fh / 2);
    hole.lineTo(-fw / 2, fh / 2);
    hole.lineTo(fw / 2, fh / 2);
    hole.lineTo(fw / 2, -fh / 2);
    frameShape.holes.push(hole);
    const frameMould = new THREE.ExtrudeGeometry(frameShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 2 });
    frameMould.translate(0, 0, -0.05);
    const frameBack = new THREE.BoxGeometry(fw, fh, 0.04);
    frameBack.translate(0, 0, -0.06);
    return { archFace, archBack, discFace, discBody, discRim, bookFace, bookBlock, bookRail, frameFace, frameMould, frameBack };
  }, []);
}

function coverTexture(tex: THREE.Texture, faceW: number, faceH: number) {
  const img = tex.image as HTMLImageElement | undefined;
  if (!img?.width) return;
  const faceA = faceW / faceH;
  const imgA = img.width / img.height;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (imgA > faceA) {
    tex.repeat.set(faceA / imgA, 1);
    tex.offset.set((1 - faceA / imgA) / 2, 0);
  } else {
    tex.repeat.set(1, imgA / faceA);
    tex.offset.set(0, (1 - imgA / faceA) / 2);
  }
  tex.needsUpdate = true;
}

export interface OrbitApi {
  select: (i: number) => void;
  open: (i: number) => void;
}

function Orbit({ state, products, api, onActive, compact }: { state: SceneState; products: OrbitProduct[]; api: OrbitApi; onActive: (i: number) => void; compact: boolean }) {
  const n = products.length;
  const textures = useLoader(THREE.TextureLoader, products.map((p) => p.image));
  const geo = useKindGeometry();
  const kinds = useMemo(() => products.map((p) => kindFor(p.category.slug)), [products]);
  useMemo(() => textures.forEach((t, i) => coverTexture(t, ...FACE[kinds[i]])), [textures, kinds]);
  const faceMats = useMemo(() => textures.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.62, metalness: 0.05, envMapIntensity: 0.4 })), [textures]);
  const rimMats = useMemo(() => products.map(() => new THREE.MeshStandardMaterial({ color: '#c9a160', metalness: 1, roughness: 0.28, emissive: new THREE.Color('#d2b783'), emissiveIntensity: 0 })), [products]);
  const leather = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a1d24', roughness: 0.55, metalness: 0.15 }), []);
  const pages = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efe2c6', roughness: 0.9 }), []);
  const bronzeDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2618', metalness: 0.8, roughness: 0.45 }), []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const spot = useRef<THREE.SpotLight>(null);
  const lastActive = useRef(-1);
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const Rx = compact ? 2.7 : 4.3;
  const Rz = compact ? 2.0 : 2.6;

  useFrame(() => {
    const appear = smooth(0, 1, state.orbit);
    const visible = state.temple < 0.5 && appear > 0.001;
    const active = ((Math.round(state.angle) % n) + n) % n;
    if (active !== lastActive.current) {
      lastActive.current = active;
      onActive(active);
    }
    const focus = state.focus;
    // Where the active object travels when it fills the view (scene 4).
    camera.getWorldDirection(tmp);
    camTarget.copy(camera.position).addScaledVector(tmp, 1.35);
    for (let i = 0; i < n; i++) {
      const g = groups.current[i];
      if (!g) continue;
      g.visible = visible;
      if (!visible) continue;
      let rel = i - state.angle;
      rel = ((rel % n) + n) % n;
      if (rel > n / 2) rel -= n;
      const theta = (rel * Math.PI * 2) / n;
      const front = (Math.cos(theta) + 1) / 2; // 1 = facing the camera at the front of the orbit
      const lift = Math.pow(front, 6);
      const x = Math.sin(theta) * Rx;
      const z = Math.cos(theta) * Rz + lift * 1.4;
      const y = (((i * 37) % 10) / 10 - 0.5) * 1.1 * (1 - lift) + lift * 0.15;
      g.position.set(x, y + (1 - appear) * -3, z);
      g.rotation.y = -theta * 0.55;
      let s = (0.45 + 0.75 * Math.pow(front, 2.2)) * appear;
      const isActive = i === active;
      if (isActive && focus > 0) {
        const f = smooth(0, 1, focus);
        g.position.lerp(camTarget, f);
        g.quaternion.slerp(camera.quaternion, f);
        s = THREE.MathUtils.lerp(s, 1.9, f);
      } else if (focus > 0) {
        s *= 1 - smooth(0, 0.5, focus);
      }
      g.scale.setScalar(Math.max(0.0001, s));
      rimMats[i].emissiveIntensity = isActive ? 0.35 + 0.25 * Math.sin(performance.now() / 600) * 0.5 : 0;
    }
    // Lighting follows the selection.
    const sl = spot.current;
    const ag = groups.current[active];
    if (sl && ag) {
      sl.target.position.copy(ag.position);
      sl.target.updateMatrixWorld();
      sl.intensity = 60 * appear * (1 - smooth(0.6, 1, focus)) * (state.temple < 0.5 ? 1 : 0);
    }
  });

  // Raycasting also hits hidden objects, so ignore events unless the orbit is on screen
  // (and don't stop propagation, so the visible scene still receives them).
  const live = () => state.temple < 0.5 && state.orbit > 0.5 && state.focus < 0.3;
  const handleClick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    if (!live()) return;
    e.stopPropagation();
    if (i === lastActive.current) api.open(i);
    else api.select(i);
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!live()) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const out = () => (document.body.style.cursor = '');

  return (
    <>
      <spotLight ref={spot} position={[0, 6, 6]} angle={0.42} penumbra={0.8} distance={22} decay={1.6} color="#ffe7bf" />
      {products.map((p, i) => {
        const k = kinds[i];
        return (
          <group key={p.id} ref={(el) => (groups.current[i] = el)} onClick={handleClick(i)} onPointerOver={over} onPointerOut={out}>
            {k === 'arch' && (
              <>
                <mesh geometry={geo.archBack} material={rimMats[i]} />
                <mesh geometry={geo.archFace} material={faceMats[i]} position={[0, 0, 0.01]} />
              </>
            )}
            {k === 'disc' && (
              <>
                <mesh geometry={geo.discBody} material={bronzeDark} />
                <mesh geometry={geo.discFace} material={faceMats[i]} position={[0, 0, 0.002]} />
                <mesh geometry={geo.discRim} material={rimMats[i]} />
              </>
            )}
            {k === 'book' && (
              <>
                <mesh geometry={geo.bookBlock} material={[pages, pages, pages, pages, leather, leather]} />
                <mesh geometry={geo.bookFace} material={faceMats[i]} position={[0, 0, 0.002]} />
                <mesh geometry={geo.bookRail} material={rimMats[i]} position={[-0.62, 0, 0.01]} />
              </>
            )}
            {k === 'frame' && (
              <>
                <mesh geometry={geo.frameBack} material={bronzeDark} />
                <mesh geometry={geo.frameFace} material={faceMats[i]} position={[0, 0, -0.035]} />
                <mesh geometry={geo.frameMould} material={rimMats[i]} />
              </>
            )}
          </group>
        );
      })}
    </>
  );
}

/* ═══════════════ Scene 5: the moonlit chamber ═══════════════ */

const STATION_Z = (i: number, n: number) => 7 - (i * 32) / Math.max(1, n - 1);
export const CHAMBER = { startZ: 16, endZ: -30 };

function textTexture(title: string, numeral: string, subtitle: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2a2018');
  grad.addColorStop(1, '#16110c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = 'rgba(210,183,131,0.85)';
  g.lineWidth = 4;
  g.strokeRect(18, 18, 988, 476);
  g.lineWidth = 1.5;
  g.strokeRect(34, 34, 956, 444);
  g.textAlign = 'center';
  g.fillStyle = '#d2b783';
  g.font = '500 54px "Cormorant Garamond", Georgia, serif';
  g.fillText(numeral, 512, 150);
  g.fillStyle = '#f6efe2';
  g.font = '500 92px "Cormorant Garamond", Georgia, serif';
  g.fillText(title, 512, 280, 920);
  g.fillStyle = 'rgba(246,239,226,0.7)';
  g.font = '400 36px Inter, system-ui, sans-serif';
  g.fillText(subtitle.toUpperCase(), 512, 370, 900);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Chamber({ state, stations, onStation, onOpenStation, compact }: { state: SceneState; stations: Station[]; onStation: (i: number) => void; onOpenStation: (i: number) => void; compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const images = useLoader(THREE.TextureLoader, stations.map((s) => s.image));
  useMemo(() => images.forEach((t) => coverTexture(t, 1.6, 2)), [images]);
  const COLS = compact ? 7 : 10;
  const colGeo = useMemo(() => new THREE.CylinderGeometry(0.42, 0.48, 8.4, 20, 1), []);
  const capGeo = useMemo(() => new THREE.BoxGeometry(1.25, 0.32, 1.25), []);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6c6860', roughness: 0.82, metalness: 0.04, flatShading: true }), []);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#10141b', roughness: 0.28, metalness: 0.4 }), []);
  const plinthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3d3730', roughness: 0.7 }), []);
  const shaftMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#a9c6ff', alphaMap: verticalFade(), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    [],
  );
  const moonMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e9f0ff', toneMapped: false }), []);
  const moonGlow = useMemo(() => new THREE.SpriteMaterial({ map: radialSprite('rgba(170,200,255,0.8)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const plaques = useMemo(() => stations.map((s, i) => new THREE.MeshStandardMaterial({ map: textTexture(s.title, ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i] ?? '', s.subtitle), roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.05 })), [stations]);
  const photos = useMemo(() => images.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })), [images]);
  const goldMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a160', metalness: 1, roughness: 0.3 }), []);
  const cols = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const lastStation = useRef(-1);

  useEffect(() => {
    const m = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < COLS; i++) {
      for (const side of [-1, 1]) {
        const z = 14 - (i * 46) / (COLS - 1);
        m.position.set(side * 4.4, 4.2, z);
        m.rotation.set(0, 0, 0);
        m.updateMatrix();
        cols.current?.setMatrixAt(k, m.matrix);
        m.position.set(side * 4.4, 8.5, z);
        m.updateMatrix();
        caps.current?.setMatrixAt(k, m.matrix);
        k++;
      }
    }
    if (cols.current) cols.current.instanceMatrix.needsUpdate = true;
    if (caps.current) caps.current.instanceMatrix.needsUpdate = true;
  }, [COLS]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = state.temple >= 0.5;
    if (!g.visible) return;
    const camZ = CHAMBER.startZ + (CHAMBER.endZ - CHAMBER.startZ) * state.travel;
    let nearest = 0;
    let best = Infinity;
    stations.forEach((_, i) => {
      const d = Math.abs(STATION_Z(i, stations.length) - (camZ - 5));
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    if (nearest !== lastStation.current) {
      lastStation.current = nearest;
      onStation(nearest);
    }
    plaques.forEach((m, i) => (m.emissiveIntensity = i === nearest ? 0.22 : 0.04));
  });

  const live = () => state.temple >= 0.5;
  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!live()) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const out = () => (document.body.style.cursor = '');

  return (
    <group ref={group} visible={false}>
      <hemisphereLight args={['#4a6290', '#05070a', 0.22]} />
      <directionalLight color="#b9cfff" intensity={1.15} position={[-6, 14, 4]} />
      <pointLight color="#e2c08a" intensity={18} distance={14} decay={1.6} position={[0, 3, -12]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]} material={floorMat}>
        <planeGeometry args={[30, 70]} />
      </mesh>
      <instancedMesh ref={cols} args={[colGeo, stone, COLS * 2]} />
      <instancedMesh ref={caps} args={[capGeo, stone, COLS * 2]} />
      {/* Architrave beams */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.4, 8.95, -9]} material={stone}>
          <boxGeometry args={[1.3, 0.6, 50]} />
        </mesh>
      ))}
      {/* Shafts of moonlight between the columns */}
      {Array.from({ length: compact ? 4 : 7 }).map((_, i) => (
        <mesh key={i} material={shaftMat} position={[i % 2 ? 2.2 : -2.2, 4.6, 10 - i * 6.5]} rotation={[0, 0, i % 2 ? -0.32 : 0.32]}>
          <planeGeometry args={[1.6, 10]} />
        </mesh>
      ))}
      {/* The moon through the far arch */}
      <mesh position={[0, 7.5, -36]} material={moonMat}>
        <circleGeometry args={[1.6, 64]} />
      </mesh>
      <sprite position={[0, 7.5, -35.9]} scale={[14, 14, 1]} material={moonGlow} />
      {/* Collection stations */}
      {stations.map((s, i) => {
        const side = i % 2 ? 1 : -1;
        const z = STATION_Z(i, stations.length);
        return (
          <group key={s.key} position={[side * 2.35, 0, z]} rotation={[0, -side * 0.55, 0]} onClick={(e) => { if (!live()) return; e.stopPropagation(); onOpenStation(i); }} onPointerOver={over} onPointerOut={out}>
            <mesh position={[0, 0.55, 0]} material={plinthMat}>
              <boxGeometry args={[1.9, 1.1, 0.9]} />
            </mesh>
            <mesh position={[0, 2.35, 0]} material={goldMat}>
              <boxGeometry args={[1.78, 2.18, 0.06]} />
            </mesh>
            <mesh position={[0, 2.35, 0.04]} material={photos[i]}>
              <planeGeometry args={[1.6, 2]} />
            </mesh>
            <mesh position={[0, 0.7, 0.46]} material={plaques[i]}>
              <planeGeometry args={[1.7, 0.85]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ═══════════════ Camera rig & composition ═══════════════ */

function CameraRig({ state, reduce, compact }: { state: SceneState; reduce: boolean; compact: boolean }) {
  const { camera, scene, pointer } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const fogWarm = useMemo(() => new THREE.Color('#060403'), []);
  const fogMoon = useMemo(() => new THREE.Color('#0b1220'), []);
  const sway = useRef(new THREE.Vector2());
  useEffect(() => {
    scene.fog = new THREE.FogExp2('#060403', 0.055);
    scene.background = new THREE.Color('#050403');
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // Gentle pointer parallax layered on top of the scroll-driven path.
    if (!reduce && !compact) sway.current.lerp(pointer, 0.04);
    if (state.temple >= 0.5) {
      const z = CHAMBER.startZ + (CHAMBER.endZ - CHAMBER.startZ) * state.travel;
      cam.position.set(Math.sin(state.travel * Math.PI * 2) * 0.6 + sway.current.x * 0.3, 1.75 + sway.current.y * 0.15, z);
      look.set(Math.sin(state.travel * Math.PI * 2 + 0.6) * 0.8, 2.1, z - 8);
    } else {
      cam.position.set(state.camX + sway.current.x * 0.35, state.camY + sway.current.y * 0.2, state.camZ);
      look.set(0, state.lookY, 0);
    }
    cam.lookAt(look);
    const fog = scene.fog as THREE.FogExp2;
    if (fog) {
      fog.color.copy(fogWarm).lerp(fogMoon, state.temple >= 0.5 ? 1 : 0);
      fog.density = state.temple >= 0.5 ? 0.034 : 0.05;
      (scene.background as THREE.Color).copy(fog.color);
    }
  });
  return null;
}

function RelicLights({ state }: { state: SceneState }) {
  const key = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.AmbientLight>(null);
  useFrame(() => {
    const on = state.temple < 0.5 ? 1 : 0;
    // Light breathes very slightly — stillness with life.
    const breathe = 1 + Math.sin(performance.now() / 3000) * 0.05;
    if (key.current) key.current.intensity = 140 * on * breathe * (1 - state.orbit * 0.35);
    if (rim.current) rim.current.intensity = 30 * on;
    if (fill.current) fill.current.intensity = 0.12 * on + 0.05;
  });
  return (
    <>
      <ambientLight ref={fill} color="#d8c7a8" />
      <spotLight ref={key} position={[1.5, 7, 4]} angle={0.38} penumbra={0.9} distance={20} decay={1.5} color="#ffe2b0" />
      <pointLight ref={rim} position={[-3, 1.5, -3.5]} color="#7fa6d8" distance={12} decay={1.6} />
    </>
  );
}

export function MuseumScene({
  state,
  products,
  stations,
  api,
  onActive,
  onStation,
  onOpenStation,
  reduce,
  compact,
}: {
  state: SceneState;
  products: OrbitProduct[];
  stations: Station[];
  api: OrbitApi;
  onActive: (i: number) => void;
  onStation: (i: number) => void;
  onOpenStation: (i: number) => void;
  reduce: boolean;
  compact: boolean;
}) {
  const rings = useRef<(THREE.Group | null)[]>([]);
  // A few real objects ride the rings in the opening scene.
  const ringImages = useMemo(() => products.slice(0, compact ? 3 : 6).map((p) => p.image), [products, compact]);
  return (
    <>
      <Environment />
      <CameraRig state={state} reduce={reduce} compact={compact} />
      <RelicLights state={state} />
      <Atmosphere state={state} />
      <InfinityRelic state={state} reduce={reduce} />
      <Rings state={state} reduce={reduce} groups={rings} />
      {ringImages.length > 0 && (
        <Suspense fallback={null}>
          <RingArtefacts state={state} images={ringImages} rings={rings} reduce={reduce} />
        </Suspense>
      )}
      <Fragments state={state} count={compact ? 16 : 36} reduce={reduce} />
      <Dust state={state} count={compact ? 450 : 1400} reduce={reduce} />
      {/* Photographs load behind their own boundaries so the relic is on screen at once. */}
      {products.length > 0 && (
        <Suspense fallback={null}>
          <Orbit state={state} products={products} api={api} onActive={onActive} compact={compact} />
        </Suspense>
      )}
      {stations.length > 0 && (
        <Suspense fallback={null}>
          <Chamber state={state} stations={stations} onStation={onStation} onOpenStation={onOpenStation} compact={compact} />
        </Suspense>
      )}
    </>
  );
}
