import type * as THREE from 'three';
import type { CollisionWorld } from '../core/collision';
import { AttackTimer, selectTarget } from '../core/combat';
import { DayNightClock } from '../core/dayNight';
import { EventBus, type GameEvents } from '../core/events';
import { Inventory } from '../core/inventory';
import { FixedStepper } from '../core/loop';
import { createRng, type Rng } from '../core/rng';
import { createTerrain, type Terrain } from '../core/terrain';
import { AUTOSAVE_SEC, BERRY_HUNGER, POTION_HEAL, RAID_SPAWN_INTERVAL, WORLD_SEED } from '../data/balance';
import { SAVE_VERSION, SaveStore, type SaveData, type StorageLike } from '../core/save';
import { planNightSpawns, raiderCap } from '../core/spawner';
import { RECIPES, type Station } from '../data/recipes';
import { ITEM_IDS, ITEMS, type Cost, type ItemId } from '../data/items';
import { bestWeapon, WEAPONS, type WeaponId } from '../data/weapons';
import { BuildController } from '../entities/BuildController';
import { Harvestables } from '../entities/Harvestables';
import type { Monster } from '../entities/Monster';
import { Monsters } from '../entities/Monsters';
import { Player } from '../entities/Player';
import { Structures } from '../entities/Structures';
import { ThirdPersonCamera } from '../entities/ThirdPersonCamera';
import { CraftPanel } from '../ui/craftPanel';
import { FloatingText } from '../ui/floatingText';
import { Hud } from '../ui/hud';
import { createKoScreen, createPauseScreen, createTitleScreen, Hints, type KoScreen, type Overlay } from '../ui/screens';
import { applyRespawn, chooseRespawnPoint, grantGrace } from '../core/respawn';
import { Particles } from '../world/particles';
import { CampfireLights } from '../world/campfireLights';
import { createClouds, type Clouds } from '../world/clouds';
import { Sky } from '../world/sky';
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

/** localStorage peut être bloqué (lever une exception) : on joue alors sans sauvegarde. */
function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

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
  readonly monsters: Monsters;
  readonly structures: Structures;
  readonly build: BuildController;
  readonly terrainMesh: THREE.Mesh;
  readonly particles: Particles;
  readonly floaters: FloatingText;
  readonly hud: Hud;
  readonly craftPanel: CraftPanel;
  readonly rng: Rng;
  readonly clock = new DayNightClock();
  readonly sky: Sky;
  private campfireLights: CampfireLights;
  readonly debug: boolean;
  weapon: WeaponId = 'stick';
  /** Temps simulé (s). */
  now = 0;
  private attackTimer = new AttackTimer(WEAPONS.stick.cooldown);
  private nextRaidAt = Infinity;
  private stepper = new FixedStepper();
  private water: Water;
  private clouds: Clouds;
  private lastFrame = 0;
  private pauseOverlay: Overlay;
  private titleScreen: Overlay;
  private koScreen: KoScreen;
  private hints: Hints;
  /** title : écran d'accueil · playing : en jeu · ko : tombé dans les pommes. */
  state: 'title' | 'playing' | 'ko' = 'title';
  private playTime = 0;
  private store = new SaveStore(browserStorage());
  private nextSaveAt = AUTOSAVE_SEC;
  private wasPaused = true;

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
    this.terrainMesh = createTerrainMesh(this.terrain);
    this.scene.add(this.terrainMesh);
    this.water = createWater(this.terrain);
    this.scene.add(this.water.mesh);
    this.clouds = createClouds(WORLD_SEED + 4);
    this.scene.add(this.clouds.group);
    this.harvestables = new Harvestables(this.terrain, createRng(WORLD_SEED + 2), this.scene);
    this.particles = new Particles(this.scene);
    this.sky = new Sky(this.ctx);
    this.campfireLights = new CampfireLights(this.scene);
    this.monsters = new Monsters(this.scene, this.terrain, createRng(WORLD_SEED + 3), this.particles, this.events);
    this.monsters.maintainPopulation(0, this.terrain.spawnPoint);
    this.structures = new Structures(this.terrain, this.scene, this.events);

    this.player.teleport(this.terrain.spawnPoint.x, this.terrain.spawnPoint.z, this.terrain);
    this.player.yaw = Math.PI; // regarde vers l'intérieur de l'île
    this.player.setWeapon(this.weapon);
    this.scene.add(this.player.mesh);
    this.cam = new ThirdPersonCamera(this.camera);
    this.cam.yaw = Math.PI;

    this.hud = new Hud(ui, this.events);
    this.build = new BuildController(ui, {
      scene: this.scene,
      camera: this.camera,
      terrainMesh: this.terrainMesh,
      structures: this.structures,
      inventory: this.inventory,
      events: this.events,
      obstacles: () => this.harvestables.colliders(),
      player: () => ({ x: this.player.position.x, y: this.player.position.y, z: this.player.position.z, r: this.player.radius }),
      cameraYaw: () => this.cam.yaw,
    });
    this.floaters = new FloatingText(ui);
    this.inventory.onChange = () => {
      this.refreshWeapon();
      this.events.emit('itemsChanged', {});
    };

    this.input.attachDom(canvas);
    this.input.onFallback = () => {
      document.body.classList.add('no-pointer-lock');
      this.events.emit('toast', { text: '🖱️ Clic droit + glisser pour regarder' });
    };
    this.pauseOverlay = createPauseScreen(ui, () => this.input.requestLock(canvas));
    const saved = this.store.load();
    const begin = () => {
      this.state = 'playing';
      this.titleScreen.hide();
      this.input.requestLock(canvas);
    };
    this.titleScreen = createTitleScreen(ui, {
      saveDay: saved?.clock.day ?? null,
      onContinue: () => {
        begin();
        if (saved) this.applySave(saved);
      },
      onNewGame: () => {
        this.store.clear();
        begin();
      },
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.saveNow();
    });
    window.addEventListener('pagehide', () => this.saveNow());
    this.koScreen = createKoScreen(ui, () => this.respawn());
    this.hints = new Hints(ui);
    this.titleScreen.show();
    this.craftPanel = new CraftPanel(ui, {
      inventory: this.inventory,
      nearStation: (st) => this.nearStation(st),
      onCrafted: (id) => this.events.emit('toast', { text: `${ITEMS[RECIPES[id].output].icon} ${RECIPES[id].label} fabriquée !` }),
      onClose: () => this.input.requestLock(canvas),
    });
    canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.craftPanel.open) this.input.requestLock(canvas);
    });
  }

  get paused(): boolean {
    return this.state !== 'playing' || !this.input.locked || this.craftPanel.open;
  }

  /** Le joueur se relève au dernier feu de camp (ou sur la plage), avec tout son sac. */
  private respawn(): void {
    const p = chooseRespawnPoint(this.structures.campfires(), this.terrain.spawnPoint, this.terrain.isWalkable);
    this.player.teleport(p.x, p.z, this.terrain);
    applyRespawn(this.player.vitals, this.now);
    this.koScreen.hide();
    this.state = 'playing';
    this.input.requestLock(this.canvas);
  }

  /** Sauvegarde la partie en cours (jamais depuis l'écran titre : le monde y est neuf). */
  private saveNow(): void {
    if (this.state === 'title') return;
    this.store.write(this.collectSave());
  }

  private collectSave(): SaveData {
    const p = this.player.position;
    const v = this.player.vitals;
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      now: this.now,
      playTime: this.playTime,
      clock: { t: this.clock.t, day: this.clock.day },
      player: { x: p.x, y: p.y, z: p.z, yaw: this.player.yaw, health: v.health, hunger: v.hunger },
      inventory: this.inventory.snapshot(),
      structures: this.structures.snapshot(),
      harvest: this.harvestables.snapshot(),
    };
  }

  /** Reprend une partie sauvegardée. Appelé une fois, juste après l'écran titre. */
  private applySave(d: SaveData): void {
    this.now = d.now;
    this.playTime = d.playTime;
    this.nextSaveAt = d.playTime + AUTOSAVE_SEC;
    this.clock.restore(d.clock.t, d.clock.day);

    // Sac remplacé sans toast « Nouvelle arme » : l'arme vient de la sauvegarde.
    const onChange = this.inventory.onChange;
    this.inventory.onChange = undefined;
    this.inventory.remove(this.inventory.snapshot());
    this.inventory.addAll(d.inventory);
    this.inventory.onChange = onChange;
    this.refreshWeapon(false);
    this.events.emit('itemsChanged', {});

    this.structures.restore(d.structures);
    this.harvestables.restore(d.harvest);
    this.harvestables.hideUnder(this.now, (c) => this.structures.overlaps(c));

    this.player.position.set(d.player.x, d.player.y, d.player.z);
    this.player.yaw = d.player.yaw;
    this.cam.yaw = d.player.yaw;
    this.player.vitals.health = d.player.health;
    this.player.vitals.hunger = d.player.hunger;
    // Les monstres du jour ont été placés loin de la plage, pas forcément loin d'ici.
    grantGrace(this.player.vitals, this.now);

    if (this.clock.isNight) this.nextRaidAt = this.now + 3;
    if (this.player.vitals.isDead) this.respawn();
  }

  /** Le joueur est-il près d'une station (atelier) ? Branché sur les structures. */
  nearStation(s: Station): boolean {
    return this.structures.nearStation(s, this.player.position);
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
    return { circles: this.harvestables.colliders(), boxes: this.structures.colliders() };
  }

  private frame(t: number): void {
    const realDt = Math.min((t - this.lastFrame) / 1000, 0.25);
    this.lastFrame = t;
    this.koScreen.tick(t);
    if (this.state === 'title') this.cam.yaw += realDt * 0.08;
    const paused = this.paused;
    if (paused && !this.wasPaused) this.saveNow();
    this.wasPaused = paused;
    if (paused) {
      if (this.state === 'playing' && !this.craftPanel.open) this.pauseOverlay.show();
      else this.pauseOverlay.hide();
    } else {
      this.pauseOverlay.hide();
      this.stepper.advance(realDt, (dt) => {
        this.step(dt);
        this.input.endStep();
      });
    }
    this.cam.update(this.input, this.player.position, this.terrain);
    this.sky.update(this.clock, this.player.position);
    this.followShadow();
    this.water.update(t / 1000);
    this.clouds.update(t / 1000);
    this.particles.update(this.paused ? 0 : realDt);
    this.floaters.update(realDt, this.camera);
    this.monsters.faceCamera(this.camera);
    this.build.render();
    this.hints.update(this.state === 'playing' ? this.playTime : Infinity);
    // Clignote pendant l'invulnérabilité de réapparition.
    this.player.mesh.visible = !(this.now < this.player.vitals.invulnerableUntil && Math.floor(t / 100) % 2 === 0);
    // 0 le jour, monte au crépuscule, 1 la nuit.
    const nightK = this.clock.isNight ? 1 : Math.min(1, Math.max(0, 1 - this.clock.sunElevation * 4));
    this.campfireLights.update(this.structures.campfireSpots(), this.player.position, nightK, t / 1000);
    const v = this.player.vitals;
    this.hud.update({
      inventory: this.inventory,
      weapon: this.weapon,
      health: v.health,
      hunger: v.hunger,
      isNight: this.clock.isNight,
      day: this.clock.day,
      phase: this.clock.phaseProgress,
    });
    this.ctx.renderer.render(this.scene, this.camera);
    if (this.debug) this.updateDebugInfo(realDt);
  }

  private debugEl: HTMLDivElement | null = null;
  private fps = 60;

  /** ?debug=1 : images/s et nombre d'appels de dessin. */
  private updateDebugInfo(realDt: number): void {
    if (!this.debugEl) {
      this.debugEl = document.createElement('div');
      this.debugEl.className = 'debuginfo';
      this.ui.appendChild(this.debugEl);
    }
    if (realDt > 0) this.fps += (1 / realDt - this.fps) * 0.05;
    const info = this.ctx.renderer.info.render;
    this.debugEl.textContent = `${Math.round(this.fps)} fps · ${info.calls} draw calls · ${info.triangles} tris`;
  }

  /** Un pas de simulation : input → clock → player → monsters → structures → pickups → spawner. */
  private step(dt: number): void {
    this.now += dt;
    this.playTime += dt;
    if (this.playTime >= this.nextSaveAt) {
      this.nextSaveAt = this.playTime + AUTOSAVE_SEC;
      this.saveNow();
    }
    this.handleDebugKeys();
    for (const ev of this.clock.tick(dt)) {
      if (ev === 'nightStarted') {
        this.events.emit('nightStarted', { day: this.clock.day });
        this.events.emit('toast', { text: '🌙 La nuit tombe… Protège-toi !' });
        this.nextRaidAt = this.now + 3;
      } else {
        this.monsters.scheduleRaiderFade(this.now);
        this.nextRaidAt = Infinity;
        this.events.emit('toast', { text: `⭐ Tu as survécu à la nuit ${this.clock.day - 1} !` });
        this.events.emit('dayStarted', { day: this.clock.day });
        this.events.emit('toast', { text: '☀️ Le soleil se lève !' });
      }
    }
    this.player.update(dt, this.now, this.input, this.cam.yaw, {
      terrain: this.terrain,
      collision: this.collisionWorld(),
      groundAt: (x, z, y) => this.structures.groundAt(x, z, y),
    });
    this.player.vitals.tick(dt);
    if (this.player.vitals.isDead) {
      this.knockOut();
      return;
    }
    this.handleEat();
    this.handlePotion();
    this.handleCraftKey();
    this.handleDodge();
    this.build.update(this.input);
    if (this.input.consumePressed('KeyE')) this.structures.toggleDoor(this.player.position);
    if (!this.build.active) this.handleAttack();
    this.harvestables.update(this.now, (c) => this.structures.overlaps(c));
    this.structures.update(this.now);
    this.updateMonsters(dt);
    for (const { gained, at } of this.monsters.updatePickups(dt, this.now, this.player.position)) {
      this.give(gained, { x: at.x, y: at.y + 1, z: at.z });
    }
    this.monsters.maintainPopulation(this.now, this.player.position);
    this.spawnRaiders();
  }

  /** La nuit, des monstres rôdent autour de la base et chassent le joueur s'il sort. */
  private spawnRaiders(): void {
    if (!this.clock.isNight || this.now < this.nextRaidAt) return;
    this.nextRaidAt = this.now + RAID_SPAWN_INTERVAL;
    const missing = raiderCap(this.clock.day) - this.monsters.raiderCount;
    if (missing <= 0) return;
    const anchor = this.structures.centroid() ?? this.player.position;
    const pts = planNightSpawns({ terrain: this.terrain, rng: this.rng, anchor, player: this.player.position, count: missing });
    for (const p of pts) this.monsters.spawn('slime', p.x, p.z, true);
  }

  private updateMonsters(dt: number): void {
    this.monsters.update(dt, {
      player: this.player.position,
      playerAlive: !this.player.vitals.isDead,
      isNight: this.clock.isNight,
      now: this.now,
      collision: this.collisionWorld(),
      canSeePlayer: (from) => !this.structures.blocksSight(from, this.player.position),
      attackPlayer: (m, dmg) => this.hurtPlayer(m, dmg),
    });
  }

  private hurtPlayer(m: Monster, damage: number): void {
    if (this.player.dodge.isInvulnerable(this.now)) return;
    if (!this.player.vitals.damage(damage, this.now)) return;
    this.player.knockFrom(m.position);
    this.hud.flashHurt();
    this.events.emit('playerDamaged', { amount: damage });
  }

  private knockOut(): void {
    this.state = 'ko';
    this.build.setActive(false);
    this.input.releaseLock();
    this.koScreen.open(performance.now());
  }

  private handleDodge(): void {
    if (this.input.consumePressed('ShiftLeft') || this.input.consumePressed('ShiftRight')) {
      this.player.tryDodge(this.now, this.cam.yaw);
    }
  }

  private handleDebugKeys(): void {
    if (!this.debug) return;
    if (this.input.consumePressed('KeyN')) this.clock.skipToNight();
    if (this.input.consumePressed('KeyK')) {
      const gift: Cost = {};
      for (const id of ITEM_IDS) if (ITEMS[id].kind !== 'weapon') gift[id] = 20;
      this.inventory.addAll(gift);
    }
  }

  private handleCraftKey(): void {
    if (!this.input.consumePressed('KeyC')) return;
    this.input.releaseLock();
    this.craftPanel.show();
  }

  private handlePotion(): void {
    if (!this.input.consumePressed('KeyG')) return;
    if (this.inventory.remove({ jelly_potion: 1 })) {
      this.player.vitals.heal(POTION_HEAL);
      const p = this.player.position;
      this.particles.burst({ x: p.x, y: p.y + 1.2, z: p.z }, '#9be07a', 10, 1.5, { up: 2 });
      this.events.emit('toast', { text: '🧪 Glou glou… ça va mieux !' });
    } else {
      this.events.emit('toast', { text: 'Pas de potion. Fabrique-en avec C !' });
    }
  }

  private handleEat(): void {
    if (!this.input.consumePressed('KeyF')) return;
    if (this.inventory.remove({ berry: 1 })) {
      this.player.vitals.eat(BERRY_HUNGER);
      this.events.emit('toast', { text: 'Miam ! 🫐' });
    } else {
      this.events.emit('toast', { text: 'Pas de baies… Cueille un buisson !' });
    }
  }

  private handleAttack(): void {
    // Un clic, ou le bouton tenu : on refrappe dès que le cooldown le permet.
    const clicked = this.input.consumeClick(0);
    if (!clicked && !this.input.isButtonDown(0)) return;
    if (!this.attackTimer.tryFire(this.now)) return;
    const w = WEAPONS[this.weapon];
    const p = this.player.position;
    this.player.yaw = this.cam.yaw;
    this.player.startSwing(this.now);

    const foe = selectTarget(p, this.cam.yaw, this.monsters.targets(), w.range, w.arcDeg);
    if (foe) {
      this.monsters.hit(foe.id, w.damage, p, this.now);
      return;
    }
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

  private refreshWeapon(announce = true): void {
    const best = bestWeapon(this.inventory);
    if (best === this.weapon) return;
    this.weapon = best;
    this.attackTimer = new AttackTimer(WEAPONS[best].cooldown);
    this.player.setWeapon(best);
    if (announce) this.events.emit('toast', { text: `Nouvelle arme : ${ITEMS[best].label} !` });
  }

  private followShadow(): void {
    const p = this.player.position;
    const sun = this.ctx.sun;
    sun.target.position.set(p.x, p.y, p.z);
    const d = this.sky.lightDir;
    sun.position.set(p.x + d.x * 60, p.y + d.y * 60, p.z + d.z * 60);
  }
}
