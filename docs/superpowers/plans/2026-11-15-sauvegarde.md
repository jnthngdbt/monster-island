# Sauvegarde de la partie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Sauvegarder automatiquement la partie dans le `localStorage` du navigateur et la reprendre depuis l'écran titre.

**Architecture :** Un module pur `src/core/save.ts` (type `SaveData`, `serialize`/`parse` avec validation, `SaveStore` autour d'un stockage injecté) testé sous Node. Les entités exposent `snapshot()`/`restore()` (horloge, ressources, constructions). `Game` assemble la sauvegarde, la déclenche (toutes les 30 s, pause, onglet caché/fermé) et la recharge depuis un écran titre à deux boutons.

**Tech Stack :** TypeScript strict, Three.js, Vitest (globals `test`/`expect`, sans import), Vite.

**Spec :** [`docs/superpowers/specs/2026-11-15-sauvegarde-design.md`](../specs/2026-11-15-sauvegarde-design.md)

## Global Constraints

- Clé de stockage : `monster-island:save`. Version du format : `1`.
- `src/core/` n'importe ni `three` ni le DOM (pas de `window`, pas de `localStorage` direct) : le stockage est injecté.
- Chaque accès au stockage est dans un `try/catch` ; un échec n'interrompt jamais le jeu.
- Jamais de sauvegarde quand `state === 'title'`.
- Textes de l'interface en français, ton enfant (8–12 ans), comme les écrans existants.
- Copie exacte : « Continuer — Jour N », « Nouvelle partie », « Ta partie sera effacée. Sûr ? », « Oui », « Non », « Jouer ».
- Pas de toast « Partie sauvegardée ».
- Intervalle d'autosauvegarde : 30 s de jeu (`AUTOSAVE_SEC = 30` dans `src/data/balance.ts`).

## Review Focus

1. **Onglet fermé sur l'écran titre** alors qu'une sauvegarde existe : la sauvegarde ne doit pas être écrasée par le monde neuf (pas de save si `state === 'title'`). → Task 4, vérification manuelle étape 6.
2. **Sauvegarde JSON valide mais abîmée** (champ manquant, nombre `NaN`/`null`, objet ou pièce inconnus) : `parse` renvoie `null` ou ignore l'entrée inconnue, le jeu démarre sans planter. → Task 1, tests `parse rejette…` / `parse ignore…`.
3. **`localStorage` qui lève une exception** (navigation privée, quota plein, accès bloqué) : `SaveStore` renvoie `null`/`false`, le jeu continue. → Task 1, test `SaveStore survit à un stockage qui lève`.
4. **Partie sauvegardée la nuit ou K.O.** : au chargement, les rôdeurs sont programmés ; à 0 PV le joueur se relève au feu de camp. → Task 4, vérification manuelle étape 6.
5. **Pièce posée sur plancher surélevé / porte ouverte** : après chargement, le joueur est sur le plancher et la porte est ouverte (collisions comprises). → Task 3, test `restore rouvre les portes` ; Task 4, position 3D complète.

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/core/save.ts` (créer) | `SaveData`, `serialize`, `parse`, `SaveStore`, `StorageLike` |
| `src/core/dayNight.ts` (modifier) | `restore(t, day)` |
| `src/entities/Harvestables.ts` (modifier) | `snapshot()` / `restore()` des nœuds modifiés |
| `src/entities/Structures.ts` (modifier) | `snapshot()` / `restore()` des pièces + portes |
| `src/data/balance.ts` (modifier) | `AUTOSAVE_SEC` |
| `src/ui/screens.ts` + `src/ui/hud.css` (modifier) | Écran titre Continuer / Nouvelle partie / confirmation |
| `src/engine/Game.ts` (modifier) | `collectSave()`, `applySave()`, déclencheurs |
| `README.md` (modifier) | Section « Sauvegarde » et ses limites |

---

### Task 1: Format de sauvegarde (`src/core/save.ts`)

**Files:**
- Create: `src/core/save.ts`
- Test: `tests/core/save.test.ts`

**Interfaces:**
- Consumes: `Cost`, `ITEM_IDS` (`src/data/items.ts`), `Placement` (`src/core/buildGrid.ts`), `PIECE_KINDS` (`src/data/buildables.ts`).
- Produces:
  ```ts
  export const SAVE_KEY = 'monster-island:save';
  export const SAVE_VERSION = 1;
  export type SavedPiece = { p: Placement; open: boolean };
  export type SavedNode = { id: string; hitsLeft: number; respawnAt: number | null };
  export type SaveData = {
    version: 1;
    savedAt: number;
    now: number;
    playTime: number;
    clock: { t: number; day: number };
    player: { x: number; y: number; z: number; yaw: number; health: number; hunger: number };
    inventory: Cost;
    structures: SavedPiece[];
    harvest: SavedNode[];
  };
  export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  export function serialize(d: SaveData): string;
  export function parse(text: string | null): SaveData | null;
  export class SaveStore {
    constructor(storage: StorageLike | null);
    load(): SaveData | null;
    write(d: SaveData): boolean;
    clear(): void;
  }
  ```

- [ ] **Step 1: Write the failing tests** in `tests/core/save.test.ts`

  Fixture `sample(): SaveData` with one wall placement (`{ kind: 'wall', key: 'edge:3:4:0', cx: 3, cz: 4, rot: 0, x: 7, y: 1.5, z: 8, yaw: 0 }`, `open: false`), one door (`open: true`), inventory `{ wood: 5, stone_sword: 1 }`, one node `{ id: 'tree-0', hitsLeft: 0, respawnAt: 120 }`, `clock: { t: 0.75, day: 3 }`.

  ```ts
  test('aller-retour serialize/parse', () => {
    expect(parse(serialize(sample()))).toEqual(sample());
  });
  test('parse rejette null, JSON cassé et mauvaise version', () => {
    expect(parse(null)).toBeNull();
    expect(parse('{oops')).toBeNull();
    expect(parse(serialize({ ...sample(), version: 2 as 1 }))).toBeNull();
  });
  test('parse rejette un champ manquant ou un nombre invalide', () => {
    const { player, ...noPlayer } = sample();
    expect(parse(JSON.stringify(noPlayer))).toBeNull();
    expect(parse(JSON.stringify({ ...sample(), player: { ...player, x: null } }))).toBeNull();
    expect(parse(JSON.stringify({ ...sample(), clock: { t: 'a', day: 1 } }))).toBeNull();
  });
  test('parse ignore les objets et pièces inconnus', () => {
    const d = { ...sample(), inventory: { wood: 5, laser: 3 }, structures: [...sample().structures, { p: { ...sample().structures[0].p, kind: 'tower' }, open: false }] };
    const out = parse(JSON.stringify(d))!;
    expect(out.inventory).toEqual({ wood: 5 });
    expect(out.structures).toHaveLength(sample().structures.length);
  });
  test('SaveStore écrit, relit et efface sous SAVE_KEY', () => {
    const mem = new Map<string, string>();
    const s = new SaveStore({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) });
    expect(s.load()).toBeNull();
    expect(s.write(sample())).toBe(true);
    expect(mem.has(SAVE_KEY)).toBe(true);
    expect(s.load()).toEqual(sample());
    s.clear();
    expect(s.load()).toBeNull();
  });
  test('SaveStore survit à un stockage qui lève ou absent', () => {
    const boom = () => { throw new Error('quota'); };
    const s = new SaveStore({ getItem: boom, setItem: boom, removeItem: boom });
    expect(s.load()).toBeNull();
    expect(s.write(sample())).toBe(false);
    expect(() => s.clear()).not.toThrow();
    expect(new SaveStore(null).write(sample())).toBe(false);
  });
  ```

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run tests/core/save.test.ts`
  Expected: FAIL — cannot resolve `../../src/core/save`.

- [ ] **Step 3: Implement `src/core/save.ts`**

  `parse` : `JSON.parse` dans un `try`, puis vérification manuelle de la forme (pas de bibliothèque). Tout nombre requis doit passer `Number.isFinite`, sauf `respawnAt` qui peut être `null`. `version !== SAVE_VERSION` → `null`. Les clés d'inventaire hors `ITEM_IDS` et les pièces dont `kind` n'est pas dans `PIECE_KINDS` sont retirées (pas de rejet). `SaveStore` entoure chaque appel d'un `try/catch` ; `write` renvoie `false` en cas d'échec ou de stockage `null`.

- [ ] **Step 4: Run to verify they pass**

  Run: `npx vitest run tests/core/save.test.ts`
  Expected: 6 passed.

- [ ] **Step 5: Commit**

  ```bash
  git add src/core/save.ts tests/core/save.test.ts
  git commit -m "feat(save): format de sauvegarde et stockage tolérant"
  ```

---

### Task 2: Restaurer l'horloge jour/nuit

**Files:**
- Modify: `src/core/dayNight.ts`
- Test: `tests/core/dayNight.test.ts`

**Interfaces:**
- Produces: `DayNightClock.restore(t: number, day: number): void` — fixe `t` (ramené dans `[0, 1)`), `day` (au moins 1), et recale `wasNight` sur `isNight` pour qu'aucun événement ne parte au tick suivant.

- [ ] **Step 1: Write the failing tests** (ajouter à `tests/core/dayNight.test.ts`)

  ```ts
  test('restore en pleine nuit ne relance pas nightStarted', () => {
    const c = new DayNightClock(600, 0);
    c.restore(0.8, 4);
    expect(c.isNight).toBe(true);
    expect(c.day).toBe(4);
    expect(c.tick(1 / 60)).toEqual([]);
  });
  test('restore le jour puis la nuit arrive normalement', () => {
    const c = new DayNightClock(600, 0);
    c.restore(0.69, 2);
    expect(run(c, 10)).toEqual(['nightStarted']);
  });
  ```

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run tests/core/dayNight.test.ts`
  Expected: FAIL — `c.restore is not a function`.

- [ ] **Step 3: Implement `restore(t, day)`** in `src/core/dayNight.ts`.

- [ ] **Step 4: Run to verify they pass**

  Run: `npx vitest run tests/core/dayNight.test.ts`
  Expected: all passed.

- [ ] **Step 5: Commit**

  ```bash
  git add src/core/dayNight.ts tests/core/dayNight.test.ts
  git commit -m "feat(save): restaurer l'horloge jour/nuit"
  ```

---

### Task 3: Instantanés des ressources et des constructions

**Files:**
- Modify: `src/entities/Harvestables.ts`, `src/entities/Structures.ts`
- Test: `tests/entities/harvestables.test.ts`, `tests/entities/structures.test.ts` (créer)

**Interfaces:**
- Consumes: `SavedNode`, `SavedPiece` (Task 1).
- Produces:
  - `Harvestables.snapshot(): SavedNode[]` — seulement les nœuds où `hitsLeft < HARVESTABLES[kind].hits` ou `respawnAt !== null`.
  - `Harvestables.restore(nodes: SavedNode[]): void` — applique `hitsLeft`/`respawnAt`, ignore les `id` inconnus, redessine les nœuds touchés (épuisés invisibles, sans animation de pousse).
  - `Structures.snapshot(): SavedPiece[]` — dans l'ordre de pose (`placedAt` croissant).
  - `Structures.restore(pieces: SavedPiece[]): void` — `add(p)` pour chacune puis `open` ; le battant de porte est mis directement à l'angle final (pas d'animation). Ne vérifie ni coût ni validité.

- [ ] **Step 1: Write the failing tests**

  Dans `tests/entities/harvestables.test.ts` :
  ```ts
  test('snapshot ne garde que les nœuds touchés, restore les rétablit', () => {
    const a = make();
    const tree = a.nodes.find((n) => n.kind === 'tree')!;
    chop(a, tree.id);
    const snap = a.snapshot();
    expect(snap).toEqual([{ id: tree.id, hitsLeft: tree.hitsLeft, respawnAt: tree.respawnAt }]);
    const b = make();
    b.restore([...snap, { id: 'tree-99999', hitsLeft: 0, respawnAt: 5 }]);
    expect(b.targets().some((t) => t.id === tree.id)).toBe(false);
    expect(b.snapshot()).toEqual(snap);
  });
  ```

  Créer `tests/entities/structures.test.ts` (même montage que harvestables : `createTerrain(WORLD_SEED)`, `new THREE.Scene()`, `new EventBus<GameEvents>()`). `add` ne valide pas : poser directement `s.add(s.grid.snap(kind, aim, 0))` autour de `sp = terrain.spawnPoint` (plancher à `sp`, feu de camp à `sp + (4, 0)`, porte à `sp + (0, 4)`, un second feu à `sp + (8, 0)`).
  ```ts
  test('snapshot garde l’ordre de pose', () => {
    const s = build(); // floor, campfire, door, campfire
    expect(s.snapshot().map((x) => x.p.kind)).toEqual(['floor', 'campfire', 'door', 'campfire']);
  });
  test('restore rouvre les portes et refait les collisions', () => {
    const s = build();
    const door = s.snapshot().find((x) => x.p.kind === 'door')!.p;
    expect(s.toggleDoor(door)).toBe(true);
    const t = new Structures(terrain, new THREE.Scene(), new EventBus<GameEvents>());
    t.restore(s.snapshot());
    expect(t.snapshot()).toEqual(s.snapshot());
    expect(t.snapshot().find((x) => x.p.kind === 'door')!.open).toBe(true);
    expect(t.colliders()).toEqual(s.colliders()); // porte ouverte : pas de boîte
    expect(t.campfires()).toEqual(s.campfires()); // même ordre de réapparition
  });
  ```

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run tests/entities`
  Expected: FAIL — `snapshot is not a function`.

- [ ] **Step 3: Implement the four methods** in `Harvestables.ts` and `Structures.ts`.

- [ ] **Step 4: Run to verify they pass**

  Run: `npx vitest run tests/entities`
  Expected: all passed.

- [ ] **Step 5: Commit**

  ```bash
  git add src/entities/Harvestables.ts src/entities/Structures.ts tests/entities
  git commit -m "feat(save): instantanés des ressources et des constructions"
  ```

---

### Task 4: Brancher la sauvegarde dans le jeu + écran titre

**Files:**
- Modify: `src/data/balance.ts`, `src/ui/screens.ts`, `src/ui/hud.css`, `src/engine/Game.ts`, `README.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `createTitleScreen(root: HTMLElement, opts: { saveDay: number | null; onContinue: () => void; onNewGame: () => void }): Overlay`
    - `saveDay !== null` : boutons « Continuer — Jour {saveDay} » et « Nouvelle partie ». « Nouvelle partie » remplace les boutons par « Ta partie sera effacée. Sûr ? » [Oui] [Non] ; « Non » revient aux deux boutons ; « Oui » appelle `onNewGame`.
    - `saveDay === null` : un seul bouton « Jouer » qui appelle `onNewGame`.
  - Dans `Game` : `private store: SaveStore`, `private collectSave(): SaveData`, `private applySave(d: SaveData): void`, `private saveNow(): void` (ne fait rien si `state === 'title'`).

- [ ] **Step 1: Ajouter `AUTOSAVE_SEC = 30`** à `src/data/balance.ts`.

- [ ] **Step 2: Écran titre** dans `src/ui/screens.ts` selon l'interface ci-dessus ; styles des boutons secondaires et du message de confirmation dans `hud.css`, dans le style des panneaux existants.

- [ ] **Step 3: Câblage dans `Game.ts`**
  - Constructeur : stockage obtenu par `try { window.localStorage } catch { null }`, puis `this.store = new SaveStore(...)`, `const saved = this.store.load()`, écran titre avec `saveDay: saved?.clock.day ?? null`.
    - `onContinue` : `applySave(saved)`, puis le même chemin que l'ancien bouton Jouer (état `playing`, masquer, verrouiller la souris).
    - `onNewGame` : `this.store.clear()`, puis même chemin.
  - `collectSave()` : `version: SAVE_VERSION`, `savedAt: Date.now()`, `now`, `playTime`, `clock.t/day`, joueur (`position.x/y/z`, `yaw`, `vitals.health/hunger`), `inventory.snapshot()`, `structures.snapshot()`, `harvestables.snapshot()`.
  - `applySave(d)` : `now`, `playTime`, `clock.restore`, `inventory.addAll` après avoir vidé le sac de départ (`remove(inventory.snapshot())`) — l'arme se recalcule via `onChange`, `structures.restore`, `harvestables.restore`, `player.position.set(x, y, z)` + `player.yaw` + `cam.yaw = yaw`, vitals. Si `clock.isNight` : `nextRaidAt = now + 3`. Si `health <= 0` : `respawn()` après le passage à `playing`.
  - Déclencheurs de `saveNow()` :
    - toutes les `AUTOSAVE_SEC` secondes de `playTime` (dans `step`, avec un `nextSaveAt`) ;
    - passage de « en jeu » à « en pause » (front montant de `paused` dans `frame`, seulement si `state !== 'title'`) ;
    - `document` `visibilitychange` quand `document.visibilityState === 'hidden'`, et `window` `pagehide`.

- [ ] **Step 4: README** — section « Sauvegarde » : automatique (30 s, pause, fermeture), propre au navigateur, perdue si on efface les données du site ou en navigation privée, `localhost` et GitHub Pages ont des sauvegardes séparées.

- [ ] **Step 5: Vérifier type et tests**

  Run: `npm run build && npm test`
  Expected: build sans erreur, tous les tests passent.

- [ ] **Step 6: Vérifier dans le navigateur** (`preview_start` `dev`, `?debug=1`)
  - Sans sauvegarde : un seul bouton « Jouer ».
  - Jouer, récolter (K pour +20), poser un plancher + un mur + une porte ouverte + un feu de camp, couper un arbre, `Échap` → `localStorage['monster-island:save']` existe (javascript_tool).
  - Recharger : « Continuer — Jour N » ; Continuer → sac, base, porte ouverte, arbre coupé, position et heure identiques.
  - Recharger, rester sur l'écran titre, recharger encore : la sauvegarde est inchangée (`savedAt` identique).
  - N (nuit), Échap, recharger, Continuer : des rôdeurs apparaissent dans les secondes qui suivent.
  - Nouvelle partie → Non revient aux boutons ; Oui → partie neuve, clé effacée.
  - Aucune erreur dans la console.

- [ ] **Step 7: Commit**

  ```bash
  git add src/data/balance.ts src/ui/screens.ts src/ui/hud.css src/engine/Game.ts README.md
  git commit -m "feat(save): sauvegarde automatique et écran Continuer"
  ```
