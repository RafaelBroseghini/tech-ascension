import type { TargetName } from "../../game/studio/types.ts"
import type { Meter } from "./meters.ts"

/** The meters as a list: a bar per constraint once its target is known, red where `failed` names one of its targets. */
export function MeterList({ meters, failed, testid }: { meters: readonly Meter[]; failed?: ReadonlySet<TargetName>; testid: string }) {
  return (
    <dl className="studio-meters">
      {meters.map((meter) => (
        <div
          key={meter.name}
          className={failed && meter.targets.some((target) => failed.has(target)) ? "studio-meter is-fail" : "studio-meter"}
          data-testid={testid}
          data-meter={meter.name}
        >
          <dt>{meter.name}</dt>
          <dd>
            <span>{meter.value}</span>
            {meter.target ? <span className="studio-meter-target">{meter.target}</span> : null}
            {meter.fill === null ? null : <i className="studio-meter-bar" style={{ ["--fill" as string]: meter.fill }} aria-hidden />}
          </dd>
        </div>
      ))}
    </dl>
  )
}
