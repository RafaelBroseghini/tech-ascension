import "flag-icons/css/flag-icons.min.css"

/** A country's flag as an SVG, so it draws the same on every platform. Empty for an unknown country. */
export function CityFlag({ country }: { country: string }) {
  if (!/^[A-Z]{2}$/.test(country)) return null
  return <span className={`fi fi-${country.toLowerCase()} city-flag`} aria-hidden />
}
