import type { ReadoutLine } from "./meters.ts"

/** The request counts, busiest node and single points of failure, one line each. */
export function Readout({ lines, testid }: { lines: readonly ReadoutLine[]; testid: string }) {
  return (
    <ul className="studio-readout" data-testid={testid}>
      {lines.map((line) => (
        <li key={line.key} data-line={line.key}>
          {line.text}
        </li>
      ))}
    </ul>
  )
}
