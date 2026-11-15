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
  const hair = part(new THREE.IcosahedronGeometry(0.44, 1), c.hair, 0, 1.52, -0.06);
  hair.scale.set(1, 0.7, 1);
  body.add(hair);
  const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
  body.add(part(eyeGeo, '#1d1d1d', 0.14, 1.42, 0.37));
  body.add(part(eyeGeo, '#1d1d1d', -0.14, 1.42, 0.37));
  // Sac à dos
  body.add(part(new THREE.BoxGeometry(0.4, 0.45, 0.2), c.backpack, 0, 0.8, -0.26));

  return { group, body, leftLeg, rightLeg, leftArm, rightArm, rightHand };
}
