import type { Inventory } from '../core/inventory';
import { BUILDABLES, PIECE_KINDS, type PieceKind } from '../data/buildables';
import { formatCost } from '../data/items';

/** Barre des pièces en mode construction + message sous le réticule. */
export class BuildBar {
  private el: HTMLDivElement;
  private status: HTMLDivElement;
  private lastKey = '';

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'buildbar';
    this.el.style.display = 'none';
    root.appendChild(this.el);
    this.status = document.createElement('div');
    this.status.className = 'buildstatus';
    this.status.style.display = 'none';
    root.appendChild(this.status);
  }

  update(active: boolean, selected: PieceKind, inv: Inventory, status: { ok: boolean; text: string }): void {
    this.el.style.display = active ? '' : 'none';
    this.status.style.display = active ? '' : 'none';
    if (!active) return;
    const key = `${selected}|${inv.entries().join()}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.el.innerHTML =
        PIECE_KINDS.map((k, i) => {
          const d = BUILDABLES[k];
          const cls = ['piece', k === selected ? 'sel' : '', inv.has(d.cost) ? '' : 'poor'].join(' ');
          return `<div class="${cls}"><span class="num">${i + 1}</span><span class="icon">${d.icon}</span><span class="name">${d.label}</span><span class="cost">${formatCost(d.cost)}</span></div>`;
        }).join('') +
        '<div class="help">Clic : poser · R : tourner · X : démonter · B : quitter</div>';
    }
    this.status.textContent = status.text;
    this.status.classList.toggle('bad', !status.ok);
  }
}
