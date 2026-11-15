import type * as THREE from 'three';
import type { CollisionWorld } from '../core/collision';
import { AttackTimer, selectTarget } from '../core/combat';
import { EventBus, type GameEvents } from '../core/events';
import { Inventory } from '../core/inventory';
import { FixedStepper } from '../core/loop';
import { createRng, type Rng } from '../core/rng';
import { createTerrain, type Terrain } from '../core/terrain';
import { WORLD_SEED } from '../data/balance';
import { ITEMS, type Cost, type ItemId } from '../data/items';
import { bestWeapon, WEAPONS, type WeaponId } from '../data/weapons';
import { Harvestables } from '../entities/Harvestables';
import { Player } from '../entities/Player';
import { ThirdPersonCamera } from '../entities/ThirdPersonCamera';
import { FloatingText } from '../ui/floatingText';
import { Hud } from '../ui/hud';
import { createOverlay, type Overlay } from '../ui/screens';
import { Particles } from '../world/particles';
import { createTerrainMesh } from '../world/terrainMesh';
import { createWater, type Water } from '../world/water';
import { InputState } from './input';
import { createRenderContext, type RenderContext } from './renderer';

const HARVEST_COLORS: Record<ItemId, string> = {
  wood: '#c08a52',
  stone: '#a7a9ac',
  berry: '#4a62d8',
  jelly: '#6fe36f',
  stick: '#8a5a33',
  stone_sword: '#c9ccd1',
  jelly_potion: '#9be07a',
};

/** État du monde et boucle de jeu. Ordre des mises à jour : voir step(). */
export class Game {
  readonly ctx: RenderContext;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly terrain: Terrain;
  readonly events = new EventBus<GameEvents>();
  readonly input = new InputState();
  readonly player = new Player();
  readonly cam: ThirdPersonCamera;
  readonly inventory = new Inventory({ stick: 1 });
  readonly harvestables: Harvestables;
  readonly particles: Particles;
  readonly floaters: FloatingText;
  readonly hud: Hud;
  readonly rng: Rng;
  readonly debug: boolean;
  weapon: WeaponId = 'stick';
  /** Temps simulé (s). */
  now = 0;
  private attackTimer = new AttackTimer(WEAPONS.stick.cooldown);
  private stepper = new FixedStepper();
  private water: Water;
  private lastFrame = 0;
  private pauseOverlay: Overlay;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly ui: HTMLElement,
  ) {
    this.debug = new URLSearchParams(window.location.search).get('debug') === '1';
    this.rng = createRng(WORLD_SEED + 1);
    this.ctx = createRenderContext(canvas);
    this.scene = this.ctx.scene;
    this.camera = this.ctx.camera;
    this.terrain = createTerrain(WORLD_SEED);
    this.scene.add(createTerrainMesh(this.terrain));
    this.water = createWater();
    this.scene.add(this.water.mesh);
    this.harvestables = new Harvestables(this.terrain, createRng(WORLD_SEED + 2), this.scene);
    this.particles = new Particles(this.scene);

    this.player.teleport(this.terrain.spawnPoint.x, this.terrain.spawnPoint.z, this.terrain);
    this.player.yaw = Math.PI; // regarde vers l'intérieur de l'île
    this.player.setWeapon(this.weapon);
    this.scene.add(this.player.mesh);
    this.cam = new ThirdPersonCamera(this.camera);
    this.cam.yaw = Math.PI;

    this.hud = new Hud(ui, this.events);
    this.floaters = new FloatingText(ui);
    this.inventory.onChange = () => {
      this.refreshWeapon();
      this.events.emit('itemsChanged', {});
    };

    this.input.attachDom(canvas);
    this.pauseOverlay = createOverlay(
      ui,
      '<div class="panel"><h1>Pause</h1><p>Clique pour continuer</p></div>',
    );
    this.pauseOverlay.el.addEventListener('click', () => this.input.requestLock(canvas));
    canvas.addEventListener('click', () => this.input.requestLock(canvas));
  }

  get paused(): boolean {
    return !this.input.locked;
  }

  start(): void {
    this.lastFrame = performance.now();
    this.ctx.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /** Donne des objets au joueur, avec un petit texte flottant. */
  give(gained: Cost, at?: { x: number; y: number; z: number }): void {
    this.inventory.addAll(gained);
    if (!at) return;
    const text = (Object.entries(gained) as [ItemId, number][])
      .map(([id, n]) => `+${n} ${ITEMS[id].icon}`)
      .join('  ');
    if (text) this.floaters.spawn(text, at);
  }

  collisionWorld(): CollisionWorld {
    return { circles: this.harvestables.colliders(), boxes: [] };
  }

  private frame(t: number): void {
    const realDt = Math.min((t - this.lastFrame) / 1000, 0.25);
    this.lastFrame = t;
    if (this.paused) {
      this.pauseOverlay.show();
    } else {
      this.pauseOverlay.hide();
      this.stepper.advance(realDt, (dt) => {
        this.step(dt);
        this.input.endStep();
      });
    }
    this.cam.update(this.input, this.player.position, this.terrain);
    this.followShadow();
    this.water.update(t / 1000);
    this.particles.update(this.paused ? 0 : realDt);
    this.floaters.update(realDt, this.camera);
    this.hud.update({ inventory: this.inventory, weapon: this.weapon });
    this.ctx.renderer.render(this.scene, this.camera);
  }

  /** Un pas de simulation : input → clock → player → monsters → structures → pickups → spawner. */
  private step(dt: number): void {
    this.now += dt;
    this.player.update(dt, this.now, this.input, this.cam.yaw, {
      terrain: this.terrain,
      collision: this.collisionWorld(),
    });
    this.handleAttack();
    this.harvestables.update(this.now);
  }

  private handleAttack(): void {
    if (!this.input.consumeClick(0)) return;
    if (!this.attackTimer.tryFire(this.now)) return;
    const w = WEAPONS[this.weapon];
    const p = this.player.position;
    this.player.yaw = this.cam.yaw;
    this.player.startSwing(this.now);

    const target = selectTarget(p, this.cam.yaw, this.harvestables.targets(), w.range, w.arcDeg);
    if (!target) return;
    const node = this.harvestables.get(target.id)!;
    const gained = this.harvestables.hit(target.id, w.harvestPower, this.now);
    const at = { x: node.x, y: node.y + 1.2, z: node.z };
    const item = Object.keys(gained)[0] as ItemId | undefined;
    if (item) this.particles.burst(at, HARVEST_COLORS[item], 7, 2.5);
    this.give(gained, { ...at, y: at.y + 0.8 });
    this.events.emit('harvested', { ...at, gained });
  }

  private refreshWeapon(): void {
    const best = bestWeapon(this.inventory);
    if (best === this.weapon) return;
    this.weapon = best;
    this.attackTimer = new AttackTimer(WEAPONS[best].cooldown);
    this.player.setWeapon(best);
  }

  private followShadow(): void {
    const p = this.player.position;
    const sun = this.ctx.sun;
    sun.target.position.set(p.x, p.y, p.z);
    sun.position.set(p.x + 30, p.y + 50, p.z + 15);
  }
}
