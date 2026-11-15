# Monster Island — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Un jeu 3D jouable dans le navigateur où l'on explore une petite île, récolte, combat des Slimes, fabrique une épée, construit une petite base et survit à la nuit — déployé automatiquement sur GitHub Pages à chaque push sur `main`.

**Architecture :** Vite + TypeScript + Three.js, sans moteur physique. Toute la logique de jeu « pure » (inventaire, combat, IA, grille de construction, cycle jour/nuit, terrain) vit dans `src/core/` et `src/data/` sans import de `three` ni du DOM, et est testée avec Vitest sous Node. Le rendu (`src/world`, `src/entities`, `src/engine`) et l'interface DOM (`src/ui`) consomment ce noyau. Le contenu (ressources, monstres, recettes, pièces) est piloté par des tables de données pour pouvoir ajouter du contenu sans toucher aux systèmes.

**Tech Stack :** Node 24, Vite (dernière version stable), TypeScript strict, `three` + `@types/three`, `simplex-noise`, Vitest, GitHub Actions (`actions/deploy-pages`).

**Spec :** [`docs/game-concept.md`](../../game-concept.md)

## Global Constraints

- Jeu web desktop, aucun téléchargement : Three.js + Vite, déployé sur GitHub Pages.
- Déploiement : tout push sur `main` → tests → build → GitHub Pages. Rien d'autre à faire manuellement après la configuration initiale.
- Public 8–12 ans : **aucun sang ni violence graphique**. Les monstres vaincus disparaissent dans un « pouf » de particules colorées. Ambiance jamais horrifique (nuit bleutée, pas noire).
- Style low-poly stylisé : géométries procédurales, `flatShading: true`, palette vive (`src/data/palette.ts`). **Aucun asset externe** pour le MVP.
- Vue à la troisième personne, caméra libre en orbite autour du personnage.
- Textes de l'interface **en français**.
- Clavier : lire `KeyboardEvent.code` (touches physiques) — fonctionne en QWERTY, QWERTY canadien et AZERTY.
- `src/core/**` et `src/data/**` n'importent jamais `three` ni `document`/`window`.
- Unités : mètres et secondes. Axe Y vers le haut. Lacet (`yaw`) : direction avant = `(sin(yaw), cos(yaw))` en XZ ; les modèles regardent +Z, donc `mesh.rotation.y = yaw`.
- Logique simulée à pas fixe de 1/60 s.
- Vite `base: './'` (fonctionne quel que soit le nom du dépôt GitHub).
- Objectif perf : 60 fps sur un portable moyen ; végétation en `InstancedMesh`.

## Review Focus

1. **Onglet en arrière-plan / gros saut de temps** → au retour, aucune téléportation de monstre ni faim vidée d'un coup. Le pas fixe plafonne une frame à 0,25 s. *(Test : Task 2, `FixedStepper`.)*
2. **Alt-Tab ou Échap pendant qu'une touche est enfoncée** → le personnage ne continue pas à marcher tout seul ; le jeu se met en pause. *(Test : Task 4, `InputState.releaseAll`.)*
3. **Ressources insuffisantes pour construire ou fabriquer** → rien n'est retiré, un message dit ce qui manque. *(Tests : Task 5 `Inventory.remove` atomique, Task 10, Task 11.)*
4. **Placement invalide** (eau, pente, sur un arbre, sur le joueur, case occupée, toit sans mur) → fantôme rouge, aucune ressource dépensée. *(Tests : Task 11, `BuildGrid.validate`.)*
5. **Bord de l'île** → le joueur ne marche pas dans la mer ; les monstres de nuit n'apparaissent ni dans l'eau ni sur le joueur ; à la réapparition, le joueur a 3 s d'invulnérabilité. *(Tests : Task 3 `isWalkable`, Task 12 spawner, Task 13 respawn.)*

## Contrôles (référence pour toutes les tâches)

| Action | Touche (`code`) |
|---|---|
| Se déplacer | `KeyW` `KeyA` `KeyS` `KeyD` (= ZQSD en AZERTY) |
| Caméra | souris (pointer lock), molette = zoom |
| Attaquer / récolter / placer | clic gauche |
| Esquive | `ShiftLeft` |
| Sauter | `Space` |
| Manger une baie | `KeyF` |
| Boire une potion | `KeyG` |
| Ouvrir/fermer une porte | `KeyE` |
| Mode construction | `KeyB` ; `Digit1`…`Digit7` choisir ; `KeyR` tourner ; `KeyX` démonter |
| Fabrication | `KeyC` |
| Pause | `Escape` |
| Debug (`?debug=1` seulement) | `KeyN` → nuit, `KeyK` → +20 de chaque ressource |

## Structure des fichiers

```
index.html                     page unique, <canvas> + racine UI
vite.config.ts                 base './', config Vitest (environment node)
tsconfig.json                  strict
package.json                   scripts dev/build/preview/test
.github/workflows/deploy.yml   CI + déploiement Pages
README.md                      lancer, tester, déployer
src/
  main.ts                      bootstrap : crée Game, écrans titre/pause
  core/                        logique pure, testée
    events.ts                  EventBus typé + GameEvents
    loop.ts                    FixedStepper
    rng.ts                     RNG à graine (mulberry32)
    math.ts                    forwardFromYaw, moveVector, orbitPosition, clamp, lerp, smoothstep
    terrain.ts                 createTerrain(seed) : hauteur, biome, marchable, point de départ
    collision.ts               cercle vs cercles / AABB
    inventory.ts               Inventory, Cost
    combat.ts                  isInArc, selectTarget, AttackTimer, DodgeState, rollLoot
    vitals.ts                  Vitals (santé, faim, invulnérabilité)
    dayNight.ts                DayNightClock
    monsterBrain.ts            MonsterBrain (machine à états)
    crafting.ts                canCraft, craft
    buildGrid.ts               BuildGrid (snap, validation, occupation)
    spawner.ts                 planNightSpawns, raiderCap
    respawn.ts                 chooseRespawnPoint
  data/                        contenu, piloté par tables
    meta.ts  palette.ts  balance.ts  items.ts  weapons.ts
    harvestables.ts  monsters.ts  recipes.ts  buildables.ts
  engine/
    Game.ts                    état du monde + ordre de mise à jour
    renderer.ts                scène, renderer, lumières, resize
    input.ts                   InputState (DOM → état), pointer lock
  world/
    terrainMesh.ts  water.ts  sky.ts  scatter.ts  models.ts  particles.ts
  entities/
    Player.ts  ThirdPersonCamera.ts  Harvestables.ts  Monster.ts
    Pickup.ts  Structures.ts  BuildController.ts
  ui/
    hud.ts  hud.css  floatingText.ts  craftPanel.ts  buildBar.ts  screens.ts
tests/core/*.test.ts           un fichier par module de core/
```

Ordre de mise à jour dans `Game.step(dt)` (fixé, à respecter) :
`input → clock → player → monsters → structures → pickups → spawner → camera → hud`.

---

### Task 1 : Squelette Vite + pipeline GitHub Pages

**Files :**
- Create : `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `README.md`, `.github/workflows/deploy.yml`, `src/main.ts`, `src/data/meta.ts`, `tests/core/meta.test.ts`

**Interfaces :**
- Produces : `GAME_TITLE: 'Monster Island'` (`src/data/meta.ts`) ; scripts npm `dev`, `build`, `preview`, `test`, `test:watch`.

- [ ] **Step 1 : Init** — `git init -b main` ; `npm init -y` ; `npm i three simplex-noise` ; `npm i -D vite typescript vitest @types/three`. `.gitignore` : `node_modules`, `dist`.
- [ ] **Step 2 : Scripts** — `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`, `"test:watch": "vitest"`. `"type": "module"`.
- [ ] **Step 3 : `vite.config.ts`** — `base: './'`, `test: { environment: 'node', include: ['tests/**/*.test.ts'] }` (référence `vitest/config`). `tsconfig` : `strict`, `target ES2022`, `moduleResolution bundler`, `noEmit`.
- [ ] **Step 4 : Test qui échoue**

```ts
// tests/core/meta.test.ts
import { GAME_TITLE } from '../../src/data/meta';
test('titre du jeu', () => { expect(GAME_TITLE).toBe('Monster Island'); });
```
Run : `npm test` → FAIL (module introuvable).

- [ ] **Step 5 : `src/data/meta.ts`** + `src/main.ts` qui affiche une scène Three.js : cube low-poly qui tourne, fond ciel `#8fd3ff`, titre `GAME_TITLE` en overlay HTML. `index.html` : `<canvas id="game">` + `<div id="ui">`, `lang="fr"`.
- [ ] **Step 6 : Vérifier** — `npm test` → PASS ; `npm run build` → `dist/` créé sans erreur ; `npm run dev` → cube visible.
- [ ] **Step 7 : Workflow** `.github/workflows/deploy.yml` (contenu exact) :

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
- [ ] **Step 8 : README** — 3 sections : *Jouer en local* (`npm install`, `npm run dev`), *Tests* (`npm test`), *Déploiement* (push sur `main` ; config unique : dépôt GitHub → Settings → Pages → Source = **GitHub Actions**).
- [ ] **Step 9 : Commit** — `git add -A && git commit -m "chore: scaffold Vite + Three.js + Pages deploy"`.
- [ ] **Step 10 : Publier (par l'humain, une seule fois)** — créer le dépôt GitHub, `git remote add origin …`, `git push -u origin main`, activer Pages (Source = GitHub Actions). Vérifier : onglet Actions vert, URL `https://<user>.github.io/<repo>/` affiche le cube.

---

### Task 2 : Utilitaires du noyau (événements, pas fixe, RNG, maths)

**Files :**
- Create : `src/core/events.ts`, `src/core/loop.ts`, `src/core/rng.ts`, `src/core/math.ts`
- Test : `tests/core/events.test.ts`, `tests/core/loop.test.ts`, `tests/core/rng.test.ts`, `tests/core/math.test.ts`

**Interfaces :**
- Produces :
  - `class EventBus<E extends Record<string, unknown>> { on<K extends keyof E>(k: K, fn: (p: E[K]) => void): () => void; emit<K extends keyof E>(k: K, p: E[K]): void }`
  - `type GameEvents` (dans `events.ts`, enrichi par les tâches suivantes) ; initial : `{ toast: { text: string } }`.
  - `class FixedStepper { constructor(step = 1/60, maxFrame = 0.25); advance(realDt: number, stepFn: (dt: number) => void): number }` — retourne le nombre de pas exécutés.
  - `type Rng = { next(): number; range(min: number, max: number): number; int(min: number, maxIncl: number): number; pick<T>(arr: readonly T[]): T }` ; `createRng(seed: number): Rng` (mulberry32).
  - `type Vec2 = { x: number; z: number }` ; `forwardFromYaw(yaw): Vec2` ; `clamp`, `lerp`, `smoothstep(e0, e1, x)`, `dist2D(a: Vec2, b: Vec2)`, `angleDelta(a, b)` = `b − a` ramené dans ]-π, π].

- [ ] **Step 1 : Tests qui échouent**

```ts
// loop.test.ts
test('un pas par 1/60 s', () => { const s = new FixedStepper(); let n = 0; s.advance(1/60, () => n++); expect(n).toBe(1); });
test('frame énorme plafonnée (onglet en arrière-plan)', () => { const s = new FixedStepper(); let n = 0; s.advance(5, () => n++); expect(n).toBe(15); });
test('reliquat conservé', () => { const s = new FixedStepper(); let n = 0; s.advance(0.5/60, () => n++); s.advance(0.5/60, () => n++); expect(n).toBe(1); });
// rng.test.ts
test('déterministe', () => { expect(createRng(42).next()).toBe(createRng(42).next()); });
test('int inclusif dans les bornes', () => { const r = createRng(1); for (let i = 0; i < 1000; i++) { const v = r.int(1, 3); expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(3); } });
// events.test.ts
test('on/emit/unsubscribe', () => { const b = new EventBus<{ a: number }>(); const got: number[] = []; const off = b.on('a', v => got.push(v)); b.emit('a', 1); off(); b.emit('a', 2); expect(got).toEqual([1]); });
// math.test.ts
test('forwardFromYaw(0) = +Z', () => { const f = forwardFromYaw(0); expect(f.x).toBeCloseTo(0); expect(f.z).toBeCloseTo(1); });
test('angleDelta passe par -π/π', () => { expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** les quatre modules selon les signatures ci-dessus. `FixedStepper` : `acc += min(realDt, maxFrame)` puis boucle tant que `acc >= step - 1e-9` (tolérance flottante, sinon 0.25 s donne 14 pas au lieu de 15).
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Commit** — `feat(core): event bus, fixed stepper, rng, math`.

---

### Task 3 : Terrain de l'île + rendu

**Files :**
- Create : `src/core/terrain.ts`, `src/data/palette.ts`, `src/data/balance.ts`, `src/engine/renderer.ts`, `src/engine/Game.ts`, `src/world/terrainMesh.ts`, `src/world/water.ts`
- Modify : `src/main.ts` (remplace le cube par `new Game(canvas)`)
- Test : `tests/core/terrain.test.ts`

**Interfaces :**
- Consumes : `smoothstep`, `createRng`, `Vec2` (Task 2).
- Produces :
  - `type Biome = 'water' | 'beach' | 'forest' | 'rocky' | 'clearing'`
  - `interface TerrainQuery { heightAt(x: number, z: number): number; isWalkable(x: number, z: number): boolean }`
  - `interface Terrain extends TerrainQuery { biomeAt(x, z): Biome; spawnPoint: Vec2; radius: number }`
  - `createTerrain(seed: number): Terrain`
  - `balance.ts` : `WORLD_SEED = 1337`, `ISLAND_RADIUS = 90`, `MOUNTAIN = { x: -35, z: -30, r: 30, h: 9 }`, `CLEARING = { x: 15, z: -5, r: 14, h: 3 }`.
  - `class Game { constructor(canvas: HTMLCanvasElement); start(): void; scene; camera; terrain; events: EventBus<GameEvents> }`.

- [ ] **Step 1 : Tests qui échouent**

```ts
const t = createTerrain(WORLD_SEED);
test('déterministe', () => { expect(createTerrain(WORLD_SEED).heightAt(10, 20)).toBe(t.heightAt(10, 20)); });
test('centre émergé, large en mer', () => { expect(t.heightAt(0, 0)).toBeGreaterThan(0); expect(t.heightAt(ISLAND_RADIUS * 1.2, 0)).toBeLessThan(0); });
test('clairière plate', () => { expect(t.heightAt(CLEARING.x, CLEARING.z)).toBeCloseTo(CLEARING.h, 1); expect(t.biomeAt(CLEARING.x, CLEARING.z)).toBe('clearing'); });
test('montagne rocheuse', () => { expect(t.biomeAt(MOUNTAIN.x, MOUNTAIN.z)).toBe('rocky'); });
test('départ sur la plage et marchable', () => { const p = t.spawnPoint; expect(t.biomeAt(p.x, p.z)).toBe('beach'); expect(t.isWalkable(p.x, p.z)).toBe(true); });
test('la mer n\'est pas marchable', () => { expect(t.isWalkable(ISLAND_RADIUS * 1.2, 0)).toBe(false); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter `createTerrain`** — formule à respecter (les tests ne la déterminent pas) :

```ts
// noise = createNoise2D(rng.next) de simplex-noise ; fbm = 4 octaves, lacunarité 2, gain 0.5, résultat ~[-1,1]
const d = Math.hypot(x, z) / ISLAND_RADIUS;
const fall = 1 - smoothstep(0.55, 1.0, d);
const hills = 3 + 2.5 * fbm(x * 0.015, z * 0.015);
const m = Math.max(0, 1 - Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z) / MOUNTAIN.r);
let h = fall * (hills + MOUNTAIN.h * m * m) - (1 - fall) * 4;
const k = smoothstep(CLEARING.r, CLEARING.r * 0.6, Math.hypot(x - CLEARING.x, z - CLEARING.z));
h = lerp(h, CLEARING.h, k);
```
Biome : `h < 0` → water ; `h < 1.0` → beach ; distance clairière < `CLEARING.r * 0.8` → clearing ; `m > 0.25 || h > 6` → rocky ; sinon forest. `isWalkable = heightAt > 0.2`. `spawnPoint` : partir de `(0, ISLAND_RADIUS)`, avancer vers le centre par pas de 0,5 m jusqu'à `heightAt > 0.3`, puis encore 2 m.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Rendu** — `renderer.ts` : `WebGLRenderer` (antialias, `setPixelRatio(min(devicePixelRatio, 2))`), resize, `HemisphereLight` + `DirectionalLight` avec ombres (shadow map 2048, zone 60 m centrée sur la caméra plus tard). `terrainMesh.ts` : `PlaneGeometry(220, 220, 160, 160)` couché, y = `heightAt`, `toNonIndexed()`, couleur de sommet par biome depuis `palette.ts` (plage `#F2D58A`, forêt `#6CC24A`, clairière `#9BE07A`, roche `#9A9A9A`, fond marin `#E0BE6E`), `flatShading`. `water.ts` : plan 600×600 à y=0, `#3FB8E8`, opacité 0.8, légère ondulation de couleur. Caméra temporaire `OrbitControls` (retirée en Task 4).
- [ ] **Step 6 : Vérifier** — `npm run dev` : île visible avec plage, forêt, montagne grise au nord-ouest, clairière plate. `npm run build` OK.
- [ ] **Step 7 : Commit** — `feat(world): procedural low-poly island`.

---

### Task 4 : Joueur, entrées, caméra 3e personne, pause

**Files :**
- Create : `src/engine/input.ts`, `src/entities/Player.ts`, `src/entities/ThirdPersonCamera.ts`, `src/world/models.ts` (modèle du joueur)
- Modify : `src/core/math.ts`, `src/engine/Game.ts`, `src/main.ts`, `src/data/balance.ts`
- Test : `tests/core/math.test.ts`, `tests/core/input.test.ts`

**Interfaces :**
- Consumes : `Terrain`, `FixedStepper`, `forwardFromYaw`.
- Produces :
  - `moveVector(keys: { forward: boolean; back: boolean; left: boolean; right: boolean }, cameraYaw: number): Vec2` — normalisé ou nul. Droite = `(-cos(yaw), sin(yaw))`.
  - `orbitPosition(target: { x: number; y: number; z: number }, yaw: number, pitch: number, distance: number): { x: number; y: number; z: number }` — caméra derrière la cible : `x = tx - sin(yaw)·cos(pitch)·d`, `y = ty + 1.6 + sin(pitch)·d`, `z = tz - cos(yaw)·cos(pitch)·d`.
  - `class InputState { isDown(code: string): boolean; consumePressed(code: string): boolean; consumeMouseDelta(): { dx: number; dy: number }; consumeClick(button: 0 | 2): boolean; wheel: number; locked: boolean; releaseAll(): void; press(code: string): void; release(code: string): void }` — la partie DOM (`attachDom(canvas)`) est séparée de l'état pour que l'état soit testable.
  - `class Player { position: THREE.Vector3; yaw: number; velocityY: number; radius = 0.4; mesh: THREE.Group; update(dt, input, cameraYaw, world: { terrain: TerrainQuery; obstacles: () => CollisionWorld }): void }` (`CollisionWorld` vient en Task 6 ; ici liste vide).
  - `class ThirdPersonCamera { yaw; pitch; distance; update(dt, input, target, terrain: TerrainQuery): void }`
  - `balance.ts` : `PLAYER_SPEED = 5`, `JUMP_VELOCITY = 6`, `GRAVITY = 20`, `CAM_PITCH = [-0.2, 1.2]`, `CAM_DIST = [3, 12]`, `CAM_DIST_DEFAULT = 7`, `MOUSE_SENS = 0.0025`.

- [ ] **Step 1 : Tests qui échouent**

```ts
test('avant = +Z quand yaw 0', () => { const v = moveVector({ forward: true, back: false, left: false, right: false }, 0); expect(v.x).toBeCloseTo(0); expect(v.z).toBeCloseTo(1); });
test('droite = -X quand yaw 0', () => { const v = moveVector({ forward: false, back: false, left: false, right: true }, 0); expect(v.x).toBeCloseTo(-1); expect(v.z).toBeCloseTo(0); });
test('diagonale normalisée', () => { const v = moveVector({ forward: true, back: false, left: false, right: true }, 0.7); expect(Math.hypot(v.x, v.z)).toBeCloseTo(1); });
test('caméra derrière', () => { const c = orbitPosition({ x: 0, y: 0, z: 0 }, 0, 0, 7); expect(c.z).toBeCloseTo(-7); });
test('releaseAll vide les touches (alt-tab)', () => { const i = new InputState(); i.press('KeyW'); i.releaseAll(); expect(i.isDown('KeyW')).toBe(false); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `moveVector`, `orbitPosition`, `InputState`. `attachDom` : `keydown/keyup` sur `window` (`e.code`), `mousemove` (`movementX/Y` seulement si `locked`), `wheel`, `mousedown`, `pointerlockchange` → `locked` ; `blur` et `visibilitychange` → `releaseAll()`.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Joueur & caméra** — Modèle chibi (`models.ts > createPlayerModel(): THREE.Group`) : tête icosaèdre (grosse), corps, sac à dos orange, yeux ; groupe `rightHand` pour l'arme. Déplacement relatif à la caméra ; refuser un déplacement vers une position non marchable (essayer X seul puis Z seul pour glisser le long du rivage) ; gravité + saut, `y = max(y, heightAt)` ; rotation lissée vers la direction de marche ; petit balancement de marche. Caméra : souris → yaw/pitch bornés, molette → distance, `y >= heightAt(cam) + 0.5`. Démarrage au `terrain.spawnPoint`.
- [ ] **Step 6 : Pause** — si `!input.locked` : `Game` ne fait pas avancer le `FixedStepper` et affiche « Pause — clique pour continuer ». Retirer `OrbitControls`.
- [ ] **Step 7 : Vérifier** (`npm run dev`) — le perso marche, saute, ne va pas dans la mer, la caméra tourne autour ; Échap met en pause ; alt-tab en marchant → le perso s'arrête.
- [ ] **Step 8 : Commit** — `feat(player): third-person controller and camera`.

---

### Task 5 : Noyau de jeu — objets, inventaire, armes, combat, butin

**Files :**
- Create : `src/data/items.ts`, `src/data/weapons.ts`, `src/core/inventory.ts`, `src/core/combat.ts`
- Test : `tests/core/inventory.test.ts`, `tests/core/combat.test.ts`

**Interfaces :**
- Consumes : `Rng`, `Vec2`, `angleDelta`, `forwardFromYaw`.
- Produces :
  - `type ItemId = 'wood' | 'stone' | 'berry' | 'jelly' | 'stick' | 'stone_sword' | 'jelly_potion'`
  - `ITEMS: Record<ItemId, { label: string; icon: string; kind: 'resource' | 'food' | 'weapon' | 'consumable' }>` — libellés : Bois 🪵, Pierre 🪨, Baies 🫐, Gelée magique 🟢, Bâton 🦯, Épée de pierre 🗡️, Potion de gelée 🧪.
  - `type Cost = Partial<Record<ItemId, number>>`
  - `class Inventory { constructor(initial?: Cost); count(id: ItemId): number; add(id: ItemId, n?: number): void; addAll(c: Cost): void; has(c: Cost): boolean; remove(c: Cost): boolean; missing(c: Cost): Cost; entries(): [ItemId, number][]; onChange?: () => void }`
  - `type WeaponId = 'stick' | 'stone_sword'` ; `WEAPONS: Record<WeaponId, { damage: number; cooldown: number; range: number; arcDeg: number; harvestPower: number }>` — stick `{10, 0.5, 2.2, 90, 1}`, stone_sword `{20, 0.45, 2.6, 100, 2}`.
  - `bestWeapon(inv: Inventory): WeaponId` (plus gros `damage` possédé ; `stick` par défaut).
  - `isInArc(from: Vec2, yaw: number, to: Vec2, range: number, arcDeg: number): boolean`
  - `type Target = { id: string; x: number; z: number; radius: number }` ; `selectTarget(from: Vec2, yaw: number, candidates: readonly Target[], range: number, arcDeg: number): Target | null` — le plus proche dont `distance - radius <= range` et dans l'arc.
  - `class AttackTimer { constructor(cooldown: number); tryFire(now: number): boolean }`
  - `class DodgeState { constructor(cfg = { duration: 0.3, iframes: 0.35, cooldown: 1.0, distance: 4 }); start(now: number): boolean; isActive(now: number): boolean; isInvulnerable(now: number): boolean }`
  - `type LootEntry = { item: ItemId; min: number; max: number; chance: number }` ; `rollLoot(table: readonly LootEntry[], rng: Rng): Cost`

- [ ] **Step 1 : Tests qui échouent**

```ts
test('remove atomique : rien retiré si insuffisant', () => { const inv = new Inventory({ wood: 2, stone: 5 }); expect(inv.remove({ wood: 3, stone: 1 })).toBe(false); expect(inv.count('wood')).toBe(2); expect(inv.count('stone')).toBe(5); });
test('missing', () => { expect(new Inventory({ wood: 1 }).missing({ wood: 3, stone: 2 })).toEqual({ wood: 2, stone: 2 }); });
test('bestWeapon', () => { expect(bestWeapon(new Inventory({ stick: 1 }))).toBe('stick'); expect(bestWeapon(new Inventory({ stick: 1, stone_sword: 1 }))).toBe('stone_sword'); });
test('arc', () => { expect(isInArc({ x: 0, z: 0 }, 0, { x: 0, z: 2 }, 2.2, 90)).toBe(true); expect(isInArc({ x: 0, z: 0 }, 0, { x: 0, z: -2 }, 2.2, 90)).toBe(false); expect(isInArc({ x: 0, z: 0 }, 0, { x: 0, z: 3 }, 2.2, 90)).toBe(false); });
test('selectTarget prend le plus proche dans l\'arc', () => { const t = selectTarget({ x: 0, z: 0 }, 0, [{ id: 'far', x: 0, z: 2, radius: 0.5 }, { id: 'near', x: 0.3, z: 1, radius: 0.5 }, { id: 'behind', x: 0, z: -1, radius: 0.5 }], 2.2, 90); expect(t?.id).toBe('near'); });
test('cooldown', () => { const a = new AttackTimer(0.5); expect(a.tryFire(0)).toBe(true); expect(a.tryFire(0.4)).toBe(false); expect(a.tryFire(0.5)).toBe(true); });
test('esquive : iframes puis cooldown', () => { const d = new DodgeState(); expect(d.start(0)).toBe(true); expect(d.isInvulnerable(0.3)).toBe(true); expect(d.isInvulnerable(0.4)).toBe(false); expect(d.start(0.5)).toBe(false); expect(d.start(1.0)).toBe(true); });
test('rollLoot respecte min/max', () => { const r = createRng(3); for (let i = 0; i < 200; i++) { const c = rollLoot([{ item: 'jelly', min: 1, max: 2, chance: 1 }], r); expect(c.jelly).toBeGreaterThanOrEqual(1); expect(c.jelly).toBeLessThanOrEqual(2); } });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** selon les signatures.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Commit** — `feat(core): inventory, weapons, combat targeting, loot`.

---

### Task 6 : Ressources récoltables dans le monde + HUD ressources

**Files :**
- Create : `src/data/harvestables.ts`, `src/core/collision.ts`, `src/world/scatter.ts`, `src/entities/Harvestables.ts`, `src/world/particles.ts`, `src/ui/hud.ts`, `src/ui/hud.css`, `src/ui/floatingText.ts`
- Modify : `src/world/models.ts`, `src/entities/Player.ts`, `src/engine/Game.ts`, `src/core/events.ts`
- Test : `tests/core/collision.test.ts`, `tests/core/scatter.test.ts`

**Interfaces :**
- Consumes : `Terrain`, `Rng`, `Inventory`, `selectTarget`, `AttackTimer`, `WEAPONS`, `bestWeapon`, `EventBus`.
- Produces :
  - `type HarvestKind = 'tree' | 'rock' | 'bush'` ; `HARVESTABLES: Record<HarvestKind, { item: ItemId; hits: number; yieldPerHit: number; respawnSec: number; radius: number; count: number; biomes: Biome[] }>` — tree `{wood, 4, 1, 90, 0.6, 140, ['forest','clearing']}`, rock `{stone, 4, 1, 120, 0.9, 60, ['rocky','forest']}`, bush `{berry, 1, 3, 60, 0.5, 40, ['forest','clearing','beach']}`. Gain par coup = `yieldPerHit × harvestPower`.
  - `type Circle = { x: number; z: number; r: number }` ; `type AABB = { minX: number; maxX: number; minZ: number; maxZ: number }` ; `type CollisionWorld = { circles: Circle[]; boxes: AABB[] }` ; `resolveCircle(pos: Vec2, r: number, world: CollisionWorld): Vec2`.
  - `scatter(terrain: Terrain, rng: Rng, kind: HarvestKind, existing: Vec2[], minSpacing = 2.5): Vec2[]` — respecte `biomes`, `isWalkable`, espacement ; rien à moins de 6 m du `spawnPoint` ni à moins de 6 m du centre de la clairière.
  - `class Harvestables { nodes: { id: string; kind: HarvestKind; x: number; z: number; hitsLeft: number; respawnAt: number | null }[]; hit(id: string, power: number, now: number): Cost; update(now: number): void; targets(): Target[]; colliders(): Circle[] }`
  - `GameEvents` += `itemsChanged: {}`, `harvested: { x: number; y: number; z: number; gained: Cost }`.
  - `class Hud { constructor(root: HTMLElement, events: EventBus<GameEvents>); update(state: HudState): void }` (`HudState` grossit au fil des tâches ; ici `{ inventory: Inventory; weapon: WeaponId }`).

- [ ] **Step 1 : Tests qui échouent**

```ts
test('cercle repoussé hors d\'un cercle', () => { const p = resolveCircle({ x: 0.5, z: 0 }, 0.4, { circles: [{ x: 0, z: 0, r: 0.6 }], boxes: [] }); expect(Math.hypot(p.x, p.z)).toBeCloseTo(1.0); });
test('cercle repoussé hors d\'une AABB', () => { const p = resolveCircle({ x: 0, z: 0.1 }, 0.4, { circles: [], boxes: [{ minX: -1, maxX: 1, minZ: -0.1, maxZ: 0.1 }] }); expect(p.z).toBeCloseTo(0.5); });
test('scatter : biomes, terre ferme, espacement, loin du départ', () => {
  const t = createTerrain(WORLD_SEED); const pts = scatter(t, createRng(1), 'tree', []);
  expect(pts.length).toBeGreaterThan(100);
  for (const p of pts) { expect(['forest', 'clearing']).toContain(t.biomeAt(p.x, p.z)); expect(dist2D(p, t.spawnPoint)).toBeGreaterThan(6); }
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(dist2D(pts[i], pts[j])).toBeGreaterThanOrEqual(2.5);
});
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `collision.ts` (cas « centre à l'intérieur de l'AABB » : sortir par l'axe de plus faible pénétration) et `scatter` (échantillonnage aléatoire, 30 essais par point, arrêt à `count`).
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Monde** — Modèles low-poly (`createTreeModel` : tronc + 2–3 cônes verts ; `createRockModel` : dodécaèdre déformé gris ; `createBushModel` : sphères vertes + baies bleues). Un `InstancedMesh` par partie de modèle ; nœud épuisé = instance masquée (échelle 0) jusqu'à `respawnAt`. Clic gauche → `AttackTimer` de l'arme → animation de swing du bras → `selectTarget` sur `harvestables.targets()` avec `yaw = cameraYaw` → `hit` → `inventory.addAll` → secousse de l'instance, éclats de particules (copeaux / cailloux / baies, jamais rouges), texte flottant « +1 🪵 ». Le joueur collisionne avec `colliders()`.
- [ ] **Step 6 : HUD v1** — barre du bas : une case par `ItemId` possédé (icône + nombre), case d'arme à droite, réticule central, toasts (3 s) via l'événement `toast`. CSS dans `hud.css`, police ronde système, coins arrondis, contours épais (look jouet).
- [ ] **Step 7 : Vérifier** — couper un arbre (4 coups → 4 bois, l'arbre disparaît puis repousse après 90 s), casser un rocher, cueillir un buisson ; on ne traverse pas les troncs.
- [ ] **Step 8 : Commit** — `feat(world): harvestable trees, rocks, bushes + resource HUD`.

---

### Task 7 : Santé, faim, nourriture

**Files :**
- Create : `src/core/vitals.ts`
- Modify : `src/data/balance.ts`, `src/entities/Player.ts`, `src/ui/hud.ts`, `src/ui/hud.css`, `src/core/events.ts`
- Test : `tests/core/vitals.test.ts`

**Interfaces :**
- Produces :
  - `balance.ts` : `MAX_HEALTH = 100`, `MAX_HUNGER = 100`, `HUNGER_DRAIN_PER_SEC = 100 / 480`, `STARVE_DAMAGE_PER_SEC = 1`, `REGEN_PER_SEC = 0.5`, `REGEN_MIN_HUNGER = 60`, `BERRY_HUNGER = 15`.
  - `class Vitals { health: number; hunger: number; invulnerableUntil: number; tick(dt: number): void; damage(amount: number, now: number): boolean; heal(n: number): void; eat(hunger: number): void; get isDead(): boolean }`
  - `GameEvents` += `playerDamaged: { amount: number }`.
  - `HudState` += `{ health: number; hunger: number }`.

- [ ] **Step 1 : Tests qui échouent**

```ts
const run = (v: Vitals, sec: number) => { for (let i = 0; i < sec * 60; i++) v.tick(1 / 60); };
test('faim vide en 480 s', () => { const v = new Vitals(); run(v, 480); expect(v.hunger).toBeCloseTo(0, 0); });
test('affamé : perd 1 PV/s', () => { const v = new Vitals(); v.hunger = 0; run(v, 10); expect(v.health).toBeCloseTo(90, 0); });
test('régénère si faim ≥ 60', () => { const v = new Vitals(); v.health = 50; run(v, 10); expect(v.health).toBeCloseTo(55, 0); });
test('bornes', () => { const v = new Vitals(); v.heal(50); expect(v.health).toBe(100); v.eat(50); expect(v.hunger).toBe(100); });
test('invulnérable ignore les dégâts', () => { const v = new Vitals(); v.invulnerableUntil = 5; expect(v.damage(10, 4)).toBe(false); expect(v.health).toBe(100); expect(v.damage(10, 6)).toBe(true); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `Vitals`.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Brancher** — `Player.vitals` ticke à chaque pas. `KeyF` : si `berry ≥ 1` → `remove({berry:1})`, `eat(BERRY_HUNGER)`, toast « Miam ! » ; sinon toast « Pas de baies ». HUD : cœur ❤️ + barre rose (santé), cuisse 🍗 + barre orange (faim), en haut à gauche ; la barre de faim clignote sous 20.
- [ ] **Step 6 : Vérifier** — la faim baisse, manger une baie la remonte.
- [ ] **Step 7 : Commit** — `feat(survival): health and hunger`.

---

### Task 8 : Cycle jour/nuit

**Files :**
- Create : `src/core/dayNight.ts`, `src/world/sky.ts`
- Modify : `src/engine/Game.ts`, `src/ui/hud.ts`, `src/core/events.ts`, `src/data/balance.ts`
- Test : `tests/core/dayNight.test.ts`

**Interfaces :**
- Produces :
  - `balance.ts` : `DAY_CYCLE_SEC = 600`, `NIGHT_START = 0.7` (jour = 420 s, nuit = 180 s), `START_TIME = 0.02`.
  - `class DayNightClock { constructor(cycleSec = DAY_CYCLE_SEC, start = START_TIME); t: number; day: number; tick(dt: number): Array<'nightStarted' | 'dayStarted'>; get isNight(): boolean; get sunElevation(): number; skipToNight(): void }` — `day` démarre à 1 et s'incrémente à chaque `dayStarted` ; `sunElevation = sin(π · t / NIGHT_START)` le jour, négatif la nuit.
  - `GameEvents` += `nightStarted: { day: number }`, `dayStarted: { day: number }`.
  - `HudState` += `{ isNight: boolean; day: number; t: number }`.
  - `src/engine/Game.ts` lit `?debug=1` → `debug: boolean`.

- [ ] **Step 1 : Tests qui échouent**

```ts
const run = (c: DayNightClock, sec: number) => { const ev: string[] = []; for (let i = 0; i < sec * 60; i++) ev.push(...c.tick(1 / 60)); return ev; };
test('commence le jour', () => { expect(new DayNightClock().isNight).toBe(false); });
test('la nuit arrive une seule fois', () => { const c = new DayNightClock(600, 0); const ev = run(c, 421); expect(c.isNight).toBe(true); expect(ev.filter(e => e === 'nightStarted')).toHaveLength(1); });
test('nouveau jour après un cycle', () => { const c = new DayNightClock(600, 0); const ev = run(c, 601); expect(c.isNight).toBe(false); expect(c.day).toBe(2); expect(ev).toContain('dayStarted'); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `DayNightClock`.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Ciel** — `sky.ts > updateSky(scene, lights, clock)` : couleur du ciel interpolée (aube `#FFB27A`, jour `#8FD3FF`, nuit `#1E2A5A` — bleu nuit, jamais noir), soleil/lune = direction de la `DirectionalLight`, intensité ambiante nuit ≥ 0.35, brouillard teinté, étoiles (`Points`) la nuit. Ombres suivant le joueur.
- [ ] **Step 6 : HUD & debug** — horloge en haut au centre : ☀️/🌙 + « Jour N » + petite barre de progression du cycle. Toast « La nuit tombe… Protège-toi ! » et « Le soleil se lève ! ». Si `debug` : `KeyN` → `skipToNight()`, `KeyK` → +20 de chaque ressource.
- [ ] **Step 7 : Vérifier** — `?debug=1`, appuyer sur N : ciel bleu nuit, étoiles, toast.
- [ ] **Step 8 : Commit** — `feat(world): day/night cycle`.

---

### Task 9 : Slimes — IA, combat, esquive, butin

**Files :**
- Create : `src/data/monsters.ts`, `src/core/monsterBrain.ts`, `src/entities/Monster.ts`, `src/entities/Pickup.ts`
- Modify : `src/world/models.ts`, `src/world/particles.ts`, `src/entities/Player.ts`, `src/engine/Game.ts`, `src/core/events.ts`
- Test : `tests/core/monsterBrain.test.ts`

**Interfaces :**
- Consumes : `selectTarget`, `AttackTimer`, `DodgeState`, `rollLoot`, `Vitals`, `resolveCircle`, `DayNightClock.isNight`.
- Produces :
  - `type MonsterKind = 'slime'` ; `MONSTERS: Record<MonsterKind, MonsterDef>` avec `MonsterDef = { label: string; hp: number; radius: number; speedDay: number; speedNight: number; aggroDay: number; aggroNight: number; attackRange: number; attackCooldown: number; damage: number; nightDamageMult: number; structureDamage: number; leash: number; wanderRadius: number; loot: LootEntry[]; dayPopulation: number; biomes: Biome[] }` — slime : `{ 'Slime', 30, 0.6, 2.5, 3.2, 7, 16, 1.6, 1.2, 8, 1.25, 10, 25, 8, [{ item: 'jelly', min: 1, max: 2, chance: 1 }], 10, ['forest','clearing'] }`.
  - `type BrainState = 'idle' | 'wander' | 'chase' | 'attack' | 'siege'`
  - `type Senses = { self: Vec2; home: Vec2; player: Vec2; playerAlive: boolean; isNight: boolean; now: number; raider: boolean; nearestStructure: (Target & { key: string }) | null }`
  - `type Intent = { move: Vec2; speed: number; attack: 'player' | 'structure' | null; structureKey?: string }`
  - `class MonsterBrain { constructor(def: MonsterDef, rng: Rng); state: BrainState; update(dt: number, s: Senses): Intent }`
  - `class Monster { id: string; def: MonsterDef; hp: number; position: THREE.Vector3; raider: boolean; brain: MonsterBrain; takeHit(damage: number, from: Vec2): boolean /* true si vaincu */ }`
  - `class Pickup { item: ItemId; amount: number; position }` — ramassage auto à < 1.5 m, aimanté à < 3 m, disparaît après 120 s.
  - `GameEvents` += `monsterDefeated: { kind: MonsterKind; x: number; z: number }`.

Règles de `MonsterBrain.update` (les tests en couvrent l'essentiel) :
- `aggro = isNight ? aggroNight : aggroDay`. Joueur vivant à `≤ aggro` → `chase`.
- À `≤ attackRange` du joueur → `attack: 'player'` si le cooldown le permet (une fois par `attackCooldown`).
- `raider` et joueur hors aggro → `siege` vers `nearestStructure` ; à portée → `attack: 'structure'`.
- Sinon : jour → `wander` autour de `home` (rayon `wanderRadius`, pauses 1–3 s) ; si `dist(self, home) > leash` → retour vers `home`.
- `speed = isNight ? speedNight : speedDay`.

- [ ] **Step 1 : Tests qui échouent**

```ts
const def = MONSTERS.slime; const base: Senses = { self: { x: 0, z: 0 }, home: { x: 0, z: 0 }, player: { x: 0, z: 5 }, playerAlive: true, isNight: false, now: 0, raider: false, nearestStructure: null };
test('jour : poursuit à 5 m', () => { const b = new MonsterBrain(def, createRng(1)); b.update(1 / 60, base); expect(b.state).toBe('chase'); });
test('jour : ignore à 10 m', () => { const b = new MonsterBrain(def, createRng(1)); b.update(1 / 60, { ...base, player: { x: 0, z: 10 } }); expect(b.state).not.toBe('chase'); });
test('nuit : poursuit à 10 m', () => { const b = new MonsterBrain(def, createRng(1)); b.update(1 / 60, { ...base, isNight: true, player: { x: 0, z: 10 } }); expect(b.state).toBe('chase'); });
test('attaque puis respecte le cooldown', () => { const b = new MonsterBrain(def, createRng(1)); const s = { ...base, player: { x: 0, z: 1 } }; expect(b.update(1 / 60, s).attack).toBe('player'); expect(b.update(1 / 60, { ...s, now: 0.5 }).attack).toBeNull(); expect(b.update(1 / 60, { ...s, now: 1.3 }).attack).toBe('player'); });
test('joueur K.O. : pas de poursuite', () => { const b = new MonsterBrain(def, createRng(1)); b.update(1 / 60, { ...base, playerAlive: false }); expect(b.state).not.toBe('chase'); });
test('raider assiège la structure', () => { const b = new MonsterBrain(def, createRng(1)); const i = b.update(1 / 60, { ...base, isNight: true, raider: true, player: { x: 0, z: 40 }, nearestStructure: { id: 's', key: 'edge:0:1:0', x: 0, z: 1, radius: 1 } }); expect(b.state).toBe('siege'); expect(i.attack).toBe('structure'); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `MonsterBrain`.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Slime dans le monde** — Modèle : icosaèdre détail 1, vert translucide (`opacity 0.85`), gros yeux brillants, reflet. Déplacement par **bonds** (étirement/écrasement, avance seulement en l'air). Barre de vie flottante (deux plans en billboard) visible après le premier coup. Population de jour maintenue à `dayPopulation` (réapparition toutes les 30 s, à > 25 m du joueur, dans `biomes`).
- [ ] **Step 6 : Combat** — Clic : `selectTarget` sur les monstres d'abord, sinon sur les récoltables. Coup : flash blanc, recul de 1.5 m, petit son optionnel non requis. Vaincu : « pouf » de particules vertes + étoiles, `rollLoot` → `Pickup`. Attaque du slime : bond-plongeon, `vitals.damage(damage × (isNight ? nightDamageMult : 1))` sauf si `dodge.isInvulnerable` ; écran bordé de rose 0.3 s (pas de rouge sang). `ShiftLeft` : esquive de 4 m dans la direction de marche (ou en arrière si immobile).
- [ ] **Step 7 : Vérifier** — vaincre 3 slimes, ramasser la gelée ; esquiver une attaque (aucun dégât) ; la nuit (`?debug=1` + N) les slimes viennent de plus loin.
- [ ] **Step 8 : Commit** — `feat(monsters): slime AI, melee combat, dodge, loot`.

---

### Task 10 : Fabrication (épée de pierre, potion)

**Files :**
- Create : `src/data/recipes.ts`, `src/core/crafting.ts`, `src/ui/craftPanel.ts`
- Modify : `src/entities/Player.ts`, `src/world/models.ts`, `src/ui/hud.css`, `src/engine/Game.ts`
- Test : `tests/core/crafting.test.ts`

**Interfaces :**
- Consumes : `Inventory`, `Cost`, `bestWeapon`.
- Produces :
  - `type RecipeId = 'stone_sword' | 'jelly_potion'` ; `RECIPES: Record<RecipeId, { output: ItemId; amount: number; cost: Cost; station: 'workbench' | null; label: string }>` — stone_sword : `{ wood: 3, stone: 5, jelly: 2 }`, station `workbench` ; jelly_potion : `{ jelly: 2, berry: 2 }`, station `null`.
  - `balance.ts` : `STATION_RANGE = 4`, `POTION_HEAL = 40`.
  - `type CraftCheck = { ok: true } | { ok: false; reason: 'missing'; missing: Cost } | { ok: false; reason: 'station' }`
  - `canCraft(id: RecipeId, inv: Inventory, nearStation: (s: 'workbench') => boolean): CraftCheck`
  - `craft(id: RecipeId, inv: Inventory, nearStation: (s: 'workbench') => boolean): CraftCheck` — retire le coût et ajoute la sortie seulement si `ok`.

- [ ] **Step 1 : Tests qui échouent**

```ts
const near = () => true, far = () => false;
test('épée : besoin de l\'atelier', () => { const inv = new Inventory({ wood: 3, stone: 5, jelly: 2 }); expect(canCraft('stone_sword', inv, far)).toEqual({ ok: false, reason: 'station' }); });
test('épée : ressources manquantes, rien retiré', () => { const inv = new Inventory({ wood: 3, stone: 1 }); expect(craft('stone_sword', inv, near)).toEqual({ ok: false, reason: 'missing', missing: { stone: 4, jelly: 2 } }); expect(inv.count('wood')).toBe(3); });
test('épée : fabriquée', () => { const inv = new Inventory({ wood: 3, stone: 5, jelly: 2 }); expect(craft('stone_sword', inv, near).ok).toBe(true); expect(inv.count('stone_sword')).toBe(1); expect(inv.count('wood')).toBe(0); });
test('potion sans station', () => { const inv = new Inventory({ jelly: 2, berry: 2 }); expect(craft('jelly_potion', inv, far).ok).toBe(true); expect(inv.count('jelly_potion')).toBe(1); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `canCraft` / `craft` (station vérifiée avant les ressources).
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : UI & effets** — `KeyC` ouvre un panneau (relâche le pointer lock, met en pause) : une carte par recette avec coût coloré (vert possédé / rouge manquant), mention « Près d'un atelier » si requis, bouton « Fabriquer ». Après fabrication : `bestWeapon` rééquipe, modèle de l'arme dans la main change (bâton marron → épée grise), toast « Nouvelle arme : Épée de pierre ! ». `KeyG` : boire une potion → `heal(POTION_HEAL)`. `nearStation('workbench')` est fourni par `Structures` (Task 11) ; d'ici là, renvoie `false`.
- [ ] **Step 6 : Vérifier** — potion fabriquée et bue ; l'épée est refusée sans atelier avec le bon message.
- [ ] **Step 7 : Commit** — `feat(crafting): recipes, craft panel, potion`.

---

### Task 11 : Construction de la base

**Files :**
- Create : `src/data/buildables.ts`, `src/core/buildGrid.ts`, `src/entities/Structures.ts`, `src/entities/BuildController.ts`, `src/ui/buildBar.ts`
- Modify : `src/world/models.ts`, `src/engine/Game.ts`, `src/entities/Player.ts`, `src/core/events.ts`, `src/ui/hud.css`
- Test : `tests/core/buildGrid.test.ts`

**Interfaces :**
- Consumes : `TerrainQuery`, `Circle`, `AABB`, `Inventory`, `Cost`.
- Produces :
  - `type PieceKind = 'floor' | 'wall' | 'window' | 'door' | 'roof' | 'campfire' | 'workbench'` ; `type Slot = 'floor' | 'edge' | 'roof' | 'object'`.
  - `BUILDABLES: Record<PieceKind, { label: string; icon: string; cost: Cost; slot: Slot; hp: number }>` :
    floor Plancher `{wood:2}` floor 80 · wall Mur `{wood:3}` edge 120 · window Fenêtre `{wood:3}` edge 100 · door Porte `{wood:4}` edge 100 · roof Toit `{wood:3}` roof 80 · campfire Feu de camp `{wood:3, stone:2}` object 60 · workbench Atelier `{wood:5, stone:3}` object 100. Ordre des touches `Digit1..7` = cet ordre.
  - Constantes : `CELL = 2`, `WALL_HEIGHT = 3`, `FLOOR_THICKNESS = 0.2`, `MAX_SLOPE = 1.2`, `BUILD_REACH = 8`.
  - `type Rot = 0 | 1` ; `type Placement = { kind: PieceKind; key: string; cx: number; cz: number; rot: Rot; x: number; y: number; z: number; yaw: number }`
  - `type Invalid = 'occupied' | 'water' | 'slope' | 'blocked' | 'needsSupport'`
  - `class BuildGrid { constructor(terrain: TerrainQuery); snap(kind: PieceKind, aim: Vec2, rot: Rot): Placement; validate(p: Placement, ctx: { obstacles: Circle[]; player: Circle }): { ok: true } | { ok: false; reason: Invalid }; place(p: Placement): void; remove(key: string): Placement | undefined; get(key: string): Placement | undefined; all(): Placement[]; footprint(p: Placement): AABB }`
  - `GameEvents` += `structurePlaced: { key: string }`, `structureDestroyed: { key: string; x: number; z: number }`.
  - `class Structures { hp: Map<string, number>; nearStation(kind: 'workbench', pos: Vec2): boolean; campfires(): Vec2[]; colliders(): AABB[]; targets(): (Target & { key: string })[]; damage(key: string, n: number): void; toggleDoor(pos: Vec2): void; centroid(): Vec2 | null }`

Règles de `snap` (à respecter) :
- Slots `floor`/`roof`/`object` : `cx = floor(x / CELL)`, `cz = floor(z / CELL)`, centre `((cx + .5)·CELL, (cz + .5)·CELL)`. Clés : `floor:cx:cz`, `roof:cx:cz`, `object:cx:cz`.
- Slot `edge` : `rot 0` → arête horizontale : `cx = floor(x / CELL)`, `cz = round(z / CELL)`, centre `((cx + .5)·CELL, cz·CELL)`, `yaw 0`. `rot 1` → `cx = round(x / CELL)`, `cz = floor(z / CELL)`, centre `(cx·CELL, (cz + .5)·CELL)`, `yaw π/2`. Clé `edge:cx:cz:rot` (murs, fenêtres et portes partagent la même clé → ils s'excluent).
- `y` : plancher de la case s'il existe (`y` du plancher + `FLOOR_THICKNESS`), sinon hauteur max des 4 coins de la case arrondie au 0,5 m. Toit : `y + WALL_HEIGHT`.

Règles de `validate` (ordre) : clé déjà prise → `occupied` ; centre non marchable → `water` ; (max − min des coins) > `MAX_SLOPE` → `slope` ; empreinte qui touche un obstacle (arbre, rocher) ou — pour les slots `edge` et `object` seulement — le joueur → `blocked` (on peut poser un plancher ou un toit sur la case où l'on se tient) ; toit sans aucun mur sur ses 4 arêtes (`edge:cx:cz:0`, `edge:cx:cz+1:0`, `edge:cx:cz:1`, `edge:cx+1:cz:1`) → `needsSupport`.

- [ ] **Step 1 : Tests qui échouent** (terrain plat factice `{ heightAt: () => 2, isWalkable: () => true }`)

```ts
const flat = { heightAt: () => 2, isWalkable: () => true }; const none = { obstacles: [], player: { x: 50, z: 50, r: 0.4 } };
test('snap plancher', () => { const p = new BuildGrid(flat).snap('floor', { x: 3.1, z: 0.4 }, 0); expect([p.cx, p.cz, p.x, p.z, p.key]).toEqual([1, 0, 3, 1, 'floor:1:0']); });
test('snap mur rot 0 sur l\'arête la plus proche', () => { const p = new BuildGrid(flat).snap('wall', { x: 1, z: 1.8 }, 0); expect([p.key, p.x, p.z]).toEqual(['edge:0:1:0', 1, 2]); });
test('mur et porte s\'excluent', () => { const g = new BuildGrid(flat); g.place(g.snap('wall', { x: 1, z: 2 }, 0)); expect(g.validate(g.snap('door', { x: 1, z: 2 }, 0), none)).toEqual({ ok: false, reason: 'occupied' }); });
test('eau refusée', () => { const g = new BuildGrid({ heightAt: () => -1, isWalkable: () => false }); expect(g.validate(g.snap('floor', { x: 1, z: 1 }, 0), none)).toEqual({ ok: false, reason: 'water' }); });
test('pente refusée', () => { const g = new BuildGrid({ heightAt: (x) => x, isWalkable: () => true }); expect(g.validate(g.snap('floor', { x: 1, z: 1 }, 0), none)).toEqual({ ok: false, reason: 'slope' }); });
test('sur un arbre refusé', () => { const g = new BuildGrid(flat); expect(g.validate(g.snap('floor', { x: 1, z: 1 }, 0), { ...none, obstacles: [{ x: 1, z: 1, r: 0.6 }] })).toEqual({ ok: false, reason: 'blocked' }); });
test('sur le joueur refusé', () => { const g = new BuildGrid(flat); expect(g.validate(g.snap('wall', { x: 1, z: 2 }, 0), { obstacles: [], player: { x: 1, z: 2, r: 0.4 } })).toEqual({ ok: false, reason: 'blocked' }); });
test('toit : besoin d\'un mur', () => { const g = new BuildGrid(flat); const roof = g.snap('roof', { x: 1, z: 1 }, 0); expect(g.validate(roof, none)).toEqual({ ok: false, reason: 'needsSupport' }); g.place(g.snap('wall', { x: 1, z: 0.1 }, 0)); expect(g.validate(roof, none)).toEqual({ ok: true }); });
test('mur posé sur un plancher prend sa hauteur', () => { const g = new BuildGrid(flat); g.place(g.snap('floor', { x: 1, z: 1 }, 0)); expect(g.snap('wall', { x: 1, z: 0.1 }, 0).y).toBeGreaterThan(2); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `BuildGrid` selon les règles ci-dessus (empreinte : plancher/toit `CELL×CELL`, arête `CELL×0.3`, objet `1.2×1.2`).
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Mode construction** — `KeyB` bascule le mode ; barre de pièces en bas (icône, nom, coût ; grisée si inabordable). Point visé = intersection du rayon central de la caméra avec le terrain (et les planchers), borné à `BUILD_REACH` du joueur. Fantôme semi-transparent : **vert** si valide et abordable, **rouge** sinon, avec la raison en français sous le réticule (« Case occupée », « Pas dans l'eau ! », « Trop en pente », « Quelque chose bloque », « Le toit a besoin d'un mur », « Il te manque : 2 🪵 »). Clic gauche : `inventory.remove(cost)` **puis** `place` seulement si `validate` est ok et `remove` réussit. `KeyR` tourne. `KeyX` démonte la pièce visée et rembourse `floor(cost / 2)`.
- [ ] **Step 6 : Structures** — Modèles bois low-poly (planches visibles), fenêtre = mur avec ouverture (collision pleine), porte : `KeyE` à < 2,5 m l'ouvre/ferme (ouverte = pas de collision ; les monstres ne l'ouvrent pas). Feu de camp : flammes animées (cônes orange/jaune), `PointLight` chaude rayon 10. Atelier : établi + outils. `Structures.colliders()` ajoutés au `CollisionWorld` du joueur et des monstres. `nearStation` branché sur la fabrication (Task 10).
- [ ] **Step 7 : Vérifier** — construire une cabane 2×2 (planchers, 4+ murs, une porte, toit) + atelier + feu ; fabriquer l'épée près de l'atelier ; aucun bois perdu sur un placement rouge.
- [ ] **Step 8 : Commit** — `feat(building): grid-snapped base building`.

---

### Task 12 : Nuit — attaques de la base

**Files :**
- Create : `src/core/spawner.ts`
- Modify : `src/entities/Structures.ts`, `src/entities/Monster.ts`, `src/engine/Game.ts`, `src/data/balance.ts`
- Test : `tests/core/spawner.test.ts`

**Interfaces :**
- Consumes : `Terrain`, `Rng`, `MonsterBrain` (mode `raider`), `Structures.centroid/targets/damage`, `DayNightClock`.
- Produces :
  - `balance.ts` : `RAIDER_BASE = 3`, `RAIDER_PER_NIGHT = 2`, `RAIDER_MAX = 12`, `RAID_SPAWN_INTERVAL = 20`, `RAID_RING = [18, 26]`, `RAID_MIN_PLAYER_DIST = 15`.
  - `raiderCap(day: number): number` = `min(RAIDER_BASE + RAIDER_PER_NIGHT·(day − 1), RAIDER_MAX)`.
  - `planNightSpawns(p: { terrain: Terrain; rng: Rng; anchor: Vec2; player: Vec2; count: number }): Vec2[]` — positions sur l'anneau `RAID_RING` autour de `anchor`, marchables, à `≥ RAID_MIN_PLAYER_DIST` du joueur ; 20 essais par position, position abandonnée si aucun essai valide.

- [ ] **Step 1 : Tests qui échouent**

```ts
const t = createTerrain(WORLD_SEED);
test('cap par nuit', () => { expect(raiderCap(1)).toBe(3); expect(raiderCap(3)).toBe(7); expect(raiderCap(20)).toBe(12); });
test('jamais dans l\'eau ni sur le joueur', () => { const anchor = { x: CLEARING.x, z: CLEARING.z }; const pts = planNightSpawns({ terrain: t, rng: createRng(9), anchor, player: anchor, count: 50 }); expect(pts.length).toBeGreaterThan(0); for (const p of pts) { expect(t.isWalkable(p.x, p.z)).toBe(true); expect(dist2D(p, anchor)).toBeGreaterThanOrEqual(15); } });
test('ancre au bord de l\'île : moins de positions, jamais invalides', () => { const anchor = t.spawnPoint; const pts = planNightSpawns({ terrain: t, rng: createRng(2), anchor, player: anchor, count: 10 }); for (const p of pts) expect(t.isWalkable(p.x, p.z)).toBe(true); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `raiderCap`, `planNightSpawns`.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Brancher** — La nuit, toutes les `RAID_SPAWN_INTERVAL` s, compléter jusqu'à `raiderCap(day)` raiders vivants ; ancre = `structures.centroid()` ou le joueur s'il n'a pas de base. Raiders : slimes violets-bleus luminescents (même `MonsterDef`, `raider: true`). Ils attaquent la structure la plus proche (`structureDamage` / `attackCooldown`) : la pièce tremble, se fissure visuellement sous 50 % PV, et se brise en planches qui tombent à 0 PV (`structureDestroyed`, toast « Ton mur a cédé ! »). À l'aube : les raiders restants disparaissent en « pouf » sur 10 s ; toast « Tu as survécu à la nuit N ! ».
- [ ] **Step 6 : Vérifier** — `?debug=1`, construire une cabane, N : les raiders arrivent hors de vue, frappent les murs ; le joueur peut les vaincre ; à l'aube ils disparaissent.
- [ ] **Step 7 : Commit** — `feat(survival): night raids on the base`.

---

### Task 13 : K.O., réapparition, écrans, finitions

**Files :**
- Create : `src/core/respawn.ts`, `src/ui/screens.ts`
- Modify : `src/main.ts`, `src/engine/Game.ts`, `src/entities/Player.ts`, `src/ui/hud.ts`, `src/ui/hud.css`, `README.md`
- Test : `tests/core/respawn.test.ts`

**Interfaces :**
- Consumes : `Vitals`, `Structures.campfires()`, `Terrain.spawnPoint`.
- Produces :
  - `balance.ts` : `RESPAWN_INVULN = 3`, `RESPAWN_MIN_HUNGER = 50`.
  - `chooseRespawnPoint(campfires: Vec2[], spawn: Vec2): Vec2` — dernier feu de camp posé, décalé de 1,5 m en +Z ; sinon `spawn`.
  - `applyRespawn(v: Vitals, now: number): void` — santé max, `hunger = max(hunger, RESPAWN_MIN_HUNGER)`, `invulnerableUntil = now + RESPAWN_INVULN`. L'inventaire est conservé.

- [ ] **Step 1 : Tests qui échouent**

```ts
test('réapparaît au dernier feu de camp', () => { expect(chooseRespawnPoint([{ x: 0, z: 0 }, { x: 10, z: 10 }], { x: 99, z: 99 })).toEqual({ x: 10, z: 11.5 }); });
test('sinon à la plage', () => { expect(chooseRespawnPoint([], { x: 5, z: 80 })).toEqual({ x: 5, z: 80 }); });
test('respawn : santé pleine, faim ≥ 50, invulnérable 3 s', () => { const v = new Vitals(); v.health = 0; v.hunger = 10; applyRespawn(v, 100); expect(v.health).toBe(100); expect(v.hunger).toBe(50); expect(v.damage(10, 102.9)).toBe(false); expect(v.damage(10, 103.1)).toBe(true); });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : Implémenter** `respawn.ts`.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : Écrans** (`screens.ts`) — **Titre** : « Monster Island », slime qui rebondit en fond (scène 3D réelle), bouton « Jouer » (le clic donne le pointer lock), carte des contrôles. **Pause** (`Escape`) : « Reprendre », rappel des contrôles. **K.O.** : « Oups ! Tu es tombé dans les pommes… », bouton « Se relever » actif après 2 s → `chooseRespawnPoint` + `applyRespawn` ; le joueur clignote pendant l'invulnérabilité. Aucun mot « mort ».
- [ ] **Step 6 : Finitions** — astuce contextuelle en bas pendant les 2 premières minutes (« Clique sur un arbre pour récolter du bois », « Appuie sur B pour construire », « Construis un atelier pour fabriquer une épée »). Mettre à jour le README (contrôles + boucle de jeu).
- [ ] **Step 7 : Vérifier** — se faire mettre K.O. la nuit près de slimes : réapparition au feu de camp, 3 s sans dégâts, inventaire intact.
- [ ] **Step 8 : Commit** — `feat(ui): title, pause, knockout and respawn`.

---

### Task 14 : Vérification de la version MVP et mise en ligne

**Files :** aucun nouveau (corrections seulement).

- [ ] **Step 1 :** `npm test` → tout PASS ; `npm run build` → aucun avertissement TypeScript.
- [ ] **Step 2 :** `npm run preview` et partie complète sans `?debug` : départ plage → bois/pierre/baies → 2 slimes vaincus → potion → cabane (plancher, murs, porte, toit) → atelier → épée → feu de camp → survivre à la nuit 1 → aube.
- [ ] **Step 3 :** Vérifier chaque ligne de la *Review Focus* à la main (alt-tab en marchant, onglet caché 30 s, placement invalide sans dépense, rivage, réapparition).
- [ ] **Step 4 :** Perf : 60 fps visé (outil Performance de Chrome), < 300 draw calls (`renderer.info.render.calls` affiché si `?debug=1`).
- [ ] **Step 5 :** Commit des corrections, `git push` sur `main` → Actions vert → jeu en ligne sur l'URL Pages.

---

## Couverture de la spec (MVP §10)

| Exigence | Tâche |
|---|---|
| 1. Personnage 3e personne | 4 |
| 2. Petite île 3D | 3 |
| 3. Arbres, rochers, buissons récoltables | 6 |
| 4. Inventaire de ressources | 5, 6 |
| 5. Slime avec IA simple | 9 |
| 6. Système de combat (arme, esquive, barres de vie) | 5, 9 |
| 7. Butin après victoire | 5, 9 |
| 8. Construction d'une petite base (planchers, murs, portes, fenêtres, toits, feu de camp, atelier) | 11 |
| 9. Cycle jour/nuit (agressivité, attaques de la base) | 8, 9, 12 |
| 10. Interface santé, inventaire, ressources (+ faim) | 6, 7, 8 |
| Fabrication (boucle §3) | 10 |
| Déploiement GitHub Pages automatique | 1 |

## Hors MVP (backlog, l'architecture le prévoit)

- **Sauvegarde** (`localStorage`) : inventaire, structures, jour. Recommandé juste après le MVP — sinon fermer l'onglet efface la base.
- Monstres : Champignon géant (spores), Golem de pierre (minerais), Loup des ombres (fourrure), Dragonnet (écailles) → une entrée `MONSTERS` + un modèle chacun.
- Grotte + cristaux ; coffres ; tours de défense ; jardins ; apprivoisement ; sons et musique ; manette ; agrandissement de l'île.
