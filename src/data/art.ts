/**
 * Pixel art ids for the phase content. Art ids are the sprite ids in src/pixel/art.ts (0 = opening
 * scene, 1-18 = the early drawings, 19-66 = the later ones, which capital rows pick through `artId`).
 * Index = item id - 1. A table can be shorter than its catalog: `artFor` repeats it in order, so a
 * bigger catalog needs no art edit. Jobs stay below art 34 so a first capital buy never moves the stage backwards.
 */
export const SKILL_ART: readonly number[] = [1, 3, 5, 2, 15, 6, 7, 4, 8, 11, 9, 13, 12, 16, 18, 10, 17, 14]
export const GIG_ART: readonly number[] = [2, 9, 11, 13, 12, 18, 17, 16, 3, 4, 5, 6, 7, 8, 10, 14, 15, 1]
export const JOB_ART: readonly number[] = [17, 19, 21, 22, 24, 23, 29, 32, 20, 25, 26, 27, 28, 30, 31, 33]
export const EQUIP_ART: readonly number[] = [8, 4, 10, 6, 14, 1, 2, 3, 5, 7, 9, 11, 12, 13, 15, 16, 17, 18]

/** Drawing for item `id` (1-based). Ids past the end of a table reuse its drawings in order. */
export function artFor(table: readonly number[], id: number): number {
  if (table.length === 0 || !Number.isInteger(id) || id < 1) return 1
  return table[(id - 1) % table.length] ?? 1
}
