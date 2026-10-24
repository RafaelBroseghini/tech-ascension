import type { ComponentProps } from "react"
import { dialogPresence } from "./useMotion.ts"

/**
 * The scrim every dialog sits in. It is a plain div that fades in with its card springing up, and fades out when the
 * dialog unmounts (Motion, in useMotion.ts). A dialog's own code is unchanged: it opens and closes by mounting and
 * unmounting, and focus, Escape and the backdrop click all act at once.
 */
export function ModalBackdrop(props: Omit<ComponentProps<"div">, "ref">) {
  return <div {...props} ref={dialogPresence} />
}
