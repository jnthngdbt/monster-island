import * as THREE from 'three';
import type { Invalid, Placement, Rot } from '../core/buildGrid';
import type { Circle } from '../core/collision';
import type { EventBus, GameEvents } from '../core/events';
import type { Inventory } from '../core/inventory';
import { forwardFromYaw } from '../core/math';
import { BUILD_REACH, BUILDABLES, PIECE_KINDS, type PieceKind } from '../data/buildables';
import { formatCost, type Cost, type ItemId } from '../data/items';
import type { InputState } from '../engine/input';
import { BuildBar } from '../ui/buildBar';
import { createPieceModel, GHOST_BAD, GHOST_OK, setGhostMaterial } from '../world/pieces';
import type { Structures } from './Structures';

const REASONS: Record<Invalid, string> = {
  occupied: 'Case occupée',
  water: "Pas dans l'eau !",
  slope: 'Trop en pente',
  blocked: 'Quelque chose bloque',
  needsSupport: "Le toit a besoin d'un mur",
};

export type BuildDeps = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  terrainMesh: THREE.Object3D;
  structures: Structures;
  inventory: Inventory;
  events: EventBus<GameEvents>;
  obstacles: () => Circle[];
  player: () => { x: number; y: number; z: number; r: number };
  cameraYaw: () => number;
};

const raycaster = new THREE.Raycaster();
const CENTER = new THREE.Vector2(0, 0);

/** Mode construction : choisir une pièce, voir le fantôme, poser, tourner, démonter. */
export class BuildController {
  active = false;
  selected: PieceKind = 'floor';
  rot: Rot = 0;
  private ghost: THREE.Group | null = null;
  private ghostKind: PieceKind | null = null;
  private current: Placement | null = null;
  private status = { ok: true, text: '' };
  private bar: BuildBar;

  constructor(
    ui: HTMLElement,
    private d: BuildDeps,
  ) {
    this.bar = new BuildBar(ui);
  }

  /** Appelé à chaque pas de simulation. Consomme les entrées du mode construction. */
  update(input: InputState): void {
    if (input.consumePressed('KeyB')) this.setActive(!this.active);
    if (!this.active) return;
    PIECE_KINDS.forEach((k, i) => {
      if (input.consumePressed(`Digit${i + 1}`) || input.consumePressed(`Numpad${i + 1}`)) this.selected = k;
    });
    if (input.consumePressed('KeyR')) this.rot = this.rot === 0 ? 1 : 0;
    if (input.consumePressed('KeyX')) this.deconstruct();

    this.refreshGhost();
    if (input.consumeClick(0)) this.place();
  }

  /** Mise à jour visuelle (chaque image). */
  render(): void {
    this.bar.update(this.active, this.selected, this.d.inventory, this.status);
  }

  setActive(on: boolean): void {
    this.active = on;
    if (!on && this.ghost) {
      this.d.scene.remove(this.ghost);
      this.ghost = null;
      this.ghostKind = null;
    }
  }

  private aimPoint(): { x: number; z: number } {
    const pl = this.d.player();
    raycaster.setFromCamera(CENTER, this.d.camera);
    const targets = [this.d.terrainMesh, ...this.d.structures.meshes()];
    const hit = raycaster.intersectObjects(targets, true)[0];
    if (!hit) {
      const f = forwardFromYaw(this.d.cameraYaw());
      return { x: pl.x + f.x * 4, z: pl.z + f.z * 4 };
    }
    const dx = hit.point.x - pl.x;
    const dz = hit.point.z - pl.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= BUILD_REACH) return { x: hit.point.x, z: hit.point.z };
    return { x: pl.x + (dx / dist) * BUILD_REACH, z: pl.z + (dz / dist) * BUILD_REACH };
  }

  private refreshGhost(): void {
    const grid = this.d.structures.grid;
    const p = grid.snap(this.selected, this.aimPoint(), this.rot);
    this.current = p;
    const v = grid.validate(p, { obstacles: this.d.obstacles(), player: this.d.player() });
    const cost = BUILDABLES[this.selected].cost;
    const affordable = this.d.inventory.has(cost);
    if (!v.ok) this.status = { ok: false, text: REASONS[v.reason] };
    else if (!affordable) this.status = { ok: false, text: `Il te manque : ${formatCost(this.d.inventory.missing(cost))}` };
    else this.status = { ok: true, text: `${BUILDABLES[this.selected].label} — ${formatCost(cost)}` };

    if (this.ghostKind !== this.selected) {
      if (this.ghost) this.d.scene.remove(this.ghost);
      this.ghost = createPieceModel(this.selected).group;
      this.ghostKind = this.selected;
      this.d.scene.add(this.ghost);
    }
    const g = this.ghost!;
    setGhostMaterial(g, this.status.ok ? GHOST_OK : GHOST_BAD);
    g.position.set(p.x, p.y + 0.02, p.z);
    g.rotation.y = p.yaw;
  }

  private place(): void {
    const p = this.current;
    if (!p) return;
    const grid = this.d.structures.grid;
    const v = grid.validate(p, { obstacles: this.d.obstacles(), player: this.d.player() });
    if (!v.ok) {
      this.d.events.emit('toast', { text: REASONS[v.reason] });
      return;
    }
    const cost = BUILDABLES[p.kind].cost;
    if (!this.d.inventory.remove(cost)) {
      this.d.events.emit('toast', { text: `Il te manque : ${formatCost(this.d.inventory.missing(cost))}` });
      return;
    }
    this.d.structures.add(p);
  }

  /** Démonte la pièce visée et rend la moitié des ressources. */
  private deconstruct(): void {
    raycaster.setFromCamera(CENTER, this.d.camera);
    const hit = raycaster.intersectObjects(this.d.structures.meshes(), true)[0];
    const key = hit?.object.userData.structureKey as string | undefined;
    if (!key || !hit) return;
    const pl = this.d.player();
    if (Math.hypot(hit.point.x - pl.x, hit.point.z - pl.z) > BUILD_REACH) return;
    const p = this.d.structures.remove(key);
    if (!p) return;
    const refund: Cost = {};
    for (const [id, n] of Object.entries(BUILDABLES[p.kind].cost) as [ItemId, number][]) {
      const back = Math.floor(n / 2);
      if (back > 0) refund[id] = back;
    }
    this.d.inventory.addAll(refund);
    const txt = formatCost(refund);
    this.d.events.emit('toast', { text: txt ? `${BUILDABLES[p.kind].label} démonté (+${txt})` : `${BUILDABLES[p.kind].label} démonté` });
  }
}
