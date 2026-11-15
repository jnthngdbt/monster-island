import type { Cost } from '../data/items';
import type { MonsterKind } from '../data/monsters';

type Handler<T> = (payload: T) => void;

/** Petit bus d'événements typé. */
export class EventBus<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(key: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof E>(key: K, payload: E[K]): void {
    const set = this.handlers.get(key);
    if (!set) return;
    for (const fn of [...set]) (fn as Handler<E[K]>)(payload);
  }
}

/** Événements du jeu (enrichis au fil des fonctionnalités). */
export type GameEvents = {
  toast: { text: string };
  itemsChanged: Record<string, never>;
  harvested: { x: number; y: number; z: number; gained: Cost };
  playerDamaged: { amount: number };
  monsterDefeated: { kind: MonsterKind; x: number; z: number };
  structurePlaced: { key: string };
  nightStarted: { day: number };
  dayStarted: { day: number };
};
