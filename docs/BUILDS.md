# Builds: specializations, leadership, tags and the kitchen

Status: built. The job ladder is a tree (specializations, then a leadership line), gigs ask for skills by tag, the kitchen reveals combos, and the progression tree models every gate (`docs/TREE.md`). The origins (College, Bootcamp, Dropout), the company the build used to grow (users, the globe, hires, incidents, the 8B win) and the user gates on the picks were part of this design and were removed; what is left of them is noted at the end.

## Why

Every career walked the same line, and the rules made it so, not the content. Jobs were one ladder, all 31 held at once; gigs were a chain; gear and capital opened in table order. The build breaks that up: a career picks a specialization once and a leadership line once, and does not see the rows of the ones it did not pick.

## Decided

- **Builds come from exclusivity.** A career does not see the rows of the specialization or line it did not pick.
- **Three pieces:** specialization branches on the job ladder, gigs that ask for tags, and the kitchen (combos with hand-written jokes).
- **The specialization is picked once**, when Mid-level SWE is held, and is then locked. A career gets one switch.
- **Click builds stay.** Some specializations earn by clicking, some by idle.
- **A career takes half a day to a day of real time and 30 to 90 minutes at the game**, not four to nine days (`docs/PACING.md`).
- **Jokes are clean**: tech humor, 2026 tech humor and programming lore. No obscenity, no swearing.

## 1. Specializations

The job ladder is a tree.

1. **Trunk.** The Internship, then Junior, the mentor buddy, code review, QA and on-call, up to Mid-level SWE. Shared by everyone.
2. **Specialization.** At Mid-level the Job Board offers the specializations. Taking one hides the others for the career. Each has its own eight job rows for ranks 8 to 15. A career may switch once; what the switch keeps and costs is open.
3. **Leadership.** At Senior, two ways up: **IC** (Staff, Principal, Distinguished, Fellow); **Manager** (EM, Director, VP, CTO).

| Specialization | Tag | Click or idle | Its rows (sample) |
| --- | --- | --- | --- |
| **Frontend** | frontend | click | Component librarian, Design-system owner, Core Web Vitals whisperer |
| **Backend / Platform** | backend | balanced | API owner, Platform engineer, Internal tools czar |
| **Infra / SRE** | infra | idle | On-call primary, SRE lead, Chaos engineer |
| **AI engineer** | ai | idle | Prompt engineer, RAG plumber, Evals wrangler, Agent wrangler, Head of AI |
| **Forward deployed engineer** | product | click | Embedded at a client, Solutions architect, Deployment strategist |
| **Security** | security | balanced | AppSec reviewer, Red-team lead, CISO |

**Click or idle** is the build's answer to the endgame. A click build's manual click multiplies the jobs' click share (`CLICK_BUILD_CLICK_MULT`, 2.5 over the plain ladder's 0.68), so with every job its build can see held, 2 clicks a second pay 5 times the idle $/s while clicking: 5 minutes of clicking are worth about 30 minutes of idle. Hover and auto clicks never get that multiple. An idle build earns a quarter more on every source, offline credit included, and half the click share. Balanced builds are the plain ladder. The numbers are in `src/game/build.ts`.

## 2. Tags and the gig board

Every skill, gig, job and gear row carries one or more tags: `frontend`, `backend`, `infra`, `data`, `ai`, `security`, `product`, `hardware`. This is a data edit; most skill names already say their tag ("CUDA / GPU programming 101", "Threat modeling habit").

Gigs drop the chain. Each one asks for tag counts ("2 frontend, 1 backend") on its own tags instead of every earlier gig and a skill prefix, so two players who learned different skills meet different clients. A count is half of what the old prefix held of that tag (rounded up), at least one and at most what the catalog has; `GIG_PATH` in `src/data/tree.ts` writes them. The specialization halves the count on its own tag (rounded up), and no ask goes below one (`gigTagMin` in `src/game/tree/check.ts`). The board lists the cleared gigs, the gigs the career can clear now, and the next two locked ones (`gigBoard` in `src/game/phase.ts`), ranked by skills short, then lower XP, then id.

## 3. The kitchen

Owning two things that go together reveals a **combo**: a name, a one-line joke and a small effect. It works like Emoji Kitchen: mix two things you have, and something you did not expect shows up.

- **Data.** A drop-in table, `src/data/combos.ts`: `{ id, a, b, name, joke, effect }`, where `a` and `b` are a row, a tag or a specialization. Hand-written and sparse. No rule generates combos, so every one is a joke someone wrote.
- **Effects** are small and real: a few percent on a tag's income, a combo gig on the board, a cosmetic, a LinkedOut line.
- **The kitchen log** lists every combo found and a `???` slot for each one this build can still make. 
- **Voice.** Clean tech humor: the industry in 2026 (agents, vibe coding, context windows, GPU queues) and programming lore (it's always DNS, off-by-one, left-pad, Bobby Tables, works on my machine). No obscenity, no swearing, no punching at people. A test scans every name and joke for a word list, the way handles are scanned.
- **Art.** `emojiManifest.json` is generator-only, so combo art comes from the generator (for a start, the two parents' emoji side by side).

Samples, to set the tone:

| Mix | Combo | Joke |
| --- | --- | --- |
| Regex fluency + Prompt engineering habit | Regex by vibes | You asked the model for the regex. Now you have three problems. |
| Bash scripting habit + On-call rotation | Load-bearing one-liner | Written at 3 a.m. Still in prod. Nobody knows what it does. |
| Raspberry Pie lab + Cluster kubectl 101 | k8s on a Pie | A four-node cluster that serves your blog to both of its readers. |
| Desk cat + On-call rotation | Paw-ged | The cat walked across the keyboard and acknowledged the page. |
| AI engineer + Testing (unit/e2e starter) | Evals | Tests, but they vibe. |
| Security + Package manager fluency | node_modules audit | You read every dependency. You have seen things. |
| Frontend + Workstation GPU | Box-shadow render farm | The hover animation needs CUDA now. |
| Forward deployed engineer + Email template coding | Embedded | You were sent to ship the platform. You are now the client's email team. |
| Used mining GPU lot + Fine-tune toy LLM | Proof of work | It mined coins, now it mines tokens. Same fan noise. |
| Infra / SRE + Noise-cancelling headset | Pager-cancelling | Blocks every sound except the pager. |
| DNS + domain portfolio + On-call rotation | It's always DNS | It was DNS. It is always DNS. |
| AI-IDE workflow + LeetCrate Easy reps | Vibe coding | Two Sum, solved in one prompt and four retries. |
| LLM pairing habit + Production war-story journal | Context window | The agent forgot the incident. You never will. |
| Package manager fluency + Open-source first PR | left-pad | Eleven lines that once held up the internet. You maintain them now. |
| SQL + basic backend + Security hygiene | Little Bobby Tables | You sanitize your inputs. His mom taught you that. |
| Workstation GPU + AI engineer | GPU queue | Your training run starts Thursday. Which Thursday is unclear. |


## Removed

- **Origins** (College, Bootcamp, Dropout): the start card's first choice, with prices, gate changes and calendar marks of their own. Every career plays the plain ladder.
- **The company**: the globe, users, regions, points of presence, incidents, hires, product revenue, Frontend's launches, an AI build's GPU growth and the 8B win with its x1.25. The Company tab and its Legacy perks (the Founder track) and the Hall of Fame went with it. Gear keeps its $/s and click bonus.
- **The user gates**: the pick opens on holding Mid-level SWE and Senior SWE needs only its XP and the pick.
- **Open:** a leadership switch, an IC effect beyond its rows, tuning each build against a target (a click build's fully held multiple lands near 4.2 times, not 5, because a line holds 27 rows or fewer of the 31 it was calibrated on), and save slots.
