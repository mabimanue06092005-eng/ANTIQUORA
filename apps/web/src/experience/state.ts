/**
 * The single source of truth for the cinematic scene. GSAP's scroll-scrubbed timeline
 * tweens these numbers; the WebGL frame loop only reads them. Nothing here triggers a
 * React render, so scrolling never re-renders the component tree.
 */
export interface SceneState {
  // Camera
  camX: number;
  camY: number;
  camZ: number;
  lookY: number;
  // Scene 1–2: the relic and its rings
  relicScale: number;
  relicY: number;
  ringSpread: number;
  ringFlat: number; // 0 = free orbits, 1 = rings settle around the product orbit
  ringOpacity: number;
  dustRush: number; // particles streaming past the camera
  fragmentSpread: number;
  // Scene 3: product orbit
  orbit: number; // 0 → 1 objects arrive
  angle: number; // active index as a continuous value
  // Scene 4: transition
  focus: number; // active object grows toward the camera
  temple: number; // 0 → 1 switch to the chamber (hidden behind the moonlight veil)
  // Scene 5: chamber
  travel: number; // 0 → 1 camera dolly through the nave
}

export const initialState = (): SceneState => ({
  camX: 0,
  camY: 0.35,
  camZ: 9.5,
  lookY: 0.15,
  relicScale: 1,
  relicY: 0,
  ringSpread: 1,
  ringFlat: 0,
  ringOpacity: 1,
  dustRush: 0,
  fragmentSpread: 1,
  orbit: 0,
  angle: 0,
  focus: 0,
  temple: 0,
  travel: 0,
});

export interface OrbitProduct {
  id: string;
  slug: string;
  name: string;
  pricePaise: number;
  compareAtPaise: number | null;
  shortDescription: string;
  stock: number;
  category: { slug: string; name: string };
  period: string | null;
  image: string;
}

export interface Station {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  image: string;
  count?: number;
}
