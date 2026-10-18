import { FLAG_URLS } from "./flags.ts"

/** A country's flag as an SVG, so it draws the same on every platform. Empty for an unknown country. */
export function CityFlag({ country }: { country: string }) {
  const url = /^[A-Z]{2}$/.test(country) ? FLAG_URLS[country] : undefined
  if (!url) return null
  return <img className="city-flag" src={url} alt="" aria-hidden />
}
