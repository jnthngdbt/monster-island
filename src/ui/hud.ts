import type { EventBus, GameEvents } from '../core/events';
import type { Inventory } from '../core/inventory';
import { ITEMS } from '../data/items';
import { type WeaponId } from '../data/weapons';

export type HudState = {
  inventory: Inventory;
  weapon: WeaponId;
};

/** Interface en jeu : ressources, arme, réticule, messages. */
export class Hud {
  readonly el: HTMLDivElement;
  private bar: HTMLDivElement;
  private weaponEl: HTMLDivElement;
  private toasts: HTMLDivElement;
  private lastInvKey = '';
  private lastWeapon = '';

  constructor(root: HTMLElement, events: EventBus<GameEvents>) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="crosshair"></div>
      <div class="toasts"></div>
      <div class="bottom">
        <div class="resbar"></div>
        <div class="weapon"></div>
      </div>`;
    root.appendChild(this.el);
    this.bar = this.el.querySelector('.resbar')!;
    this.weaponEl = this.el.querySelector('.weapon')!;
    this.toasts = this.el.querySelector('.toasts')!;
    events.on('toast', ({ text }) => this.toast(text));
  }

  toast(text: string): void {
    // Pas deux fois le même message à l'écran.
    for (const t of this.toasts.children) if (t.textContent === text) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    this.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  update(s: HudState): void {
    const entries = s.inventory.entries().filter(([id]) => ITEMS[id].kind !== 'weapon');
    const key = entries.map(([id, n]) => `${id}:${n}`).join('|');
    if (key !== this.lastInvKey) {
      this.lastInvKey = key;
      this.bar.innerHTML = entries.length
        ? entries
            .map(
              ([id, n]) =>
                `<div class="slot" title="${ITEMS[id].label}"><span class="icon">${ITEMS[id].icon}</span><span class="count">${n}</span></div>`,
            )
            .join('')
        : '<div class="slot empty">Sac vide</div>';
    }
    if (s.weapon !== this.lastWeapon) {
      this.lastWeapon = s.weapon;
      const w = ITEMS[s.weapon];
      this.weaponEl.innerHTML = `<span class="icon">${w.icon}</span><span class="label">${w.label}</span>`;
    }
  }
}
