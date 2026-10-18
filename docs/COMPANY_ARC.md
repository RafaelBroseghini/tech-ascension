# Company arc: one product, and the bet to go full-time

Status: steps 1 (names and the intro), 2 (users pay) and 3 (the fork) are built. The rest is plan.

## The story

You have a used laptop and an idea. The idea becomes a product. The product is yours for the whole game: it is the globe. Gigs pay rent and bring its first customers. Jobs pay for its servers at night and on weekends. At some point you can bet on it: quit the ladder and run it full-time. Its finish line is seven billion users.

Today the globe is "Your company" with no name, the jobs read as other people's companies, and the capital rows read as investing in other people's companies. This plan gives the product a name, makes the day job and the product two visible tracks, and turns the moment you choose between them into the game's central decision.

## 1. First-run intro

The start card (`IdentityPicker`) is already the first modal. It grows into a short intro of three beats, with one card and a Next button, and no typing.

1. **Who you are.** Your handle (`quiet-otter`), with Reroll. "High school. A used laptop. Big plans."
2. **What you're building.** A product name drawn to match the handle (`Otterly`), with its own Reroll, and a small globe with one dot on it. "Every career here builds one product. Gigs and jobs pay for it. Its users are the score. The goal is seven billion."
3. **The bet.** "One day you can quit and go full-time. Bigger upside, real risk. Or keep climbing the ladder and build on nights and weekends." Then Start keeps both names for good.

Both names are saved in the `profile` block, so an existing save gets a product name drawn and kept, with no card, the way handles were added. Esc and the backdrop keep what is on screen, as now. The card stays under 640 px tall so a phone shows it whole.

## 2. Two tracks, and the fork

There are two modes, saved as `track: "ladder" | "founder"`. Every career starts on the ladder.

**Ladder (default).** Jobs pay salary and teach XP, as now. The product grows at its nights-and-weekends pace, which is much slower: growth × 0.25, so 7B on the ladder alone is a very long road. Gear and regions are bought out of salary. Capital rows stay as they are today: you invest in other companies.

**Hires (ladder only).** You can't give the product your days, so you pay people who can. A Hires row in the Company tab sells smart people, cheapest first: an outsourced body shop, a bootcamp grad, a Stack Overflow copy-paster, a senior engineer, a staff engineer, a 10x developer, a greybeard, a code god. Each is hired again and again, costs a salary a second per head and adds growth, up to and past what a founder gets. Hiring is how the ladder can still reach 7B in reasonable time, but the people you hired do the growing, and the game keeps count. The product tracks how many of its users came from growth your hires added (`hiredUsers`, against the total).

**Founder.** You quit. Salaries stop. The XP a job teaches stops too, but jobs held stay on the résumé, and the next job gate is unchanged if you come back. The product gets your full attention: growth × 2, user revenue × 3, and the capital rows become the company's own moves ("Raise a seed round", "Acquire a rival", "Build a training campus"), with the same prices. You carry a **burn**: a team and an office that cost money a second, scaling with users. The money you hold is your **runway**.

**When the fork opens.** It needs users who pay (section 3) and a reason to bet. "Go full-time" opens once the product has 1,000 users and you hold a job. It sits as a button in the top bar and as a one-time card at the top of the Company tab the first time it opens. The card shows the trade in numbers: "Salary −$X/s. Product revenue +$Y/s → ×3. Burn −$Z/s. Runway at today's numbers: N minutes." The player can take it at any time after that, not only at the prompt.

**The risk.** If money reaches $0 while you're a founder, you have run out of runway. The game stops the burn and opens a choice.
- **Raise a bridge.** Keep the company, give up equity: a permanent −10% on product revenue, stacking. You can do this at most three times.
- **Go back to a job.** Rehired one rung below your best job, onto the ladder. The product keeps its users, but growth goes back to the ladder's × 0.25. You can quit again later, but the fork comes back only after the product's users double.

Nothing is ever wiped, and there is no game over, because an idle game should not punish leaving the tab open.

**The reward.** As a founder, the win at 7B is ×1.5 for good instead of ×1.25, and the capital rows feed the product (each one adds capacity or reach, not only $/s). On the ladder, the win is reachable but much slower, and exec salaries are not raised to make up for it. Both routes finish the game. The founder route is faster and riskier. The ladder route is safe, slow, or bought.

**How the win reads.** The 7B moment depends on how you got there.
- **Founder, mostly your own growth.** The full celebration. "Seven billion people use Otterly. You built this."
- **Ladder, mostly hired growth (over half of the users came from hires).** The game mocks you, kindly. "Seven billion users. Your team was incredible. You were in a lot of their standups." The journal entry and the LinkedOut line say the same ("Executive sponsor, Otterly"). The ×1.25 still pays.
- **Ladder, mostly your own growth.** The rare, slow, stubborn route gets its own line. "Seven billion users, on nights and weekends. Go to bed."

The quit-or-climb modal tells the player this up front, in one line, so the mockery is a promise and not a surprise.

**Offline.** The burn runs while away, but runway cannot hit zero offline. Money floors at one minute of burn, and the "ran out of runway" choice opens on return, in the sticky note. A player who comes back to a choice is fine. A player who comes back to a wipe is not.

**Back on the ladder by choice.** A founder can also take a job again at any time from the Jobs tab ("Take a day job again"), with the same rules as running out, minus the drop of a rung.

**Hires and founders.** Hires belong to the ladder. A founder who quits keeps the people already hired (and their salaries, now part of the burn), and can hire no more. So a player can't buy their way up on the ladder and then claim the founder ending: users added after quitting count as yours, but users that came from the people you kept count as theirs.

## 3. Users pay

This is a prerequisite for the fork. Today users only cost money (dropped requests), so quitting would be pure loss. Each served user pays a small amount a second (`ARPU`), shown as "Product revenue" in $/s and on the status page. Dropped users pay nothing. That makes the loop:

gear → served users → revenue → more gear and regions → more users.

The ARPU needs a pacing simulation before shipping. The rule of thumb: on the ladder, product revenue overtakes salary somewhere around the upper era, and as a founder it does so around the mid era. `docs/PACING.md` gets the table.

## 4. Story beats

These use the existing event system, with a new `requires` on track and users:

- **Ladder, nights and weekends.** "Your manager asks about the side project." A gift or a trade: keep it quiet, or show them and get a bonus.
- **1M users.** "An investor emails." On the ladder, a nudge toward the fork. As a founder, a free bridge at no equity cost.
- **1B users.** "An acquisition offer." Take it for a huge lump, and the product keeps running under your name, with growth × 0.75. Or decline and keep the upside.
- **Founder, burn high.** "Payroll is due." A trade that buys runway with equity.

## 5. Names in the UI

The product name replaces "Your company" wherever it shows:

- the activity-bar tooltip;
- the Company tab header;
- the World cell, as "Otterly · 2.9M users";
- the status page ("Current Status: Otterly");
- the journal ("Otterly reached one million users").

LinkedOut lists "Founder, Otterly" with the dates. While on the ladder, it shows as a side project under the current job. GitHug pins the repo.

## Build order

Each step ships and verifies on its own.

1. **Names.** Product name in `profile`, the intro card's three beats, and the name across the UI. Copy and identity only, no economy change.
2. **Users pay.** ARPU, product revenue in $/s, and a pacing simulation with a PACING.md table.
3. **The fork.** `track` in the save, the founder multipliers, burn, runway, the run-out choice and its offline rule. Smoke steps: quit, run out, bridge, return to a job.
4. **Hires and the endings.** The Hires row, `hiredUsers`, and the three win texts. Smoke steps: a ladder win with hires reads the mocking line.
5. **Capital as company moves.** Reword the 25 rows for founders, and make each one feed capacity or reach.
6. **Story events** for both tracks.

7. **The Exit.** Selling the product for Prestige, and a new product for the next career. Built in `docs/PRESTIGE.md`.

## Decided

- Quitting stops salary completely.
- The ladder is much slower to grow; exec salaries are not raised to balance it.
- Hires are the ladder's way to speed up, and a win carried by hires is mocked at the end.

## Calls still open

- **The bridge cap.** Three bridges, then a forced return to a job. The alternative is unlimited bridges at a growing equity cost.
- **The mocking threshold.** Over half the users from hires. It could also be graded (a quarter gets a gentler jab).
