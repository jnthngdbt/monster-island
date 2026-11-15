import type * as THREE from 'three';
import type { Circle } from '../core/collision';
import type { Target } from '../core/combat';
import type { Cost } from '../core/inventory';
import type { Rng } from '../core/rng';
import type { SavedNode } from '../core/save';
import { scatter } from '../core/scatter';
import type { Terrain } from '../core/terrain';
import { HARVESTABLES, type HarvestKind } from '../data/harvestables';
import { InstancedModel } from '../world/instanced';
import { harvestableParts } from '../world/vegetation';

export type HarvestNode = {
  id: string;
  kind: HarvestKind;
  x: number;
  y: number;
  z: number;
  index: number;
  rotY: number;
  scale: number;
  hitsLeft: number;
  respawnAt: number | null;
  shakeUntil: number;
  growStart: number;
};

const KINDS: HarvestKind[] = ['tree', 'rock', 'bush'];
const RETRY_SEC = 15;

/** Arbres, rochers et buissons de l'île. */
export class Harvestables {
  readonly nodes: HarvestNode[] = [];
  private byId = new Map<string, HarvestNode>();
  private models = new Map<HarvestKind, InstancedModel>();
  private animating = new Set<HarvestNode>();

  constructor(terrain: Terrain, rng: Rng, scene: THREE.Scene) {
    const placed: { x: number; z: number }[] = [];
    for (const kind of KINDS) {
      const pts = scatter(terrain, rng, kind, placed);
      placed.push(...pts);
      const model = new InstancedModel(harvestableParts(kind), pts.length);
      this.models.set(kind, model);
      scene.add(model.group);
      pts.forEach((p, index) => {
        const node: HarvestNode = {
          id: `${kind}-${index}`,
          kind,
          x: p.x,
          y: terrain.heightAt(p.x, p.z) - 0.05,
          z: p.z,
          index,
          rotY: rng.range(0, Math.PI * 2),
          scale: kind === 'tree' ? rng.range(0.85, 1.3) : rng.range(0.8, 1.15),
          hitsLeft: HARVESTABLES[kind].hits,
          respawnAt: null,
          shakeUntil: 0,
          growStart: -Infinity,
        };
        this.nodes.push(node);
        this.byId.set(node.id, node);
        this.draw(node, 0);
      });
      model.finalize();
    }
  }

  get(id: string): HarvestNode | undefined {
    return this.byId.get(id);
  }

  /** Un coup sur la ressource. Retourne ce que le joueur gagne. */
  hit(id: string, power: number, now: number): Cost {
    const n = this.byId.get(id);
    if (!n || n.respawnAt !== null) return {};
    const def = HARVESTABLES[n.kind];
    n.hitsLeft -= 1;
    n.shakeUntil = now + 0.25;
    if (n.hitsLeft <= 0) n.respawnAt = now + def.respawnSec;
    this.animating.add(n);
    return { [def.item]: def.yieldPerHit * power };
  }

  /**
   * Repousse les ressources épuisées. `blocked` : une construction occupe la place —
   * la repousse est alors remise à plus tard (jamais d'arbre à travers un plancher).
   */
  update(now: number, blocked: (c: Circle) => boolean = () => false): void {
    for (const n of this.nodes) {
      if (n.respawnAt !== null && now >= n.respawnAt) {
        if (blocked({ x: n.x, z: n.z, r: HARVESTABLES[n.kind].radius * n.scale })) {
          n.respawnAt = now + RETRY_SEC;
          continue;
        }
        n.respawnAt = null;
        n.hitsLeft = HARVESTABLES[n.kind].hits;
        n.growStart = now;
        this.animating.add(n);
      }
    }
    for (const n of this.animating) {
      this.draw(n, now);
      if (now > n.shakeUntil && now - n.growStart > 1) this.animating.delete(n);
    }
  }

  /** Ressources entamées ou épuisées (les autres se recréent depuis la graine du monde). */
  snapshot(): SavedNode[] {
    return this.nodes
      .filter((n) => n.respawnAt !== null || n.hitsLeft < HARVESTABLES[n.kind].hits)
      .map((n) => ({ id: n.id, hitsLeft: n.hitsLeft, respawnAt: n.respawnAt }));
  }

  /** Rétablit des ressources sauvegardées, sans animation. Les id inconnus sont ignorés. */
  restore(saved: SavedNode[]): void {
    for (const s of saved) {
      const n = this.byId.get(s.id);
      if (!n) continue;
      n.hitsLeft = s.hitsLeft;
      n.respawnAt = s.respawnAt;
      n.shakeUntil = 0;
      n.growStart = -Infinity;
      this.animating.delete(n);
      this.draw(n, 0);
    }
  }

  targets(): Target[] {
    return this.nodes
      .filter((n) => n.respawnAt === null)
      .map((n) => ({ id: n.id, x: n.x, z: n.z, radius: HARVESTABLES[n.kind].radius * n.scale }));
  }

  /** Les buissons ne bloquent pas le passage. */
  colliders(): Circle[] {
    return this.nodes
      .filter((n) => n.kind !== 'bush' && n.respawnAt === null)
      .map((n) => ({ x: n.x, z: n.z, r: HARVESTABLES[n.kind].radius * n.scale }));
  }

  private draw(n: HarvestNode, now: number): void {
    const model = this.models.get(n.kind)!;
    const depleted = n.respawnAt !== null;
    const gone = depleted && n.kind !== 'bush';
    const grow = Math.min(1, Math.max(0, now - n.growStart));
    const growScale = grow < 1 ? 0.2 + 0.8 * (1 - (1 - grow) ** 3) : 1;
    const shaking = now < n.shakeUntil;
    const wobble = shaking ? Math.sin(now * 60) * 0.06 : 0;
    model.set(n.index, n, n.rotY, gone ? 0 : n.scale * growScale, depleted, { x: wobble, z: wobble * 0.6 });
  }
}
