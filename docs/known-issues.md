# Problèmes connus (à corriger plus tard)

Problèmes mineurs relevés par la revue finale du MVP (2026-11-15). Aucun ne bloque une partie.
Classés du plus visible pour un joueur au moins visible.

## Jeu

### 1. Pièces qui flottent après un démontage
- **Où :** `src/entities/Structures.ts` (`remove`) ; les supports ne sont vérifiés qu'à la pose (`BuildGrid.validate`).
- **Symptôme :** un mur démonté laisse son toit flotter. Un plancher retiré laisse le feu de camp, l'atelier ou les murs en l'air (0,2 m ou plus).
- **Piste :** retirer en cascade (avec remboursement) les pièces qui perdent leur support, ou interdire de retirer une pièce qui en soutient une autre.

### 2. Un plancher posé après un objet l'enterre à moitié
- **Où :** `src/core/buildGrid.ts` (`validate`).
- **Symptôme :** un feu de camp ou un atelier posé avant le plancher se retrouve à moitié dans le plancher. Les planchers peuvent aussi recouvrir les buissons (ils ne comptent pas comme obstacles).
- **Piste :** refuser un plancher sur une case qui contient déjà un objet (ou remonter l'objet), et compter les buissons comme obstacles pour les planchers.

### 3. Des Slimes de jour peuvent apparaître dans la base
- **Où :** `src/entities/Monsters.ts` (`maintainPopulation`).
- **Symptôme :** un Slime peut apparaître à l'intérieur d'une base fermée pendant que le joueur est ailleurs.
- **Piste :** refuser les positions qui touchent une construction (`Structures.overlaps`).

### 4. Accords en français
- **Où :** `src/entities/BuildController.ts` (toast de démontage) ; `src/engine/Game.ts` (toast de fabrication).
- **Symptôme :** « Fenêtre démonté », « Porte démonté » au lieu de « démontée ». Le toast de fabrication écrit toujours « fabriquée » : correct seulement parce que les deux recettes actuelles sont féminines.
- **Piste :** ajouter un indicateur `feminine` (ou le participe passé) dans `src/data/buildables.ts` et `src/data/recipes.ts`.

### 5. Fermer la fabrication avec Échap laisse le jeu en pause
- **Où :** `src/engine/input.ts` (`requestLock`), `src/ui/craftPanel.ts`.
- **Symptôme :** Échap n'est pas un « geste utilisateur » pour le navigateur : le verrouillage de la souris est refusé et l'écran de pause s'affiche (il faut cliquer pour reprendre). Chrome refuse aussi un nouveau verrouillage dans la seconde qui suit un Échap : un clic rapide sur « Reprendre » ne fait rien. Le refus apparaît comme une erreur non gérée dans la console.
- **Piste :** ajouter `.catch(() => {})` à `requestPointerLock()`, et faire aller Échap directement à l'écran de pause.

### 6. Quelques pas de simulation en trop après un changement d'état
- **Où :** `src/engine/Game.ts` (rappel de `stepper.advance`).
- **Symptôme :** quand une image demande plusieurs pas, ceux-ci continuent après un K.O. ou l'ouverture du panneau de fabrication (jusqu'à environ 0,23 s). Les monstres agissent encore brièvement ; `knockOut()` est rappelé (sans effet visible).
- **Piste :** dans le rappel, ne rien faire si `this.paused` est vrai.

## Performance

### 7. Mémoire graphique jamais libérée
- **Où :** `src/entities/Monsters.ts` (retrait des monstres), `src/entities/Structures.ts` (retrait des pièces, matériaux « fissurés » clonés), `src/entities/BuildController.ts` (fantôme recréé à chaque touche 1–7 ou B).
- **Symptôme :** les géométries et matériaux sont retirés de la scène mais jamais libérés (`dispose`). Faible par objet, mais la mémoire augmente sans limite sur une longue partie (de nouveaux monstres de nuit arrivent toutes les 20 s).
- **Piste :** partager les géométries des Slimes et des pièces au niveau du module (comme `Pickup`) et libérer les matériaux propres à chaque objet au retrait.

### 8. Le mode construction teste tout le terrain à chaque pas
- **Où :** `src/entities/BuildController.ts` (`aimPoint`).
- **Symptôme :** un lancer de rayon sur les 51 200 triangles du terrain à chaque pas de simulation (environ 2 ms mesurés, ~11 % d'une image à 60 fps).
- **Piste :** viser une fois par image, ou avancer le long du rayon avec `terrain.heightAt`.

### 9. Calcul inutile sur l'eau à chaque image
- **Où :** `src/world/water.ts` (`computeVertexNormals()` dans `update`).
- **Symptôme :** les normales sont recalculées à chaque image alors que `flatShading` ne s'en sert pas.
- **Piste :** supprimer la ligne.

## Déploiement

### 10. Actions GitHub sur Node 20
- **Où :** `.github/workflows/deploy.yml`.
- **Symptôme :** GitHub signale que `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` et `actions/deploy-pages@v4` visent Node 20, qui est retiré. Elles tournent pour l'instant de force sur Node 24 ; rien n'est cassé.
- **Piste :** passer aux versions majeures suivantes de ces actions.

## Choix gardés volontairement (à revoir si besoin)

- **K.O. en boucle la nuit :** réapparaître à un feu de camp entouré de monstres peut mener à plusieurs K.O. jusqu'à l'aube (seulement 3 s d'invulnérabilité, comme prévu au plan).
- **Pas de tablette ni d'écran tactile :** le jeu a besoin du verrouillage de la souris ; le concept vise les ordinateurs.
- **On traverse les bords des planchers surélevés :** les planchers n'ont pas de collision (marche maximale de 0,8 m).
- **« Tu es tombé dans les pommes » au masculin :** pourrait devenir une tournure neutre.
