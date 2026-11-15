import { PIECE_KINDS, type PieceKind } from '../data/buildables';
import { ITEM_IDS, type Cost, type ItemId } from '../data/items';
import type { Placement } from './buildGrid';

/** Nom unique : tous les sites *.github.io d'un même compte partagent le stockage. */
export const SAVE_KEY = 'monster-island:save';
export const SAVE_VERSION = 1;

export type SavedPiece = { p: Placement; open: boolean };
export type SavedNode = { id: string; hitsLeft: number; respawnAt: number | null };

export type SaveData = {
  version: 1;
  savedAt: number;
  /** Temps simulé : les dates de repousse en dépendent. */
  now: number;
  playTime: number;
  clock: { t: number; day: number };
  player: { x: number; y: number; z: number; yaw: number; health: number; hunger: number };
  /** L'arme se déduit du sac. */
  inventory: Cost;
  /** Dans l'ordre de pose (ordre des feux de camp). */
  structures: SavedPiece[];
  /** Seulement les ressources entamées ou épuisées. */
  harvest: SavedNode[];
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function serialize(d: SaveData): string {
  return JSON.stringify(d);
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nums = (o: unknown, keys: string[]): o is Obj => isObj(o) && keys.every((k) => num(o[k]));

function parsePlacement(v: unknown): Placement | null {
  if (!nums(v, ['cx', 'cz', 'x', 'y', 'z', 'yaw'])) return null;
  if (typeof v.key !== 'string' || (v.rot !== 0 && v.rot !== 1)) return null;
  if (!PIECE_KINDS.includes(v.kind as PieceKind)) return null;
  const { kind, key, cx, cz, rot, x, y, z, yaw } = v as Placement;
  return { kind, key, cx, cz, rot, x, y, z, yaw };
}

/** Lit une sauvegarde. Forme incorrecte ou autre version : null. Objets et pièces inconnus : ignorés. */
export function parse(text: string | null): SaveData | null {
  if (text === null) return null;
  let d: unknown;
  try {
    d = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(d) || d.version !== SAVE_VERSION) return null;
  if (!nums(d, ['savedAt', 'now', 'playTime'])) return null;
  if (!nums(d.clock, ['t', 'day'])) return null;
  if (!nums(d.player, ['x', 'y', 'z', 'yaw', 'health', 'hunger'])) return null;
  if (!isObj(d.inventory) || !Array.isArray(d.structures) || !Array.isArray(d.harvest)) return null;

  const inventory: Cost = {};
  for (const [id, n] of Object.entries(d.inventory)) {
    if (!ITEM_IDS.includes(id as ItemId)) continue;
    if (!num(n)) return null;
    inventory[id as ItemId] = n;
  }

  const structures: SavedPiece[] = [];
  for (const s of d.structures) {
    if (!isObj(s) || typeof s.open !== 'boolean') return null;
    if (isObj(s.p) && !PIECE_KINDS.includes(s.p.kind as PieceKind)) continue;
    const p = parsePlacement(s.p);
    if (!p) return null;
    structures.push({ p, open: s.open });
  }

  const harvest: SavedNode[] = [];
  for (const h of d.harvest) {
    if (!isObj(h) || typeof h.id !== 'string' || !num(h.hitsLeft)) return null;
    if (h.respawnAt !== null && !num(h.respawnAt)) return null;
    harvest.push({ id: h.id, hitsLeft: h.hitsLeft, respawnAt: h.respawnAt });
  }

  const { clock, player } = d as unknown as SaveData;
  return {
    version: SAVE_VERSION,
    savedAt: d.savedAt,
    now: d.now,
    playTime: d.playTime,
    clock: { t: clock.t, day: clock.day },
    player: { x: player.x, y: player.y, z: player.z, yaw: player.yaw, health: player.health, hunger: player.hunger },
    inventory,
    structures,
    harvest,
  };
}

/** Accès au stockage qui ne lève jamais (navigation privée, quota plein, accès bloqué). */
export class SaveStore {
  constructor(private storage: StorageLike | null) {}

  load(): SaveData | null {
    try {
      return parse(this.storage?.getItem(SAVE_KEY) ?? null);
    } catch {
      return null;
    }
  }

  write(d: SaveData): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(SAVE_KEY, serialize(d));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      // Rien à faire : le jeu continue.
    }
  }
}
