/**
 * Pixel art ids for the phase content. Art ids are the sprite ids in src/pixel/art.ts (0 = opening
 * scene, 1–18 = the retired early generators, 19–66 = the capital ladder). The 18 skills use each
 * early drawing exactly once; gigs, jobs and equipment reuse drawings from the same sheet.
 * Index = item id - 1.
 */
export const SKILL_ART: readonly number[] = [1, 3, 5, 2, 15, 6, 7, 4, 8, 11, 9, 13, 12, 16, 18, 10, 17, 14]
export const GIG_ART: readonly number[] = [2, 9, 11, 13, 12, 18, 17, 16]
export const JOB_ART: readonly number[] = [17, 19, 21, 22, 24, 23, 29, 32]
export const EQUIP_ART: readonly number[] = [8, 4, 10, 6, 14]
