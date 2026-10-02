import { useEffect, useMemo, useState } from "react"
import { backdropForTier } from "../data/backdrops.ts"
import type { Backdrop } from "../data/backdrops.ts"
import { bgUrls } from "../pixel/backgrounds.ts"

type Layer = Backdrop & { uid: number }

let layerSeq = 1

function BackdropLayer({ layer, enter }: { layer: Layer; enter: boolean }) {
  const urls = useMemo(() => bgUrls(layer.key, layer.hot), [layer.key, layer.hot])
  return (
    <div className={enter ? "backdrop-layer backdrop-enter" : "backdrop-layer"} data-bg={layer.key} data-hot={layer.hot || undefined}>
      <img src={urls.base} alt="" draggable={false} />
      {urls.blink ? <img className="backdrop-blink" src={urls.blink} alt="" draggable={false} /> : null}
    </div>
  )
}

/** Era-shared pixel backdrop for the stage. A change of scene fades the new one in over the old. */
export function StageBackdrop({ tierId }: { tierId: number }) {
  const next = backdropForTier(tierId)
  const [layers, setLayers] = useState<Layer[]>(() => [{ ...next, uid: layerSeq++ }])
  const top = layers[layers.length - 1]

  if (!top || top.key !== next.key || top.hot !== next.hot) {
    setLayers([...layers.slice(-1), { ...next, uid: layerSeq++ }])
  }

  useEffect(() => {
    if (layers.length < 2) return
    const id = window.setTimeout(() => setLayers((current) => current.slice(-1)), 700)
    return () => window.clearTimeout(id)
  }, [layers])

  return (
    <div className="backdrop" aria-hidden="true" data-testid="backdrop" data-bg={top?.key}>
      {layers.map((layer, index) => (
        <BackdropLayer key={layer.uid} layer={layer} enter={layers.length > 1 && index === layers.length - 1} />
      ))}
    </div>
  )
}
