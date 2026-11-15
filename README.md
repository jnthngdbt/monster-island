# Monster Island

Jeu de survie et de construction 3D low-poly, jouable dans le navigateur (Three.js + Vite).
Concept : [docs/game-concept.md](docs/game-concept.md).

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

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml` : tests → build → GitHub Pages.
Si les tests échouent, rien n'est déployé.

Configuration unique sur GitHub : **Settings → Pages → Source = GitHub Actions**.
