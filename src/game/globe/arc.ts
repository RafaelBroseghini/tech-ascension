import { Vector3 } from "three"

/** A point on the sphere of radius `r` at a latitude and longitude, in the globe's own axes. */
export function onSphere(lat: number, lon: number, r = 1): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lon + 180) * Math.PI) / 180
  return new Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

/** An arc must stay at least this far from the centre (the ball has radius 1) between its ends. */
const CLEAR = 1.05

/** A direction at right angles to `a`, so an arc between antipodes still has a side to bulge toward. */
function sideOf(a: Vector3): Vector3 {
  const up = a.clone().cross(new Vector3(0, 1, 0))
  return up.length() > 1e-3 ? up.normalize() : a.clone().cross(new Vector3(1, 0, 0)).normalize()
}

/**
 * The middle control point of the arc from `a` to `b`. Its midpoint stands `1.12 + 0.3 × chord` off the centre (lower for a
 * short hop), so an arc clears the ball however far apart its ends are. Pairs close to antipodal have no sensible midpoint direction (their
 * sum is near zero), so the arc bulges to one side instead.
 */
export function controlOf(a: Vector3, b: Vector3): Vector3 {
  const chord = a.distanceTo(b)
  // A short hop stays low and round; a long one rises with its length (the two meet at a chord of 0.36).
  const target = Math.min(1.12 + 0.3 * chord, 1.03 + 0.55 * chord)
  // A short hop only has to stay off the surface it starts and ends on.
  const clear = Math.min(CLEAR, 1.004 + 0.25 * chord)
  const sum = a.clone().add(b)
  const dir = sum.length() > 0.25 ? sum.clone().normalize() : sideOf(a)
  // The curve's midpoint is a/4 + c/2 + b/4, so along `dir` it stands 0.25 (sum·dir) + 0.5 |c| from the centre.
  let lift = 2 * (target - 0.25 * sum.dot(dir))
  // The formula can still let an arc dip into the ball between far-apart ends, so push the bend out until it clears.
  for (let step = 0; step < 40; step++) {
    const c = dir.clone().multiplyScalar(lift)
    if (closestToCentre(a, c, b) >= clear) return c
    lift *= 1.08
  }
  return dir.multiplyScalar(lift)
}

/** The lowest the arc gets to the centre between its ends, sampled along its middle. */
export function closestToCentre(a: Vector3, c: Vector3, b: Vector3): number {
  let min = Infinity
  for (let i = 10; i <= 90; i++) min = Math.min(min, bezier(a, c, b, i / 100).length())
  return min
}

export function bezier(a: Vector3, c: Vector3, b: Vector3, t: number): Vector3 {
  const u = 1 - t
  return a.clone().multiplyScalar(u * u).addScaledVector(c, 2 * u * t).addScaledVector(b, t * t)
}

/** A client closer than this (an angle, in radians) to a point of presence lands on the ring around it, not on its centre. */
export const NEAR_ANGLE = 0.06
/** How far from a point of presence's centre that ring is, as an angle. */
export const RING_ANGLE = 0.04

/** A number in [0, 1) that is the same for the same id, so a city always bends the same way. */
export function seedOf(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10007) / 10007
}

/**
 * Where an edge from `from` ends at the point of presence `pop`. Far clients end on its centre. A client in the same city, or
 * close by, would draw a needle straight up, so its edge hooks sideways onto the ring around the server instead, on the side
 * the id's `seed` picks.
 */
export function landingOf(from: Vector3, pop: Vector3, seed: number): Vector3 {
  const p = pop.clone().normalize()
  const f = from.clone().normalize()
  if (f.angleTo(p) >= NEAR_ANGLE) return pop.clone()
  const toward = f.addScaledVector(p, -f.dot(p))
  let t: Vector3
  if (toward.length() < 1e-4) {
    const e1 = sideOf(p)
    const e2 = p.clone().cross(e1)
    const turn = seed * 2 * Math.PI
    t = e1.multiplyScalar(Math.cos(turn)).addScaledVector(e2, Math.sin(turn))
  } else {
    t = p.clone().cross(toward.normalize()).multiplyScalar(seed < 0.5 ? 1 : -1)
  }
  return p.multiplyScalar(Math.cos(RING_ANGLE)).addScaledVector(t, Math.sin(RING_ANGLE)).multiplyScalar(pop.length())
}
