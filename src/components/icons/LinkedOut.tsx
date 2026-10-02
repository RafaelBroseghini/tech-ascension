import type { ClickIconProps } from "../../data/clickIcons.ts"

/**
 * LinkedOut badge. White "out" outlined from Source Sans 3 Bold, the public
 * face that matches the LinkedIn wordmark, on the blue rounded mark.
 */
const VIEW_W = 174.4
const VIEW_H = 96

const OUT_PATH =
  "M27.8 1.2Q21.5 1.2 16-1.9Q10.5-4.9 7.1-10.7Q3.6-16.6 3.6-24.8Q3.6-33 7.1-38.9Q10.5-44.7 16-47.7Q21.5-50.8 27.8-50.8Q34-50.8 39.5-47.7Q45-44.7 48.5-38.9Q51.9-33 51.9-24.8Q51.9-16.6 48.5-10.7Q45-4.9 39.5-1.9Q34 1.2 27.8 1.2M27.8-10.7Q30.8-10.7 32.9-12.4Q34.9-14.1 35.9-17.3Q36.9-20.5 36.9-24.8Q36.9-29.1 35.9-32.3Q34.9-35.5 32.9-37.2Q30.8-38.9 27.8-38.9Q24.7-38.9 22.7-37.2Q20.7-35.5 19.7-32.3Q18.7-29.1 18.7-24.8Q18.7-20.5 19.7-17.3Q20.7-14.1 22.7-12.4Q24.7-10.7 27.8-10.7M73.4 1.2Q65.3 1.2 61.6-4.2Q58-9.5 58-18.8L58-49.6L72.7-49.6L72.7-20.7Q72.7-15.3 74.2-13.3Q75.7-11.3 78.9-11.3Q81.6-11.3 83.6-12.6Q85.6-13.9 87.7-16.8L87.7-49.6L102.4-49.6L102.4 0L90.4 0L89.3-6.9L89-6.9Q85.9-3.2 82.2-1Q78.5 1.2 73.4 1.2M130.9 1.1Q121.7 1.1 117.7-4.2Q113.7-9.6 113.7-18.1L113.7-38.1L107-38.1L107-49L114.6-49.6L116.3-64.8L128.5-64.8L128.5-49.6L140.4-49.6L140.4-38.1L128.5-38.1L128.5-18.3Q128.5-14.1 130.3-12.2Q132-10.4 134.9-10.4Q136.1-10.4 137.3-10.6Q138.5-10.8 139.6-11.2L142-0.9Q140.1-0.1 137.3 0.5Q134.4 1.1 130.9 1.1"

export function LinkedOutIcon({ size = 24, className }: ClickIconProps) {
  const height = size
  const width = Math.round((size * VIEW_W) / VIEW_H)
  const label = [className, "linkedout-mark"].filter(Boolean).join(" ")
  return (
    <svg className={label} width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="LinkedOut">
      <title>LinkedOut. Professional networking, but every DM is a recruiter who ghosts.</title>
      <rect width={VIEW_W} height={VIEW_H} rx="17" fill="#0A66C2" />
      <path fill="#ffffff" transform="translate(14.4 79.8)" d={OUT_PATH} />
    </svg>
  )
}
