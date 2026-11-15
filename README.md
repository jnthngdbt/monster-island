# Monster Island

Jeu de survie et de construction 3D low-poly, jouable dans le navigateur (Three.js + Vite).
Pour les 8–12 ans : coloré, jamais effrayant, sans sang.
Concept : [docs/game-concept.md](docs/game-concept.md) · Plan du MVP : [docs/superpowers/plans/2026-11-15-monster-island-mvp.md](docs/superpowers/plans/2026-11-15-monster-island-mvp.md) · Problèmes connus : [docs/known-issues.md](docs/known-issues.md).

## La boucle de jeu

1. **Explorer** l'île : plage, forêt, montagne rocheuse, clairière.
2. **Récolter** du bois (arbres), de la pierre (rochers) et des baies (buissons).
3. **Combattre** les Slimes pour récupérer de la gelée magique.
4. **Fabriquer** une potion de gelée, puis une épée de pierre à l'atelier.
5. **Construire** une base : planchers, murs, fenêtres, porte, toit, feu de camp, atelier.
6. **Survivre** à la nuit : des Slimes violets rôdent et chassent le joueur dès qu'ils le voient. Les constructions sont indestructibles : à l'abri derrière les murs, porte fermée, on ne risque rien.

## Contrôles

| Action | Touche |
|---|---|
| Marcher | W A S D (Z Q S D en AZERTY) |
| Caméra / zoom | souris / molette |
| Frapper, récolter, poser | clic gauche |
| Esquiver / sauter | Shift / Espace |
| Manger une baie / boire une potion | F / G |
| Mode construction | B, puis 1–7 pour choisir, R pour tourner, X pour démonter |
| Fabrication | C |
| Ouvrir/fermer une porte | E |
| Pause | Échap |

Mode debug : ajouter `?debug=1` à l'adresse (N = nuit, K = +20 ressources, compteur d'images).

## Jouer en local

```bash
npm install
npm run dev
```

Puis ouvrir l'adresse affichée (par défaut http://localhost:5173).

## Tests

```bash
npm test
```

La logique de jeu (`src/core`, `src/data`) n'utilise ni Three.js ni le DOM : elle est testée sous Node avec Vitest.

## Architecture

- `src/core/` — logique pure et testée (terrain, inventaire, combat, IA, grille de construction, jour/nuit…).
- `src/data/` — contenu et équilibrage (objets, monstres, recettes, pièces, `balance.ts`).
- `src/entities/` — objets du monde 3D (joueur, monstres, ressources, constructions).
- `src/world/` — rendu : terrain, eau, ciel, modèles low-poly, particules.
- `src/ui/` — interface HTML/CSS (HUD, fabrication, construction, écrans).
- `src/engine/` — boucle de jeu (`Game.ts`), rendu, entrées.

Ajouter un monstre : une entrée dans `src/data/monsters.ts` et un modèle dans `src/world/models.ts`.

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml` : tests → build → GitHub Pages.
Si les tests échouent, rien n'est déployé.

Configuration unique sur GitHub : **Settings → Pages → Source = GitHub Actions**.
