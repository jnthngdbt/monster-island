import { canCraft, craft } from '../core/crafting';
import type { Inventory } from '../core/inventory';
import { ITEMS, type ItemId } from '../data/items';
import { RECIPE_IDS, RECIPES, type RecipeId, type Station } from '../data/recipes';

export type CraftPanelDeps = {
  inventory: Inventory;
  nearStation: (s: Station) => boolean;
  onCrafted: (id: RecipeId) => void;
  onClose: () => void;
};

const STATION_LABEL: Record<Station, string> = { workbench: "Près d'un atelier 🛠️" };

/** Panneau de fabrication (touche C). */
export class CraftPanel {
  readonly el: HTMLDivElement;
  private list: HTMLDivElement;
  open = false;

  constructor(
    root: HTMLElement,
    private deps: CraftPanelDeps,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'overlay craft';
    this.el.style.display = 'none';
    this.el.innerHTML = `
      <div class="panel">
        <h1>Fabrication</h1>
        <div class="recipes"></div>
        <button class="big close">Fermer (C)</button>
      </div>`;
    root.appendChild(this.el);
    this.list = this.el.querySelector('.recipes')!;
    this.el.querySelector('.close')!.addEventListener('click', () => this.close());
    this.list.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-recipe]');
      if (!btn) return;
      const id = btn.dataset.recipe as RecipeId;
      if (craft(id, this.deps.inventory, this.deps.nearStation).ok) this.deps.onCrafted(id);
      this.render();
    });
    window.addEventListener('keydown', (e) => {
      if (this.open && (e.code === 'KeyC' || e.code === 'Escape')) this.close();
    });
  }

  show(): void {
    this.open = true;
    this.render();
    this.el.style.display = '';
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.style.display = 'none';
    this.deps.onClose();
  }

  private render(): void {
    const inv = this.deps.inventory;
    this.list.innerHTML = RECIPE_IDS.map((id) => {
      const r = RECIPES[id];
      const check = canCraft(id, inv, this.deps.nearStation);
      const cost = (Object.entries(r.cost) as [ItemId, number][])
        .map(([item, n]) => {
          const ok = inv.count(item) >= n;
          return `<span class="cost ${ok ? 'ok' : 'bad'}">${n} ${ITEMS[item].icon}</span>`;
        })
        .join(' ');
      const station = r.station
        ? `<div class="station ${check.ok || check.reason !== 'station' ? 'ok' : 'bad'}">${STATION_LABEL[r.station]}</div>`
        : '';
      return `
        <div class="recipe">
          <div class="out">${ITEMS[r.output].icon}</div>
          <div class="info"><b>${r.label}</b><div>${cost}</div>${station}</div>
          <button class="big" data-recipe="${id}" ${check.ok ? '' : 'disabled'}>Fabriquer</button>
        </div>`;
    }).join('');
  }
}
