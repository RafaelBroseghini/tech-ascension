/**
 * Output milestones: at each of these copy counts a gear or capital row doubles what every copy of it makes
 * (idle $/s and the click bonus). Rules in src/game/outputMilestones.ts.
 */
export const OUTPUT_MILESTONES: readonly number[] = [10, 25, 50, 100]

/** What each milestone multiplies the row's output by. */
export const MILESTONE_FACTOR = 2
