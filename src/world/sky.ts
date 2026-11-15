import * as THREE from 'three';
import type { DayNightClock } from '../core/dayNight';
import { clamp } from '../core/math';
import type { RenderContext } from '../engine/renderer';

const HORIZON_DAY = new THREE.Color('#bfe8ff');
const HORIZON_DAWN = new THREE.Color('#ffb27a');
const HORIZON_NIGHT = new THREE.Color('#2a3a78');
const ZENITH_DAY = new THREE.Color('#3f9be8');
const ZENITH_DAWN = new THREE.Color('#6a7fd0');
const ZENITH_NIGHT = new THREE.Color('#111a4a');
const SUN = new THREE.Color('#ffe9c4');
const SUN_LOW = new THREE.Color('#ffb070');
const MOON = new THREE.Color('#9fb4ff');
const HEMI_DAY = new THREE.Color('#cfe6ff');
const HEMI_NIGHT = new THREE.Color('#7f95e8');
const HEMI_INTENSITY_DAY = 0.85;
const HEMI_INTENSITY_NIGHT = 0.55;

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const DOME_FRAG = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float sunStrength;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col = mix(horizon, zenith, pow(max(d.y, 0.0), 0.55));
  float s = max(dot(d, sunDir), 0.0);
  float disc = smoothstep(0.9978, 0.9982, s);
  float glow = pow(s, 64.0) * 0.45 + pow(s, 6.0) * 0.12;
  col += sunColor * (disc * 1.6 + glow) * sunStrength;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Ciel, soleil/lune, étoiles et brouillard selon l'heure. Nuit bleutée, jamais noire. */
export class Sky {
  /** Direction (normalisée) de la source de lumière principale. */
  readonly lightDir = new THREE.Vector3(0.5, 0.8, 0.3).normalize();
  private stars: THREE.Points;
  private dome: THREE.Mesh;
  private uniforms = {
    zenith: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color() },
    sunStrength: { value: 1 },
  };

  constructor(private ctx: RenderContext) {
    // Dôme en dégradé, centré sur la caméra : un seul appel de dessin, sans test de profondeur.
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(500, 24, 12),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: DOME_VERT,
        fragmentShader: DOME_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    );
    this.dome.renderOrder = -1;
    this.dome.frustumCulled = false;
    ctx.scene.add(this.dome);

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
    const nightK = night ? clamp(-e / 0.3, 0, 1) : 0;
    const dayK = night ? 0 : clamp(e / 0.3, 0, 1);

    // Couleurs du ciel : l'aube/crépuscule sert de pivot entre le jour et la nuit.
    const horizon = this.uniforms.horizon.value;
    const zenith = this.uniforms.zenith.value;
    if (!night) {
      horizon.copy(HORIZON_DAWN).lerp(HORIZON_DAY, dayK);
      zenith.copy(ZENITH_DAWN).lerp(ZENITH_DAY, dayK);
    } else {
      horizon.copy(HORIZON_DAWN).lerp(HORIZON_NIGHT, nightK);
      zenith.copy(ZENITH_DAWN).lerp(ZENITH_NIGHT, nightK);
    }
    // Le brouillard prend la couleur de l'horizon : le lointain se fond dans le ciel.
    (this.ctx.scene.background as THREE.Color).copy(horizon);
    (this.ctx.scene.fog as THREE.Fog).color.copy(horizon);

    // Soleil le jour, lune la nuit : arc d'est en ouest.
    const arc = clock.phaseProgress * Math.PI;
    const elev = Math.max(0.25, Math.sin(arc));
    this.lightDir.set(Math.cos(arc), elev, 0.35).normalize();

    const sun = this.ctx.sun;
    const hemi = this.ctx.hemi;
    if (night) sun.color.copy(MOON);
    else sun.color.copy(SUN_LOW).lerp(SUN, dayK);
    sun.intensity = night ? 0.4 + 0.2 * nightK : 0.9 + 1.3 * dayK;
    hemi.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, nightK);
    hemi.intensity = HEMI_INTENSITY_DAY + (HEMI_INTENSITY_NIGHT - HEMI_INTENSITY_DAY) * nightK;

    // Disque du soleil/lune : s'efface au changement de phase (l'astre saute d'ouest en est).
    this.uniforms.sunDir.value.copy(this.lightDir);
    this.uniforms.sunColor.value.copy(sun.color);
    this.uniforms.sunStrength.value = night ? nightK * 0.9 : dayK;
    this.dome.position.copy(this.ctx.camera.position);

    const mat = this.stars.material as THREE.PointsMaterial;
    mat.opacity = nightK;
    this.stars.visible = nightK > 0.01;
    this.stars.position.set(center.x, 0, center.z);
  }
}
