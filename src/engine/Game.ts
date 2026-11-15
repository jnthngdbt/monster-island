import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EventBus, type GameEvents } from '../core/events';
import { FixedStepper } from '../core/loop';
import { createTerrain, type Terrain } from '../core/terrain';
import { WORLD_SEED } from '../data/balance';
import { createTerrainMesh } from '../world/terrainMesh';
import { createWater, type Water } from '../world/water';
import { createRenderContext, type RenderContext } from './renderer';

/** État du monde et boucle de jeu. */
export class Game {
  readonly ctx: RenderContext;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly terrain: Terrain;
  readonly events = new EventBus<GameEvents>();
  readonly debug: boolean;
  /** Temps simulé (s). */
  now = 0;
  private stepper = new FixedStepper();
  private water: Water;
  private controls: OrbitControls;
  private lastFrame = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.debug = new URLSearchParams(window.location.search).get('debug') === '1';
    this.ctx = createRenderContext(canvas);
    this.scene = this.ctx.scene;
    this.camera = this.ctx.camera;
    this.terrain = createTerrain(WORLD_SEED);
    this.scene.add(createTerrainMesh(this.terrain));
    this.water = createWater();
    this.scene.add(this.water.mesh);

    this.camera.position.set(0, 80, 140);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0, 0);
  }

  start(): void {
    this.lastFrame = performance.now();
    this.ctx.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private frame(t: number): void {
    const realDt = (t - this.lastFrame) / 1000;
    this.lastFrame = t;
    this.stepper.advance(realDt, (dt) => this.step(dt));
    this.water.update(this.now);
    this.controls.update();
    this.ctx.renderer.render(this.scene, this.camera);
  }

  private step(dt: number): void {
    this.now += dt;
  }
}
