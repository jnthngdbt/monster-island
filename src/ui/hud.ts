import type { EventBus, GameEvents } from '../core/events';
import type { Inventory } from '../core/inventory';
import { ITEMS } from '../data/items';
import { type WeaponId } from '../data/weapons';

export type HudState = {
  inventory: Inventory;
  weapon: WeaponId;
  health: number;
  hunger: number;
  isNight: boolean;
  day: number;
  /** Progression dans la phase courante (0 → 1). */
  phase: number;
};

function bar(cls: string, icon: string): string {
  return `<div class="stat ${cls}"><span class="icon">${icon}</span><div class="track"><div class="fill"></div></div></div>`;
}

/** Interface en jeu : ressources, arme, réticule, messages. */
export class Hud {
  readonly el: HTMLDivElement;
  private bar: HTMLDivElement;
  private weaponEl: HTMLDivElement;
  private toasts: HTMLDivElement;
  /** null : rien n'est encore dessiné (un sac vide a aussi la clé ''). */
  private lastInvKey: string | null = null;
  private lastWeapon = '';

  constructor(root: HTMLElement, events: EventBus<GameEvents>) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="stats">${bar('health', '❤️')}${bar('hunger', '🍗')}</div>
      <div class="clock"><span class="icon">☀️</span><span class="label">Jour 1</span><div class="track"><div class="fill"></div></div></div>
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
    this.healthFill = this.el.querySelector('.health .fill')!;
    this.hungerFill = this.el.querySelector('.hunger .fill')!;
    this.hungerStat = this.el.querySelector('.stat.hunger')!;
    this.clock = this.el.querySelector('.clock')!;
    this.clockIcon = this.clock.querySelector('.icon')!;
    this.clockLabel = this.clock.querySelector('.label')!;
    this.clockFill = this.clock.querySelector('.fill')!;
    events.on('toast', ({ text }) => this.toast(text));
  }

  private healthFill: HTMLDivElement;
  private hungerFill: HTMLDivElement;
  private hungerStat: HTMLDivElement;
  private clock: HTMLDivElement;
  private clockIcon: HTMLSpanElement;
  private clockLabel: HTMLSpanElement;
  private clockFill: HTMLDivElement;
  private lastClock = '';

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
    this.healthFill.style.width = `${Math.round(s.health)}%`;
    this.hungerFill.style.width = `${Math.round(s.hunger)}%`;
    this.hungerStat.classList.toggle('low', s.hunger < 20);
    const clockKey = `${s.isNight}|${s.day}`;
    if (clockKey !== this.lastClock) {
      this.lastClock = clockKey;
      this.clockIcon.textContent = s.isNight ? '🌙' : '☀️';
      this.clockLabel.textContent = s.isNight ? `Nuit ${s.day}` : `Jour ${s.day}`;
      this.clock.classList.toggle('night', s.isNight);
    }
    this.clockFill.style.width = `${Math.round(s.phase * 100)}%`;
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
