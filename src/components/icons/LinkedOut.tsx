import type { ClickIconProps } from "../../data/clickIcons.ts"

/**
 * LinkedOut badge. White "Out" outlined from Source Sans 3 Bold, the public
 * face that matches the LinkedIn wordmark, on the blue rounded mark.
 */
const VIEW_W = 186.3
const VIEW_H = 97.6

const OUT_PATH =
  "M34.2 1.2Q25.4 1.2 18.8-2.9Q12.1-7 8.3-14.6Q4.6-22.2 4.6-32.9Q4.6-43.5 8.3-51Q12.1-58.5 18.8-62.5Q25.4-66.4 34.2-66.4Q43-66.4 49.7-62.5Q56.4-58.5 60.1-51Q63.8-43.5 63.8-32.9Q63.8-22.2 60.1-14.6Q56.4-7 49.7-2.9Q43 1.2 34.2 1.2M34.2-11.5Q38.7-11.5 42-14.2Q45.2-16.8 47-21.6Q48.7-26.4 48.7-32.9Q48.7-39.4 47-44.1Q45.2-48.7 42-51.2Q38.7-53.6 34.2-53.6Q29.8-53.6 26.5-51.2Q23.2-48.7 21.5-44.1Q19.7-39.4 19.7-32.9Q19.7-26.4 21.5-21.6Q23.2-16.8 26.5-14.2Q29.8-11.5 34.2-11.5M86.3 1.2Q78.2 1.2 74.6-4.2Q70.9-9.5 70.9-18.8L70.9-49.6L85.6-49.6L85.6-20.7Q85.6-15.3 87.1-13.3Q88.6-11.3 91.8-11.3Q94.5-11.3 96.5-12.6Q98.5-13.9 100.6-16.8L100.6-49.6L115.3-49.6L115.3 0L103.3 0L102.2-6.9L101.9-6.9Q98.8-3.2 95.1-1Q91.4 1.2 86.3 1.2M143.8 1.1Q134.6 1.1 130.6-4.2Q126.6-9.6 126.6-18.1L126.6-38.1L119.9-38.1L119.9-49L127.5-49.6L129.2-64.8L141.4-64.8L141.4-49.6L153.3-49.6L153.3-38.1L141.4-38.1L141.4-18.3Q141.4-14.1 143.2-12.2Q144.9-10.4 147.8-10.4Q149-10.4 150.2-10.6Q151.4-10.8 152.5-11.2L154.9-0.9Q153-0.1 150.2 0.5Q147.3 1.1 143.8 1.1"

export const LINKEDOUT_TAGLINE = "Professional networking, but every DM is a recruiter who ghosts."

export function LinkedOutIcon({ size = 24, className }: ClickIconProps) {
  const height = size
  const width = Math.round((size * VIEW_W) / VIEW_H)
  const label = [className, "linkedout-mark"].filter(Boolean).join(" ")
  return (
    <svg className={label} width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="LinkedOut">
      <title>{`LinkedOut. ${LINKEDOUT_TAGLINE}`}</title>
      <rect width={VIEW_W} height={VIEW_H} rx="18" fill="#0A66C2" />
      <path fill="#ffffff" transform="translate(13.4 81.4)" d={OUT_PATH} />
    </svg>
  )
}
