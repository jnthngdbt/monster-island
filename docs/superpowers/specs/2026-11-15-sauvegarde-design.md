# Sauvegarde de la partie — design

## Pourquoi

Aujourd'hui, fermer l'onglet efface tout : base, sac, jours survécus. Un joueur de 8–12 ans doit pouvoir
fermer le jeu et reprendre plus tard sa partie là où il l'a laissée.

## Objectifs

- Sauvegarde automatique, sans action du joueur.
- Écran titre : « Continuer » reprend la partie, « Nouvelle partie » repart de zéro (avec confirmation).
- Une partie sauvegardée corrompue ou d'une ancienne version ne fait jamais planter le jeu.

## Hors périmètre

- Synchronisation entre ordinateurs ou navigateurs (décidé : même navigateur seulement).
- Fichier de sauvegarde à exporter/importer, plusieurs emplacements de sauvegarde, comptes, serveur.
- Sauvegarder les monstres (ils réapparaissent comme aujourd'hui).

## Anti-objectifs

- Perdre une partie à cause d'une mise à jour du jeu sans prévenir.
- Un bouton qui efface la partie en un clic par erreur.

## Approches envisagées

| Approche | Pour | Contre |
|---|---|---|
| **`localStorage` (retenue)** | ~5 Mo, natif, aucun serveur, synchrone et simple | Limité à un navigateur ; effacé avec les données du site |
| Cookies | Natifs | ~4 Ko : une grande base ne tient pas ; envoyés à chaque requête pour rien |
| IndexedDB | Grande capacité | API asynchrone plus lourde, inutile pour quelques Ko |
| Sauvegarde en ligne | Suit le joueur partout | Serveur + comptes : hors de propos pour un jeu statique sur GitHub Pages pour enfants |

## Ce qui est sauvegardé

Le terrain et l'emplacement des ressources viennent de `WORLD_SEED` : on ne les sauvegarde pas.

```ts
type SaveData = {
  version: 1;
  savedAt: number;              // Date.now(), pour l'affichage « Jour 3 »
  now: number;                  // temps simulé (les dates de repousse en dépendent)
  playTime: number;             // pour ne pas réafficher les astuces
  clock: { t: number; day: number };
  player: { x: number; y: number; z: number; yaw: number; health: number; hunger: number };
  inventory: Cost;              // l'arme se déduit du sac (bestWeapon)
  structures: { p: Placement; open: boolean }[];  // dans l'ordre de pose (ordre des feux de camp)
  harvest: { id: string; hitsLeft: number; respawnAt: number | null }[];  // seulement les nœuds modifiés
};
```

- Position 3D complète (`x, y, z`) : `teleport()` poserait le joueur sous un plancher surélevé.
- Non sauvegardés : invulnérabilité, esquive, monstres, particules.

## Fonctionnement

- **`src/core/save.ts`** (pur, testé sous Node) : `serialize(data)` et `parse(text): SaveData | null`.
  `parse` vérifie la forme et la version ; tout ce qui ne colle pas renvoie `null`.
  Les accès au stockage passent par une petite interface (`getItem`/`setItem`/`removeItem`) pour les tests.
- **Clé** : `monster-island:save`. Nom unique, car tous les sites `*.github.io` d'un même compte partagent le stockage.
- **Quand on sauvegarde** : toutes les 30 s de jeu, à la mise en pause, et quand l'onglet est caché ou fermé
  (`visibilitychange` / `pagehide`). Jamais sur l'écran titre.
- **Chargement** (`Game`) : restaure l'horloge (nouvelle méthode `DayNightClock.restore(t, day)` qui recale aussi
  `wasNight`), le sac, le joueur, les pièces (`Structures.add` direct, sans coût ni validation, puis l'état des portes),
  et les nœuds de ressources.
- **Cas particuliers** :
  - Chargé la nuit : programmer les rôdeurs (`nextRaidAt = now + 3`), comme au début d'une nuit.
  - Santé à 0 dans la sauvegarde : le joueur se relève au feu de camp (`respawn`) au lieu de rester K.O.
- **Erreurs** : chaque accès à `localStorage` est dans un `try/catch` (navigation privée, quota plein).
  En cas d'échec, le jeu continue sans sauvegarde. Une sauvegarde illisible est ignorée : l'écran titre
  propose seulement « Jouer ».
- **Version** : `version: 1`. Une future version qui change le format ajoute une conversion depuis 1,
  ou à défaut ignore l'ancienne sauvegarde.

## Écran titre

```
        Monster Island
  [ Continuer — Jour 3 ]      ← seulement si une sauvegarde valide existe
  [ Nouvelle partie ]         ← « Ta partie sera effacée. Sûr ? » [Oui] [Non]
```

Sans sauvegarde : un seul bouton « Jouer », comme aujourd'hui.

## Laissé au constructeur

- Mise en forme exacte des boutons et du message de confirmation (style des panneaux existants).
- Petit toast « Partie sauvegardée » discret ou non (mon choix : non, pour ne pas distraire).
- Tests : `parse` (valide, JSON cassé, mauvaise version, champs manquants), aller-retour `serialize`/`parse`,
  `DayNightClock.restore`.
