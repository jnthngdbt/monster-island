import type * as THREE from 'three';
import { EventBus, type GameEvents } from '../core/events';
import { FixedStepper } from '../core/loop';
import { createTerrain, type Terrain } from '../core/terrain';
import { WORLD_SEED } from '../data/balance';
import { Player } from '../entities/Player';
import { ThirdPersonCamera } from '../entities/ThirdPersonCamera';
import { createOverlay, type Overlay } from '../ui/screens';
import { createTerrainMesh } from '../world/terrainMesh';
import { createWater, type Water } from '../world/water';
import { InputState } from './input';
import { createRenderContext, type RenderContext } from './renderer';

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
  readonly debug: boolean;
  /** Temps simulé (s). */
  now = 0;
  private stepper = new FixedStepper();
  private water: Water;
  private lastFrame = 0;
  private pauseOverlay: Overlay;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly ui: HTMLElement,
  ) {
    this.debug = new URLSearchParams(window.location.search).get('debug') === '1';
    this.ctx = createRenderContext(canvas);
    this.scene = this.ctx.scene;
    this.camera = this.ctx.camera;
    this.terrain = createTerrain(WORLD_SEED);
    this.scene.add(createTerrainMesh(this.terrain));
    this.water = createWater();
    this.scene.add(this.water.mesh);

    this.player.teleport(this.terrain.spawnPoint.x, this.terrain.spawnPoint.z, this.terrain);
    this.player.yaw = Math.PI; // regarde vers l'intérieur de l'île
    this.scene.add(this.player.mesh);
    this.cam = new ThirdPersonCamera(this.camera);
    this.cam.yaw = Math.PI;

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

  private frame(t: number): void {
    const realDt = (t - this.lastFrame) / 1000;
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
    this.ctx.renderer.render(this.scene, this.camera);
  }

  /** Un pas de simulation : input → clock → player → monsters → structures → pickups → spawner. */
  private step(dt: number): void {
    this.now += dt;
    this.player.update(dt, this.input, this.cam.yaw, { terrain: this.terrain });
  }

  private followShadow(): void {
    const p = this.player.position;
    const sun = this.ctx.sun;
    sun.target.position.set(p.x, p.y, p.z);
    sun.position.set(p.x + 30, p.y + 50, p.z + 15);
  }
}
