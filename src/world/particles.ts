import * as THREE from 'three';
import { mat } from './models';

type Particle = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number; spin: number };

/** Petits éclats colorés (copeaux, cailloux, « pouf »). Jamais rouges. */
export class Particles {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

  constructor(private scene: THREE.Scene) {}

  burst(
    pos: { x: number; y: number; z: number },
    color: string,
    count = 8,
    speed = 3,
    opts: { size?: number; life?: number; up?: number } = {},
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool.pop() ?? this.create();
      p.mesh.material = mat(color);
      p.mesh.position.set(pos.x, pos.y, pos.z);
      p.mesh.userData.size = opts.size ?? 1;
      p.mesh.scale.setScalar(opts.size ?? 1);
      p.mesh.visible = true;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      p.vel.set(Math.cos(a) * r, (opts.up ?? 3) + Math.random() * 2, Math.sin(a) * r);
      p.maxLife = p.life = (opts.life ?? 0.7) * (0.7 + Math.random() * 0.6);
      p.spin = (Math.random() - 0.5) * 12;
      this.active.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.y += p.spin * dt;
      const k = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.05, k) * (p.mesh.userData.size ?? 1));
    }
  }

  private create(): Particle {
    const mesh = new THREE.Mesh(this.geo, mat('#ffffff'));
    mesh.visible = false;
    this.scene.add(mesh);
    return { mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1, spin: 0 };
  }
}
