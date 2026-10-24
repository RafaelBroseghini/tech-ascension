import { beforeEach, describe, expect, it, vi } from "vitest"
import { CAT_ROSTER } from "./catRoster.ts"
import { getDeskActivity, getDeskPrefs, parseDeskPrefs, pokeDesk, reducedMotion, setDeskPref, subscribeDeskActivity, subscribeDeskPrefs } from "./desk.ts"
import { readPref } from "./ledger.ts"

describe("desk", () => {
  beforeEach(() => {
    setDeskPref("music", false)
    setDeskPref("sounds", true)
    setDeskPref("clicks", true)
    setDeskPref("cat", true)
    setDeskPref("hoverClick", false)
  })

  it("keeps a known auto-click input and falls back to auto for anything else", () => {
    expect(parseDeskPrefs({ hoverMode: "hold" }).hoverMode).toBe("hold")
    expect(parseDeskPrefs({ hoverMode: "touch" }).hoverMode).toBe("auto")
    expect(parseDeskPrefs(null).hoverMode).toBe("auto")
  })

  it("follows the system's reduce-motion request unless the player chose full motion", () => {
    const asked = (on: boolean) => {
      vi.stubGlobal("window", { matchMedia: (query: string) => ({ matches: on && query.includes("reduce") }), addEventListener() {} })
    }
    expect(parseDeskPrefs(null).motion).toBe("system")
    expect(parseDeskPrefs({ motion: "full" }).motion).toBe("full")
    expect(parseDeskPrefs({ motion: "weird" }).motion).toBe("system")
    asked(true)
    setDeskPref("motion", "system")
    expect(reducedMotion()).toBe(true)
    setDeskPref("motion", "full")
    expect(reducedMotion()).toBe(false)
    asked(false)
    setDeskPref("motion", "system")
    expect(reducedMotion()).toBe(false)
    vi.unstubAllGlobals()
  })

  it("starts with music off, desk sounds on, and the cat out", () => {
    expect(parseDeskPrefs(null)).toEqual({
      music: false,
      musicStyle: "cozy",
      sounds: true,
      clicks: true,
      clickKit: "thock",
      cat: true,
      catArt: null,
      parade: true,
      paradeStyle: "bounce",
      paradeSource: "all",
      hoverClick: false,
      hoverMode: "auto",
      motion: "system",
      heroOffsetX: 0,
      heroOffsetY: 0,
    })
    expect(parseDeskPrefs("nope")).toEqual({
      music: false,
      musicStyle: "cozy",
      sounds: true,
      clicks: true,
      clickKit: "thock",
      cat: true,
      catArt: null,
      parade: true,
      paradeStyle: "bounce",
      paradeSource: "all",
      hoverClick: false,
      hoverMode: "auto",
      motion: "system",
      heroOffsetX: 0,
      heroOffsetY: 0,
    })
    expect(parseDeskPrefs(JSON.stringify({ music: true, musicStyle: "edm", hoverClick: "yes" }))).toEqual({
      music: true,
      musicStyle: "edm",
      sounds: true,
      clicks: true,
      clickKit: "thock",
      cat: true,
      catArt: null,
      parade: true,
      paradeStyle: "bounce",
      paradeSource: "all",
      hoverClick: false,
      hoverMode: "auto",
      motion: "system",
      heroOffsetX: 0,
      heroOffsetY: 0,
    })
  })

  it("keeps a stored click kit and falls back to thock for an unknown one", () => {
    expect(parseDeskPrefs(JSON.stringify({ clickKit: "felt" })).clickKit).toBe("felt")
    expect(parseDeskPrefs(JSON.stringify({ clickKit: "beep" })).clickKit).toBe("thock")
    expect(parseDeskPrefs(JSON.stringify({ catArt: CAT_ROSTER[0]!.url })).catArt).toBe(CAT_ROSTER[0]!.url)
    expect(parseDeskPrefs(JSON.stringify({ catArt: "https://example.com/dog.gif" })).catArt).toBeNull()
  })

  it("keeps the click apart from the room's desk sounds", () => {
    expect(parseDeskPrefs(JSON.stringify({ sounds: false, clicks: true }))).toMatchObject({ sounds: false, clicks: true })
    expect(parseDeskPrefs(JSON.stringify({ sounds: true, clicks: false }))).toMatchObject({ sounds: true, clicks: false })
    // saved before the click had its own switch: a muted room stays muted
    expect(parseDeskPrefs(JSON.stringify({ sounds: false })).clicks).toBe(false)
    expect(parseDeskPrefs(JSON.stringify({ sounds: true })).clicks).toBe(true)
    setDeskPref("sounds", false)
    expect(getDeskPrefs().clicks).toBe(true)
  })

  it("persists a switch", () => {
    setDeskPref("music", true)
    expect(getDeskPrefs().music).toBe(true)
    expect(readPref("desk")).toMatchObject({ music: true })
    setDeskPref("cat", false)
    expect(getDeskPrefs().cat).toBe(false)
    setDeskPref("parade", false)
    expect(readPref("desk")).toMatchObject({ parade: false })
    expect(parseDeskPrefs(JSON.stringify({ parade: false })).parade).toBe(false)
    expect(parseDeskPrefs(JSON.stringify({ paradeStyle: "heart" })).paradeStyle).toBe("heart")
    expect(parseDeskPrefs(JSON.stringify({ paradeStyle: "moonwalk" })).paradeStyle).toBe("bounce")
    expect(parseDeskPrefs(JSON.stringify({ paradeSource: "gear" })).paradeSource).toBe("gear")
    expect(parseDeskPrefs(JSON.stringify({ paradeSource: "dogs" })).paradeSource).toBe("all")
  })

  it("wakes listeners for switches, and clicks wake the cat without toggling sound", () => {
    const prefs = vi.fn()
    const taps = vi.fn()
    const stopPrefs = subscribeDeskPrefs(prefs)
    const stopTaps = subscribeDeskActivity(taps)
    const before = getDeskActivity()
    setDeskPref("sounds", false)
    pokeDesk()
    expect(prefs).toHaveBeenCalledTimes(1)
    expect(taps).toHaveBeenCalledTimes(1)
    expect(getDeskActivity()).toBe(before + 1)
    expect(getDeskPrefs().sounds).toBe(false)
    stopPrefs()
    stopTaps()
  })

  it("reads a room that was already stored", async () => {
    vi.resetModules()
    const ledger = await import("./ledger.ts")
    ledger.writePref("desk", { music: true, sounds: false, cat: false })
    const fresh = await import("./desk.ts")
    expect(fresh.getDeskPrefs()).toEqual({
      music: true,
      musicStyle: "cozy",
      sounds: false,
      clicks: false,
      clickKit: "thock",
      cat: false,
      catArt: null,
      parade: true,
      paradeStyle: "bounce",
      paradeSource: "all",
      hoverClick: false,
      hoverMode: "auto",
      motion: "system",
      heroOffsetX: 0,
      heroOffsetY: 0,
    })
  })
})
