import * as THREE from 'three';

export type ModelPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Transformation locale de la pièce dans le modèle. */
  local: THREE.Matrix4;
  /** La pièce reste visible quand la ressource est épuisée (ex. le buisson sans baies). */
  keepWhenDepleted?: boolean;
};

export function localMatrix(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rotY = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
    new THREE.Vector3(sx, sy, sz),
  );
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const tmpWorld = new THREE.Matrix4();
const tmpOut = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();

/** Un modèle multi-pièces dessiné en InstancedMesh (une draw call par pièce). */
export class InstancedModel {
  readonly group = new THREE.Group();
  private meshes: THREE.InstancedMesh[];

  constructor(
    private parts: ModelPart[],
    count: number,
  ) {
    this.meshes = parts.map((p) => {
      const m = new THREE.InstancedMesh(p.geometry, p.material, count);
      m.castShadow = true;
      m.receiveShadow = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(m);
      return m;
    });
  }

  /** depleted : seules les pièces keepWhenDepleted restent visibles. */
  set(
    i: number,
    pos: { x: number; y: number; z: number },
    rotY: number,
    scale: number,
    depleted = false,
    tilt = { x: 0, z: 0 },
  ): void {
    e.set(tilt.x, rotY, tilt.z);
    q.setFromEuler(e);
    tmpWorld.compose(v.set(pos.x, pos.y, pos.z), q, s.set(scale, scale, scale));
    this.parts.forEach((p, k) => {
      const mesh = this.meshes[k];
      if (scale <= 0 || (depleted && !p.keepWhenDepleted)) mesh.setMatrixAt(i, ZERO);
      else mesh.setMatrixAt(i, tmpOut.multiplyMatrices(tmpWorld, p.local));
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  /** Teinte multipliée à la couleur de chaque pièce de l'instance (variété sans appel de dessin en plus). */
  tint(i: number, color: THREE.Color): void {
    for (const m of this.meshes) {
      m.setColorAt(i, color);
      m.instanceColor!.needsUpdate = true;
    }
  }

  finalize(): void {
    for (const m of this.meshes) m.computeBoundingSphere();
  }
}
