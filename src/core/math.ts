export type Vec2 = { x: number; z: number };

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export const dist2D = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Direction avant en XZ : yaw 0 → +Z. */
export const forwardFromYaw = (yaw: number): Vec2 => ({ x: Math.sin(yaw), z: Math.cos(yaw) });

/** b − a ramené dans ]-π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d <= -Math.PI) d += 2 * Math.PI;
  if (d > Math.PI) d -= 2 * Math.PI;
  return d;
}

export type MoveKeys = { forward: boolean; back: boolean; left: boolean; right: boolean };

/** Vecteur de déplacement (normalisé ou nul) relatif au lacet de la caméra. */
export function moveVector(keys: MoveKeys, cameraYaw: number): Vec2 {
  const f = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
  const r = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (f === 0 && r === 0) return { x: 0, z: 0 };
  const fw = forwardFromYaw(cameraYaw);
  const rt = { x: -Math.cos(cameraYaw), z: Math.sin(cameraYaw) };
  const x = fw.x * f + rt.x * r;
  const z = fw.z * f + rt.z * r;
  const len = Math.hypot(x, z);
  return { x: x / len, z: z / len };
}

export type Vec3 = { x: number; y: number; z: number };

/** Position de la caméra en orbite derrière la cible. */
export function orbitPosition(target: Vec3, yaw: number, pitch: number, distance: number): Vec3 {
  return {
    x: target.x - Math.sin(yaw) * Math.cos(pitch) * distance,
    y: target.y + 1.6 + Math.sin(pitch) * distance,
    z: target.z - Math.cos(yaw) * Math.cos(pitch) * distance,
  };
}
