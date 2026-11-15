import * as THREE from 'three';
import { PALETTE } from '../data/palette';

const matCache = new Map<string, THREE.MeshLambertMaterial>();

/** Matériau low-poly partagé par couleur. */
export function mat(
  color: string,
  opts: { transparent?: boolean; opacity?: number; emissive?: string } = {},
): THREE.MeshLambertMaterial {
  const key = `${color}|${opts.transparent ?? false}|${opts.opacity ?? 1}|${opts.emissive ?? ''}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? '#000000',
    });
    matCache.set(key, m);
  }
  return m;
}

export function part(geo: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Arme tenue en main (pointe vers +Z quand le bras est levé devant). */
export function createWeaponModel(id: 'stick' | 'stone_sword'): THREE.Group {
  const g = new THREE.Group();
  if (id === 'stick') {
    const stick = part(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 5), PALETTE.trunk, 0, -0.35, 0.1);
    stick.rotation.x = Math.PI / 2.4;
    g.add(stick);
  } else {
    const blade = new THREE.Group();
    blade.add(part(new THREE.BoxGeometry(0.08, 0.25, 0.08), PALETTE.woodDark, 0, 0, 0));
    blade.add(part(new THREE.BoxGeometry(0.3, 0.06, 0.1), '#6d6f73', 0, -0.14, 0));
    blade.add(part(new THREE.BoxGeometry(0.14, 0.75, 0.05), '#c9ccd1', 0, -0.55, 0));
    blade.add(part(new THREE.ConeGeometry(0.07, 0.15, 4), '#c9ccd1', 0, -1.0, 0));
    blade.children[3].rotation.x = Math.PI;
    blade.rotation.x = -Math.PI / 2.4 + Math.PI;
    blade.position.set(0, -0.05, 0.05);
    g.add(blade);
  }
  return g;
}

export type SlimeModel = { group: THREE.Group; body: THREE.Group; skin: THREE.Mesh };

/** Slime gélatineux et mignon : gros yeux, reflet. Regarde vers +Z. */
export function createSlimeModel(color: string, glow = false): SlimeModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const skinMat = new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    transparent: true,
    opacity: 0.85,
    emissive: glow ? color : '#000000',
    emissiveIntensity: glow ? 0.45 : 0,
  });
  const skin = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), skinMat);
  skin.scale.set(1, 0.8, 1);
  skin.position.y = 0.48;
  skin.castShadow = true;
  body.add(skin);
  // Noyau plus foncé visible à travers la gelée.
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), mat(glow ? '#5a3fd1' : '#3fae4f'));
  core.position.set(0, 0.42, -0.05);
  body.add(core);
  const eyeWhite = new THREE.SphereGeometry(0.13, 8, 8);
  const pupil = new THREE.SphereGeometry(0.07, 6, 6);
  for (const sx of [-1, 1]) {
    body.add(part(eyeWhite, '#ffffff', 0.18 * sx, 0.62, 0.45));
    body.add(part(pupil, '#1d1d1d', 0.18 * sx, 0.63, 0.55));
  }
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), mat('#ffffff', { transparent: true, opacity: 0.7 }));
  shine.position.set(-0.25, 0.8, 0.25);
  body.add(shine);
  return { group, body, skin };
}

export type PlayerModel = {
  group: THREE.Group;
  body: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  rightHand: THREE.Group;
};

/** Petit aventurier chibi (grosse tête), regarde vers +Z. */
export function createPlayerModel(): PlayerModel {
  const c = PALETTE.player;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const limb = (color: string, x: number, y: number, len: number, w: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(part(new THREE.BoxGeometry(w, len, w), color, 0, -len / 2, 0));
    body.add(pivot);
    return pivot;
  };

  const leftLeg = limb(c.pants, 0.13, 0.5, 0.5, 0.18);
  const rightLeg = limb(c.pants, -0.13, 0.5, 0.5, 0.18);
  body.add(part(new THREE.BoxGeometry(0.5, 0.55, 0.32), c.shirt, 0, 0.75, 0));
  const leftArm = limb(c.skin, 0.33, 0.98, 0.45, 0.14);
  const rightArm = limb(c.skin, -0.33, 0.98, 0.45, 0.14);
  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.45, 0.05);
  rightArm.add(rightHand);

  // Tête
  body.add(part(new THREE.IcosahedronGeometry(0.42, 1), c.skin, 0, 1.4, 0));
  // Assez grand pour couvrir les sommets du crâne (sinon la peau perce les facettes).
  const hair = part(new THREE.IcosahedronGeometry(0.47, 1), c.hair, 0, 1.54, -0.06);
  hair.scale.set(1, 0.72, 1);
  body.add(hair);
  const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
  body.add(part(eyeGeo, '#1d1d1d', 0.14, 1.42, 0.37));
  body.add(part(eyeGeo, '#1d1d1d', -0.14, 1.42, 0.37));
  // Sac à dos
  body.add(part(new THREE.BoxGeometry(0.4, 0.45, 0.2), c.backpack, 0, 0.8, -0.26));

  return { group, body, leftLeg, rightLeg, leftArm, rightArm, rightHand };
}
