import * as THREE from 'three';

type Floater = { el: HTMLDivElement; pos: THREE.Vector3; age: number };

const LIFE = 1.1;
const v = new THREE.Vector3();

/** Petits textes « +1 🪵 » qui montent au-dessus d'un point du monde. */
export class FloatingText {
  private items: Floater[] = [];

  constructor(private root: HTMLElement) {}

  spawn(text: string, pos: { x: number; y: number; z: number }, color = '#ffffff'): void {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.color = color;
    this.root.appendChild(el);
    this.items.push({ el, pos: new THREE.Vector3(pos.x, pos.y, pos.z), age: 0 });
  }

  update(dt: number, camera: THREE.Camera): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.age += dt;
      if (f.age >= LIFE) {
        f.el.remove();
        this.items.splice(i, 1);
        continue;
      }
      v.copy(f.pos);
      v.y += f.age * 1.2;
      v.project(camera);
      const visible = v.z < 1;
      f.el.style.display = visible ? '' : 'none';
      f.el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      f.el.style.opacity = String(1 - Math.max(0, f.age - LIFE * 0.6) / (LIFE * 0.4));
    }
  }
}
