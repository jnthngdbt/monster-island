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
