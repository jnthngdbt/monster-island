import * as THREE from 'three';
import type { DayNightClock } from '../core/dayNight';
import { clamp } from '../core/math';
import type { RenderContext } from '../engine/renderer';

const DAY = new THREE.Color('#8fd3ff');
const DAWN = new THREE.Color('#ffb27a');
const NIGHT = new THREE.Color('#1e2a5a');
const SUN = new THREE.Color('#fff4d6');
const MOON = new THREE.Color('#9fb4ff');
const HEMI_DAY = new THREE.Color('#ffffff');
const HEMI_NIGHT = new THREE.Color('#7f95e8');

/** Ciel, soleil/lune, étoiles et brouillard selon l'heure. Nuit bleutée, jamais noire. */
export class Sky {
  /** Direction (normalisée) de la source de lumière principale. */
  readonly lightDir = new THREE.Vector3(0.5, 0.8, 0.3).normalize();
  private stars: THREE.Points;
  private color = new THREE.Color();

  constructor(private ctx: RenderContext) {
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Points sur une demi-sphère lointaine.
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.45 * Math.PI;
      pos[i * 3] = Math.cos(u) * Math.cos(v) * 400;
      pos[i * 3 + 1] = Math.sin(v) * 400 + 20;
      pos[i * 3 + 2] = Math.sin(u) * Math.cos(v) * 400;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }),
    );
    ctx.scene.add(this.stars);
  }

  update(clock: DayNightClock, center: THREE.Vector3): void {
    const e = clock.sunElevation;
    const night = clock.isNight;

    // Couleur du ciel
    if (!night) {
      const k = clamp(e / 0.3, 0, 1);
      this.color.copy(DAWN).lerp(DAY, k);
    } else {
      const k = clamp(-e / 0.3, 0, 1);
      this.color.copy(DAWN).lerp(NIGHT, k);
    }
    (this.ctx.scene.background as THREE.Color).copy(this.color);
    (this.ctx.scene.fog as THREE.Fog).color.copy(this.color);

    // Soleil le jour, lune la nuit : arc d'est en ouest.
    const arc = clock.phaseProgress * Math.PI;
    const elev = Math.max(0.25, Math.sin(arc));
    this.lightDir.set(Math.cos(arc), elev, 0.35).normalize();

    const sun = this.ctx.sun;
    const hemi = this.ctx.hemi;
    const nightK = night ? clamp(-e / 0.3, 0, 1) : 0;
    const dayK = night ? 0 : clamp(e / 0.3, 0, 1);
    sun.color.copy(night ? MOON : SUN);
    sun.intensity = night ? 0.35 + 0.15 * nightK : 0.5 + 1.3 * dayK;
    hemi.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, nightK);
    hemi.intensity = 1.1 - 0.6 * nightK;

    const mat = this.stars.material as THREE.PointsMaterial;
    mat.opacity = nightK;
    this.stars.visible = nightK > 0.01;
    this.stars.position.set(center.x, 0, center.z);
  }
}
