/** The window bar across the top of the desk: three lights and the game's name. The lights are for show and do nothing. */
export function TitleBar() {
  return (
    <header className="titlebar" data-testid="titlebar">
      <span className="titlebar-lights" aria-hidden>
        <i className="titlebar-light is-close" />
        <i className="titlebar-light is-min" />
        <i className="titlebar-light is-max" />
      </span>
      <span className="titlebar-name" aria-hidden>
        Tech Ascension
      </span>
    </header>
  )
}
