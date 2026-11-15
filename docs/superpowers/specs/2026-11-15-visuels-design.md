# Passe visuelle — conception courte (2026-11-15)

## Intention
Garder le style low-poly à facettes, mais rendre l'image moins plate et plus chaleureuse,
sans coût visible sur la fluidité.

## Buts / non-buts
- **Buts :** profondeur (ombres froides, faces éclairées chaudes), ciel vivant, terrain et eau
  variés, végétation moins uniforme.
- **Non-buts :** textures, nouveaux modèles, changement de jouabilité ou de sauvegarde.
- **Anti-but :** toute baisse perceptible d'images par seconde ; une nuit trop sombre
  (elle reste bleutée, jamais noire).

## Approches
1. **Gratuit ou calculé une fois au chargement (retenu).** Tone mapping, lumières recolorées,
   dôme de ciel en dégradé avec disque du soleil/lune, couleurs du terrain et de l'eau calculées
   à la création, teinte par instance, quelques nuages instanciés, halos en sprites.
2. **Post-traitement (bloom réel, occlusion ambiante, contours).** Écarté : plusieurs passes plein
   écran à un `pixelRatio` de 2, perte de l'anticrénelage natif (ou cible MSAA flottante), coût de
   plusieurs millisecondes sur une puce graphique intégrée. Le gain visé (halo du soleil, des feux)
   s'obtient avec l'approche 1.
3. **Matériaux PBR / textures.** Écarté : sort du style et coûte plus par pixel.

## Conception
- `engine/renderer.ts` : tone mapping ; hémisphère bleu ciel / sol chaud, moins forte ; soleil plus chaud.
- `world/sky.ts` : dôme (un appel de dessin) horizon → zénith, disque et halo du soleil/lune ;
  brouillard = couleur d'horizon ; soleil orangé quand il est bas.
- `world/terrainMesh.ts` : couleur par triangle selon biome (mélangé aux frontières), pente,
  altitude, sable mouillé, bande d'écume au rivage, fond marin plus sombre avec la profondeur.
- `world/water.ts` : couleur par sommet selon la profondeur, reflets spéculaires à facettes,
  suppression du recalcul des normales (problème connu n° 9).
- `world/instanced.ts` + `entities/Harvestables.ts` : teinte par instance, dérivée de la position
  (ne consomme pas le générateur aléatoire : les sauvegardes restent valides).
- `world/clouds.ts` : nuages low-poly, un seul `InstancedMesh`, rotation lente du groupe.
- `world/campfireLights.ts` : halo additif par feu (sprites du même pool que les lumières).
- `ui/hud.css` : vignette légère en CSS.

## Vérification
Appels de dessin et triangles avant/après (`?debug=1`), captures jour / crépuscule / nuit,
`npm test`, `npm run build`.
