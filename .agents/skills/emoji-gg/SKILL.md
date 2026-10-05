---
name: emoji-gg
description: Find, vet and pin emoji.gg art for Tech Ascension catalog rows (skills, gigs, jobs, gear, capital, desk cat). Use when picking or replacing emoji art, running the manifest generator, or when a row's art looks wrong. Covers which packs and searches to use, and how to check that the picture matches the name.
disable-model-invocation: true
---

# emoji.gg art for catalog rows

Art is assigned in `src/data/emojiManifest.json` (generated), read through `src/data/emojiCdn.ts`. Each row gets an `idle` image and a `click` image (the click one is preferably a GIF). Every image URL is used once across the game.

## Rules

- **License.** emoji.gg allows use where nobody is charged for the emoji and forbids redistributing the files. Store CDN URLs (`https://cdn3.emoji.gg/emojis/<id>-<name>.<ext>`) only. Never commit image bytes. For visual checks, download into the scratchpad directory, never into the repo.
- **A title is not proof.** The generator matches on the file name only. Authors name things loosely, so a file called `lock` or `bug` can be an unrelated pixel-art mascot or a meme. Before the vetted pins, gear `4` (Vertical mouse) was "Lock + pixel toro bloodcough" and skill `5` was "web + MONEY". Always look at the image before keeping or pinning it.
- Skip NSFW and anything the generator's `DISALLOWED_TITLE` regex blocks. Skip category 9 (NSFW) and 11 (letters).
- Do not hand-edit `emojiManifest.json`. The next generator run overwrites it. Fix picks in `scripts/emoji-pins.json` (below).
- Every catalog row is pinned, and every pin was checked by eye. A new row has no pin and gets a keyword or filler pick until someone vets and pins it.

## Where to search

Starting points the generator already uses (`scripts/emojigg.mjs`):

- **Emoji searches:** `https://emoji.gg/emojis/<term>` (paginates with `&page=`). Strongest terms: `future`, `development`, `technology`, `software`. Fill terms: laptop, computer, keyboard, server, linux, python, javascript, typescript, react, html, css, git, docker, database, cloud, rocket, mars, moon, robot, chip, terminal, bug, browser, money, cat, coffee, book, lock, factory, satellite, ai.
- **Pack searches:** `https://emoji.gg/packs/<term>` for software, code, computer, development, technology, linux, program. Packs worth opening first (seen in those results):

  | Pack | Good for |
  | --- | --- |
  | `5245-software`, `592411-mostused-software` | app and tool logos |
  | `2118-coders`, `5124-code`, `35135-coding-school-emoji-pack` | skills, study, gigs |
  | `7212-programming-emojis`, `83690-programming-languages`, `308626-programming-language` | language skills (python, rust, ts) |
  | `218425-browser-and-development` | browser, devtools, frontend |
  | `4282-computer`, `68663-technology`, `7237-technology`, `53285-pastel-technology` | gear (laptop, keyboard, monitor) |
  | `3434-linux`, `35219-linux`, `59116-linux` | linux, shell, homelab |
  | `4846-programs`, `5021-program` | misc software |

  Open a pack at `https://emoji.gg/pack/<id>-<slug>`. Pack art tends to be one consistent style, which looks better than mixed single emojis. Prefer one pack per era or section when you pin.
- **APIs are weak.** `https://emoji.gg/api` and `/api/packs` ignore `page` and return one fixed window. Use them as a filler, not as the browse path.

## Discovering new ones

The generator only sees what its fixed term lists reach. To find more:

- **Try new terms.** Any word works at `https://emoji.gg/emojis/<term>` and `https://emoji.gg/packs/<term>`. Search by the row's name, then by synonyms and neighbours (docker → whale, container, ship; auth → key, shield, padlock; deploy → rocket, launch, ship). A term with zero hits returns an unrelated page, so check that results match.
- **Sort packs.** `https://emoji.gg/packs?sort=downloads` (popular), `?sort=recent` (newest), `?sort=oldest`, with `&page=N`. Popular packs are usually the most polished and consistent.
- **Browse by category.** `https://emoji.gg/category/<id>/<slug>`. Useful here: 14 logos (tech brands, languages, tools), 16 utility, 8 animated (click GIFs), 21 pixel-art, 17 animals (cats), 15 cute, 23 aesthetic. Category 9 is NSFW and 11 is letters. The generator drops both.
- **Follow a pack's style.** When one pack fits a section, open its page and pick the whole set instead of single emojis. Packs by the same author usually share a look.
- **Feed it back.** Add productive terms to `FILL_SEARCHES` or `PACK_SEARCHES` in `scripts/emojigg.mjs`, or an alias in `ALIASES` in `generate-emoji-manifest.mjs`, then run with `--refresh`. Expect the catalog to change when you do, so re-audit the labels afterward. For a one-off, pin it instead.
- **Check what is already used.** Before hunting for a candidate, confirm its URL is not in `emojiManifest.json` or `deskCatClickPool.json`, since every URL can be used once.

## Known gaps

Exact-title hits are thin for some terms. `docker` has no emoji whose title token is exactly "docker" in the cached catalog. Search the site for "whale", "container" or "ship", and expect to pin. Terms with plenty of exact hits: mars, rocket, laptop, python, react.

## Workflow

1. Refresh the catalog only if it is stale: `node scripts/generate-emoji-manifest.mjs --refresh`. The cache is `scripts/.emojigg-cache.json` (gitignored, about 8,800 emojis).
2. Search the cache by title instead of the site when you can:
   ```sh
   node -e 'const c=require("./scripts/.emojigg-cache.json").emojis;
   const q=process.argv[1];console.log(c.filter(e=>e.title.toLowerCase().includes(q)).map(e=>`${e.gif?"gif":"png"} ${e.source} ${e.image}`).join("\n"))' rocket
   ```
   Fields: `file`, `title`, `image`, `gif`, `source` (`starter` beats `search` beats `api`), `faves`.
3. **Look at the candidate.** Download to the scratchpad and open it with Read (it renders images):
   ```sh
   curl -s -o "$SCRATCH/probe.png" https://cdn3.emoji.gg/emojis/325756-bolt.png
   ```
   Check: does the picture show the thing the row names (a rocket, a lock, a laptop)? Is it clean at small size? Is it free of text, watermarks and unrelated characters? For a GIF, check the first frame still reads as the right object, since idle uses a still.
4. Pin the pair in `scripts/emoji-pins.json` (the generator loads it as `PINNED`):
   ```json
   "capital:22": { "label": "spaceship + Rocket", "idle": "<png url>", "click": "<gif url>" },
   ```
   Key is `<kind>:<id>` (kinds: skill, gig, job, gear, capital). Pinned URLs are reserved before any keyword pick runs. A pinned URL that repeats another pin or a desk cat URL makes the generator throw. Prefer a still for `idle` and a GIF for `click`. Accurate or a clear joke both work (a "Fab capacity offtake" row can be a slay emoji, "Ground station dish" a dinner plate), but the picture has to read at shop size.
   - For many rows at once, render a contact sheet (row name next to its candidates, in a grid) with Pillow in the scratchpad and Read it. That is much faster than opening images one at a time.
   - Check the first frame of a click GIF too. Some (for example the Clippy set) start on an empty frame, and some images are mostly transparent padding around a tiny glyph.
5. Run `node scripts/generate-emoji-manifest.mjs` (offline, uses the cache), then `npm test` and `npm run lint`.
6. Audit the output: `label` is `"<idle title> + <click title>"`. The summary line should read `filler: 0` and `max reuse 1`. Look at every new or changed pin.

## Spotting bad auto-picks

- **Filler rows.** A row with no keyword hit gets a least-used tech emoji (`takeFiller`). Labels like `money + MONEY` on skills, or the same laptop repeating, mean the keyword list missed. Add an `ALIASES` entry (regex on the row name, list of search words) or pin it.
- **Substring matches.** Words of 5+ letters can match inside longer titles. Check "pixel toro ..." style hits: they are a mascot pack that shows up for `lock`, `bug` and others.
- **Wrong subject.** Names like `bash`, `web`, `star`, `check` are ambiguous. Confirm visually.
- **Reuse.** The generator tracks use counts. Max reuse above 1 in its summary line means filler is being stamped on several rows.

## Desk cat

`ui.deskCat` is the best still cat (prefers cozy titles: blush, sleep, cute, peek, loaf, sit). The tap roulette pool is `src/data/deskCatClickPool.json` (100–300 cat, kitty, meow, kitten, neko, nyan emojis, sorted by faves). Skim the pool for non-cats occasionally (a title like `neko` can be a person, `nyan` a meme).
