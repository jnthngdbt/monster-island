/** Toutes les valeurs d'équilibrage du jeu. */

// Monde
export const WORLD_SEED = 1337;
export const ISLAND_RADIUS = 90;
export const MOUNTAIN = { x: -35, z: -30, r: 30, h: 9 };
export const CLEARING = { x: 15, z: -5, r: 14, h: 3 };

// Joueur & caméra
export const PLAYER_SPEED = 5;
export const JUMP_VELOCITY = 6;
export const GRAVITY = 20;
export const CAM_PITCH: readonly [number, number] = [-0.2, 1.2];
export const CAM_DIST: readonly [number, number] = [3, 12];
export const CAM_DIST_DEFAULT = 7;
export const MOUSE_SENS = 0.0025;

// Survie
export const MAX_HEALTH = 100;
export const MAX_HUNGER = 100;
export const HUNGER_DRAIN_PER_SEC = 100 / 480;
export const STARVE_DAMAGE_PER_SEC = 1;
export const REGEN_PER_SEC = 0.5;
export const REGEN_MIN_HUNGER = 60;
export const BERRY_HUNGER = 15;
