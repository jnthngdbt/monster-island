import * as THREE from 'three';
import { nearestPoints, type Vec2 } from '../core/math';

const POOL = 3;

/** Dégradé radial doux, dessiné une fois : sert de halo additif autour des flammes. */
function glowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Un petit nombre fixe de lumières déplacées vers les feux de camp les plus proches du joueur.
 * Le nombre de lumières de la scène ne change jamais : pas de recompilation de shaders
 * quand on pose ou casse un feu, et un coût par pixel borné.
 * Chaque lumière porte un halo (sprite additif) : l'effet d'un « bloom » sans passe plein écran.
 */
export class CampfireLights {
  private lights: THREE.PointLight[] = [];
  private glows: THREE.Sprite[] = [];

  constructor(scene: THREE.Scene) {
    const map = glowTexture();
    for (let i = 0; i < POOL; i++) {
      const l = new THREE.PointLight('#ffb347', 0, 10, 1.5);
      scene.add(l);
      this.lights.push(l);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map,
          color: '#ff9a3c',
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: 0,
          fog: false,
        }),
      );
      glow.visible = false;
      scene.add(glow);
      this.glows.push(glow);
    }
  }

  /** nightK ∈ [0, 1] : 0 le jour, 1 en pleine nuit. */
  update(fires: readonly (Vec2 & { y: number })[], player: Vec2, nightK: number, time: number): void {
    const near = nearestPoints(fires, player, POOL);
    this.lights.forEach((l, i) => {
      const f = near[i];
      const glow = this.glows[i];
      glow.visible = !!f;
      if (!f) {
        l.intensity = 0;
        return;
      }
      l.position.set(f.x, f.y + 0.9, f.z);
      const flicker = 1 + Math.sin(time * 11 + i) * 0.06;
      l.intensity = (0.4 + 2.2 * nightK) * flicker;
      glow.position.set(f.x, f.y + 0.75, f.z);
      glow.scale.setScalar((2.2 + 1.6 * nightK) * flicker);
      glow.material.opacity = (0.18 + 0.45 * nightK) * flicker;
    });
  }
}
