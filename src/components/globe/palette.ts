import type { RequestType } from "../../game/globe/wave.ts"

/** One colour per kind of request, as a hex number for the renderer and a string for the HUD. */
export const TYPE_COLOR: Readonly<Record<RequestType, number>> = {
  read: 0x89b4fa,
  write: 0xfab387,
}

export const TYPE_LABEL: Readonly<Record<RequestType, string>> = {
  read: "Reads",
  write: "Writes",
}

export const css = (color: number): string => `#${color.toString(16).padStart(6, "0")}`

export const DROP_COLOR = 0xf38ba8
