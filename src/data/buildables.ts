import type { Cost } from './items';

export type PieceKind = 'floor' | 'wall' | 'window' | 'door' | 'roof' | 'campfire' | 'workbench';
export type Slot = 'floor' | 'edge' | 'roof' | 'object';

export type BuildableDef = { label: string; icon: string; cost: Cost; slot: Slot; hp: number };

/** L'ordre des clés = l'ordre des touches 1 à 7. */
export const BUILDABLES: Record<PieceKind, BuildableDef> = {
  floor: { label: 'Plancher', icon: '🟫', cost: { wood: 2 }, slot: 'floor', hp: 80 },
  wall: { label: 'Mur', icon: '🧱', cost: { wood: 3 }, slot: 'edge', hp: 120 },
  window: { label: 'Fenêtre', icon: '🪟', cost: { wood: 3 }, slot: 'edge', hp: 100 },
  door: { label: 'Porte', icon: '🚪', cost: { wood: 4 }, slot: 'edge', hp: 100 },
  roof: { label: 'Toit', icon: '🛖', cost: { wood: 3 }, slot: 'roof', hp: 80 },
  campfire: { label: 'Feu de camp', icon: '🔥', cost: { wood: 3, stone: 2 }, slot: 'object', hp: 60 },
  workbench: { label: 'Atelier', icon: '🛠️', cost: { wood: 5, stone: 3 }, slot: 'object', hp: 100 },
};

export const PIECE_KINDS = Object.keys(BUILDABLES) as PieceKind[];

export const CELL = 2;
export const WALL_HEIGHT = 3;
export const FLOOR_THICKNESS = 0.2;
export const MAX_SLOPE = 1.2;
export const BUILD_REACH = 8;
export const EDGE_THICKNESS = 0.3;
export const OBJECT_SIZE = 1.2;
