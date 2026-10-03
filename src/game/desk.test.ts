import { beforeEach, describe, expect, it, vi } from "vitest"
import { getDeskActivity, getDeskPrefs, parseDeskPrefs, pokeDesk, setDeskPref, subscribeDeskActivity, subscribeDeskPrefs } from "./desk.ts"
import { readPref } from "./ledger.ts"

describe("desk", () => {
  beforeEach(() => {
    setDeskPref("music", false)
    setDeskPref("sounds", true)
    setDeskPref("cat", true)
    setDeskPref("enemies", true)
    setDeskPref("hoverClick", false)
  })

  it("starts with music off, desk sounds on, the cat out, and enemies on", () => {
    expect(parseDeskPrefs(null)).toEqual({ music: false, musicStyle: "cozy", sounds: true, cat: true, enemies: true, hoverClick: false })
    expect(parseDeskPrefs("nope")).toEqual({ music: false, musicStyle: "cozy", sounds: true, cat: true, enemies: true, hoverClick: false })
    expect(parseDeskPrefs(JSON.stringify({ music: true, musicStyle: "edm", hoverClick: "yes" }))).toEqual({
      music: true,
      musicStyle: "edm",
      sounds: true,
      cat: true,
      enemies: true,
      hoverClick: false,
    })
  })

  it("persists a switch", () => {
    setDeskPref("music", true)
    expect(getDeskPrefs().music).toBe(true)
    expect(readPref("desk")).toMatchObject({ music: true })
    setDeskPref("cat", false)
    expect(getDeskPrefs().cat).toBe(false)
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
    expect(fresh.getDeskPrefs()).toEqual({ music: true, musicStyle: "cozy", sounds: false, cat: false, enemies: true, hoverClick: false })
  })
})
