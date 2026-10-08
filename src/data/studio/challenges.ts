import type { Challenge, ComponentKind, Design, Feature, NaiveDesign, Phase, RequestType, Scenario, TargetName, Targets } from "../../game/studio/types.ts"

/** A whiteboard interview: one challenge that gates one job. */
export interface Interview extends Challenge {
  readonly jobId: number
  /** One sentence on what the system is for, above the opener. It names the product and the pressure, not the targets. */
  readonly goal: string
  /** The interviewer's vague first line. It carries no numbers; the questions bring them out. */
  readonly opener: string
  /** Every target in numbers, shown once the interview is answered in full. */
  readonly passBar: string
  /** A question per distinct target a naive design misses. It names the problem and never the component. */
  readonly nudges: Readonly<Partial<Record<TargetName, string>>>
  /** Passes at half the budget or less, so the top verdict is reachable. */
  readonly strongHire: Design
}

type Spec = ComponentKind | readonly [ComponentKind, number]

/** Nodes keyed by id; each path is `a>b>c`, one edge per hop. */
function board(nodes: Readonly<Record<string, Spec>>, ...paths: string[]): Design {
  return {
    nodes: Object.entries(nodes).map(([id, spec]) =>
      typeof spec === "string" ? { id, kind: spec, replicas: 1 } : { id, kind: spec[0], replicas: spec[1] },
    ),
    edges: paths.flatMap((path) => {
      const hops = path.split(">")
      return hops.slice(1).map((to, i) => ({ from: hops[i], to }))
    }),
  }
}

const naive = (name: string, fails: TargetName, design: Design): NaiveDesign => ({ name, fails, design })

const percent = (x: number) => `${Number((x * 100).toFixed(2))}%`

/** The pass bar in plain words. The queue clause only appears where the reference has a queue to fall behind. */
function passBar(targets: Targets, queued: boolean): string {
  const parts = [
    `${percent(targets.successRate)} of requests answered in every phase`,
    `95% of them within ${targets.p95Ms} ms`,
    ...(queued ? [`the queue no more than ${targets.maxLagSeconds} seconds behind`] : []),
    `${percent(targets.availability)} uptime`,
    `at most $${targets.budgetPerMonth.toLocaleString("en-US")} a month`,
  ]
  return `To pass: ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`
}

interface Draft extends Omit<Interview, "passBar" | "strongHire"> {
  /** Left out when the reference already earns a Strong hire. */
  readonly strongHire?: Design
}

function interview({ strongHire, ...rest }: Draft): Interview {
  const queued = rest.reference.nodes.some((n) => n.kind === "queue")
  return { ...rest, strongHire: strongHire ?? rest.reference, passBar: passBar(rest.targets, queued) }
}

const calm = (name: string, rps: number): Phase => ({ name, seconds: 60, rps })

type FeatureFlags = Partial<Pick<Feature, "consistency" | "durable" | "async">>

/** A user story. Reads default to eventual and nothing is durable until the story says so. */
const story = (id: string, text: string, request: RequestType, share: number, flags: FeatureFlags = {}): Feature => ({
  id,
  story: text,
  request,
  share,
  consistency: "eventual",
  durable: false,
  async: false,
  ...flags,
})

const scenario = (
  phases: Scenario["phases"],
  features: Scenario["features"],
  rates: Partial<Pick<Scenario, "cacheHitRate" | "edgeHitRate" | "fanout">> = {},
): Scenario => ({
  phases,
  features,
  cacheHitRate: rates.cacheHitRate ?? 0,
  edgeHitRate: rates.edgeHitRate ?? 0,
  fanout: rates.fanout ?? 1,
})

const HELLO_SERVER = interview({
  id: "hello-server",
  name: "Hello server",
  jobId: 1,
  goal: "Put a guestbook online for a demo day without spending a fortune.",
  opener: "Any questions before you start?",
  nudges: {
    success: "What happens to a request when there is nowhere to keep the data?",
    budget: "Would finance sign off on a rack of servers for a demo?",
  },
  scenario: scenario(
    [calm("Demo day", 200)],
    [
      story("read", "A visitor reads the guestbook", "read", 0.8),
      story("write", "A visitor signs the guestbook", "write", 0.2, { durable: true }),
    ],
  ),
  targets: { successRate: 0.99, p95Ms: 100, maxLagSeconds: 10, availability: 0.99, budgetPerMonth: 500 },
  reference: board({ users: "users", api: "api", db: "sql" }, "users>api>db"),
  naive: [
    naive("Just the API, no database", "success", board({ users: "users", api: "api" }, "users>api")),
    naive(
      "Enterprise-ready on day one",
      "budget",
      board({ users: "users", lb: "lb", api: ["api", 5], cache: "cache", db: "sql" }, "users>lb>api", "api>cache", "api>db"),
    ),
  ],
})

const SHOP_PHASE = { rps: 600 }

const THREE_TIER = interview({
  id: "3-tier-app",
  name: "3-tier app",
  jobId: 2,
  goal: "Keep a growing shop open while the intern reboots servers, for under $800 a month.",
  opener: "A shop is growing, and the intern has prod access. Ask what you need before you draw.",
  nudges: {
    p95: "How long does a customer wait if one machine does everything?",
    faults: "What happens when the intern reboots one of your servers?",
  },
  scenario: scenario(
    [
      { name: "Monday morning", seconds: 60, ...SHOP_PHASE },
      { name: "Reboot", seconds: 60, ...SHOP_PHASE, fault: { kind: "killReplica", target: "api" } },
    ],
    [
      story("browse", "A shopper browses the catalog", "read", 0.7),
      story("order", "A shopper sees their order right after paying", "read", 0.1, { consistency: "strong" }),
      story("checkout", "A shopper checks out", "write", 0.2, { durable: true }),
    ],
    { cacheHitRate: 0.7 },
  ),
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 10, availability: 0.99, budgetPerMonth: 800 },
  reference: board({ users: "users", lb: "lb", api: ["api", 3], cache: "cache", db: "sql" }, "users>lb>api", "api>cache", "api>db"),
  strongHire: board({ users: "users", lb: "lb", api: ["api", 3], db: "sql" }, "users>lb>api>db"),
  naive: [
    naive("One API does it all", "p95", board({ users: "users", api: "api", db: "sql" }, "users>api>db")),
    naive("Two APIs, no spare", "faults", board({ users: "users", lb: "lb", api: ["api", 2], db: "sql" }, "users>lb>api>db")),
    naive("Two APIs, no balancer", "faults", board({ users: "users", api: ["api", 2], db: "sql" }, "users>api>db")),
  ],
})

const STATIC_SITE = interview({
  id: "static-site",
  name: "Static site",
  jobId: 6,
  goal: "Survive the launch-day crowd on a marketing site for under $400 a month.",
  opener: "Marketing wants a launch site. Ask what you need.",
  nudges: {
    success: "Can one storage bucket keep up when the whole internet shows up at once?",
    budget: "Do files that never change need a whole fleet of machines?",
  },
  scenario: scenario(
    [calm("Launch", 6000), { name: "Front page", seconds: 30, rps: 6000, fault: { kind: "spike", multiplier: 2 } }],
    [story("page", "A visitor opens the launch page", "static", 1)],
  ),
  targets: { successRate: 0.99, p95Ms: 60, maxLagSeconds: 10, availability: 0.995, budgetPerMonth: 400 },
  reference: board({ users: "users", cdn: "cdn", files: "blob" }, "users>cdn>files"),
  naive: [
    naive("Server farm, no CDN", "success", board({ users: "users", lb: "lb", api: ["api", 2], files: "blob" }, "users>lb>api", "api>files")),
    naive(
      "CDN in front of a server farm",
      "budget",
      board({ users: "users", cdn: "cdn", lb: "lb", api: ["api", 8], files: "blob" }, "users>cdn>lb>api", "api>files"),
    ),
  ],
})

const SHORTENER_PHASE = { rps: 2000 }

const URL_SHORTENER = interview({
  id: "url-shortener",
  name: "URL shortener",
  jobId: 7,
  goal: "Redirect 2,000 clicks a second, and survive going viral, for under $1,100 a month.",
  opener: "People want short links. Ask what you need before you draw.",
  nudges: {
    success: "How many lookups can a database take if every click goes straight to it?",
    faults: "What happens when a link goes viral and nobody warned you?",
  },
  scenario: scenario(
    [
      { name: "Launch day", seconds: 60, ...SHORTENER_PHASE },
      { name: "Celebrity tweet", seconds: 30, ...SHORTENER_PHASE, fault: { kind: "spike", multiplier: 3 } },
    ],
    [
      story("follow", "Someone follows a short link", "read", 0.96),
      story("create", "Someone creates a short link", "write", 0.04, { durable: true }),
    ],
    { cacheHitRate: 0.9, edgeHitRate: 0.8 },
  ),
  targets: { successRate: 0.99, p95Ms: 60, maxLagSeconds: 10, availability: 0.995, budgetPerMonth: 1100 },
  reference: board({ users: "users", lb: "lb", api: ["api", 12], cache: "cache", db: "sql" }, "users>lb>api", "api>cache", "api>db"),
  strongHire: board(
    { users: "users", cdn: "cdn", lb: "lb", api: ["api", 3], cache: "cache", db: "sql" },
    "users>cdn>lb",
    "users>lb>api",
    "api>cache",
    "api>db",
  ),
  naive: [
    naive("No cache", "success", board({ users: "users", lb: "lb", api: ["api", 12], db: "sql" }, "users>lb>api>db")),
    naive(
      "CDN for reads only",
      "success",
      board(
        { users: "users", cdn: "cdn", lb: "lb", api: ["api", 3], cache: "cache", db: "sql" },
        "users>cdn>lb>api",
        "api>cache",
        "api>db",
      ),
    ),
    naive(
      "No headroom",
      "faults",
      board({ users: "users", lb: "lb", api: ["api", 8], cache: "cache", db: "sql" }, "users>lb>api", "api>cache", "api>db"),
    ),
  ],
})

const PASTE_PHASE = { rps: 2000 }

const PASTEBIN = interview({
  id: "pastebin",
  name: "Pastebin",
  jobId: 10,
  goal: "Store and serve pastes at 2,000 requests a second, even if the cache forgets everything, for under $1,100 a month.",
  opener: "A site for people who paste a lot. What do you want to know?",
  nudges: {
    p95: "How fast can you read a paste if every read goes to storage?",
    faults: "What happens the moment whatever answers most reads forgets everything?",
    availability: "What takes you down when a single machine at the front falls over?",
  },
  scenario: scenario(
    [
      { name: "Paste day", seconds: 60, ...PASTE_PHASE },
      { name: "Cache wiped", seconds: 60, ...PASTE_PHASE, fault: { kind: "flushCache" } },
    ],
    [
      story("open", "Someone opens a paste", "read", 0.9),
      story("save", "Someone saves a paste", "write", 0.1, { durable: true }),
    ],
    { cacheHitRate: 0.8 },
  ),
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 10, availability: 0.998, budgetPerMonth: 1100 },
  reference: board({ users: "users", lb: "lb", api: ["api", 10], cache: "cache", files: "blob" }, "users>lb>api", "api>cache", "api>files"),
  strongHire: board({ users: "users", lb: "lb", api: ["api", 8], cache: "cache", files: "blob" }, "users>lb>api", "api>cache", "api>files"),
  naive: [
    naive("Bucket without a cache", "p95", board({ users: "users", lb: "lb", api: ["api", 8], files: "blob" }, "users>lb>api>files")),
    naive(
      "Pastes in PostgreSloth",
      "faults",
      board({ users: "users", lb: "lb", api: ["api", 8], cache: "cache", db: "sql" }, "users>lb>api", "api>cache", "api>db"),
    ),
    naive(
      "No balancer",
      "availability",
      board({ users: "users", api: ["api", 8], cache: "cache", files: "blob" }, "users>api", "api>cache", "api>files"),
    ),
  ],
})

const UPLOAD_PHASE = { rps: 2000 }

const IMAGE_UPLOAD = interview({
  id: "image-upload",
  name: "Image upload",
  jobId: 12,
  goal: "Let people upload photos that get resized, without making them wait, for under $1,400 a month.",
  opener: "A photo app has outgrown its server. Ask away.",
  nudges: {
    faults: "Who is waiting while a photo gets resized?",
    success: "What happens to uploads that need resizing and have nowhere to go?",
    lag: "What if resizing falls behind?",
    budget: "Could the same traffic be served with far less hardware?",
  },
  scenario: scenario(
    [
      { name: "Weekend photos", seconds: 60, ...UPLOAD_PHASE },
      { name: "Sunday night", seconds: 30, ...UPLOAD_PHASE, fault: { kind: "spike", multiplier: 2 } },
    ],
    [
      story("view", "Someone scrolls through photos", "read", 0.8),
      story("upload", "Someone uploads a photo", "upload", 0.2, { durable: true, async: true }),
    ],
    { cacheHitRate: 0.8 },
  ),
  targets: { successRate: 0.99, p95Ms: 120, maxLagSeconds: 10, availability: 0.998, budgetPerMonth: 1400 },
  reference: board(
    { users: "users", lb: "lb", api: ["api", 8], cache: "cache", queue: "queue", workers: ["worker", 2], files: "blob" },
    "users>lb>api",
    "api>cache",
    "api>files",
    "api>queue>workers>files",
  ),
  naive: [
    naive(
      "Resize while they wait",
      "faults",
      board(
        { users: "users", lb: "lb", api: ["api", 8], cache: "cache", workers: ["worker", 2], files: "blob" },
        "users>lb>api",
        "api>cache",
        "api>files",
        "api>workers>files",
      ),
    ),
    naive(
      "Skip the resize",
      "success",
      board({ users: "users", lb: "lb", api: ["api", 8], cache: "cache", files: "blob" }, "users>lb>api", "api>cache", "api>files"),
    ),
    naive(
      "One minion",
      "lag",
      board(
        { users: "users", lb: "lb", api: ["api", 8], cache: "cache", queue: "queue", workers: "worker", files: "blob" },
        "users>lb>api",
        "api>cache",
        "api>files",
        "api>queue>workers>files",
      ),
    ),
    naive(
      "Throw hamsters at it",
      "budget",
      board(
        { users: "users", lb: "lb", api: ["api", 24], cache: "cache", queue: "queue", workers: ["worker", 2], files: "blob" },
        "users>lb>api",
        "api>cache",
        "api>files",
        "api>queue>workers>files",
      ),
    ),
  ],
})

const FEED_PHASE = { rps: 5000 }

const READ_HEAVY_FEED = interview({
  id: "read-heavy-feed",
  name: "Read-heavy feed",
  jobId: 14,
  goal: "Serve a feed to readers who outnumber posters 24 to 1, for under $2,400 a month.",
  opener: "Design a news feed. What do you need to know first?",
  nudges: {
    success: "What happens to one database when every reader asks it directly?",
    faults: "What happens when your only read copy reboots?",
    budget: "Do you really need that much hardware just to feel safe?",
  },
  scenario: scenario(
    [
      { name: "Morning scroll", seconds: 60, ...FEED_PHASE },
      { name: "Replica reboot", seconds: 60, ...FEED_PHASE, fault: { kind: "killReplica", target: "replica" } },
    ],
    [
      story("scroll", "A reader scrolls the feed", "read", 0.96),
      story("post", "A reader posts an update", "write", 0.04, { durable: true }),
    ],
    { cacheHitRate: 0.6, edgeHitRate: 0.5 },
  ),
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 10, availability: 0.998, budgetPerMonth: 2400 },
  reference: board(
    { users: "users", lb: "lb", api: ["api", 20], cache: "cache", replicas: ["replica", 3], db: "sql" },
    "users>lb>api",
    "api>cache",
    "api>replicas",
    "api>db",
    "db>replicas",
  ),
  strongHire: board(
    { users: "users", cdn: "cdn", lb: "lb", api: ["api", 10], cache: "cache", replicas: ["replica", 2], db: "sql" },
    "users>cdn>lb",
    "users>lb>api",
    "api>cache",
    "api>replicas",
    "api>db",
    "db>replicas",
  ),
  naive: [
    naive(
      "Cache and one database",
      "success",
      board({ users: "users", lb: "lb", api: ["api", 20], cache: "cache", db: "sql" }, "users>lb>api", "api>cache", "api>db"),
    ),
    naive(
      "One read copy",
      "faults",
      board(
        { users: "users", lb: "lb", api: ["api", 20], cache: "cache", replicas: "replica", db: "sql" },
        "users>lb>api",
        "api>cache",
        "api>replicas",
        "api>db",
        "db>replicas",
      ),
    ),
    naive(
      "Scale everything to be safe",
      "budget",
      board(
        { users: "users", lb: "lb", api: ["api", 30], cache: "cache", replicas: ["replica", 6], db: "sql" },
        "users>lb>api",
        "api>cache",
        "api>replicas",
        "api>db",
        "db>replicas",
      ),
    ),
  ],
})

const NOTIFY_PHASE = { rps: 3000 }

const notificationBoard = (workers: number, kv: number, queued = true): Design =>
  board(
    {
      users: "users",
      lb: "lb",
      api: ["api", 12],
      cache: "cache",
      ...(queued ? { queue: "queue" } : {}),
      workers: ["worker", workers],
      kv: ["kv", kv],
    },
    "users>lb>api",
    "api>cache",
    "api>kv",
    queued ? "api>queue>workers>kv" : "api>workers>kv",
  )

const NOTIFICATION_FANOUT = interview({
  id: "notification-fanout",
  name: "Notification fan-out",
  jobId: 16,
  goal: "Tell every follower about a celebrity post within seconds, for under $3,800 a month.",
  opener: "A notification service with a lot of followers. What would you ask?",
  nudges: {
    success: "What happens when every notification is written to the database before anyone gets an answer?",
    lag: "What if sending falls behind during the celebrity post?",
    faults: "What if the store has no headroom when traffic jumps?",
  },
  scenario: scenario(
    [
      { name: "Breaking news", seconds: 60, ...NOTIFY_PHASE },
      { name: "Celebrity post", seconds: 30, ...NOTIFY_PHASE, fault: { kind: "spike", multiplier: 2 } },
    ],
    [
      story("check", "Someone checks their notifications", "read", 0.88),
      story("notify", "A celebrity posts and every follower is notified", "fanout", 0.12, { durable: true, async: true }),
    ],
    { cacheHitRate: 0.8, fanout: 20 },
  ),
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 10, availability: 0.998, budgetPerMonth: 3800 },
  reference: notificationBoard(2, 4),
  naive: [
    naive(
      "Write every notification to PostgreSloth now",
      "success",
      board({ users: "users", lb: "lb", api: ["api", 12], cache: "cache", db: "sql" }, "users>lb>api", "api>cache", "api>db"),
    ),
    naive("One minion", "lag", notificationBoard(1, 4)),
    naive("No headroom in the store", "faults", notificationBoard(2, 2)),
  ],
})

const CHAT_PHASE = { rps: 3000 }

const chatBoard = (parts: { socket?: number; lb?: boolean; queue?: boolean; kv?: number; workers?: number }): Design => {
  const { socket = 2, lb = true, queue = true, kv = 1, workers = 10 } = parts
  const head = lb ? "users>lb>socket" : "users>socket"
  return board(
    {
      users: "users",
      ...(lb ? { lb: "lb" } : {}),
      socket: ["socket", socket],
      ...(queue ? { queue: ["queue", 4], workers: ["worker", workers] } : {}),
      kv: ["kv", kv],
    },
    head,
    queue ? "socket>queue>workers>kv" : "socket>kv",
  )
}

const WHATSAPP = interview({
  id: "whatsapp",
  name: "WhatsApp",
  jobId: 19,
  goal: "Deliver every chat message, even when every phone reconnects at once, for under $2,200 a month.",
  opener: "A chat app for the whole planet. Ask me anything.",
  nudges: {
    success: "Can plain request and response keep up with phones that never hang up?",
    faults: "What happens to a message when everyone reconnects at once and nothing absorbs the rush?",
    budget: "What does it cost to staff the workers for the one worst ten seconds?",
    availability: "What if the single connection point falls over?",
  },
  scenario: scenario(
    [
      { name: "Group chat o'clock", seconds: 60, ...CHAT_PHASE },
      { name: "Phones reconnect", seconds: 10, ...CHAT_PHASE, fault: { kind: "spike", multiplier: 6 } },
    ],
    [story("send", "Someone sends a message", "message", 1, { durable: true, async: true })],
  ),
  targets: { successRate: 0.99, p95Ms: 60, maxLagSeconds: 10, availability: 0.999, budgetPerMonth: 2200 },
  reference: chatBoard({}),
  naive: [
    naive(
      "HTTP polling, no Socket Puppet",
      "success",
      board({ users: "users", lb: "lb", api: ["api", 6], queue: ["queue", 4], kv: "kv" }, "users>lb>api", "api>queue", "api>kv"),
    ),
    naive("Deliver inline, no queue", "faults", chatBoard({ queue: false })),
    naive("Staff for the peak", "budget", chatBoard({ workers: 60 })),
    naive("One socket, no balancer", "availability", chatBoard({ socket: 1, lb: false })),
  ],
})

const TIMELINE_PHASE = { rps: 8000 }

const timelineBoard = (parts: { bouncer?: boolean; queued?: boolean; workers?: number }): Design => {
  const { bouncer = true, queued = true, workers = 2 } = parts
  const head = bouncer ? "users>bouncer>lb>api" : "users>lb>api"
  return board(
    {
      users: "users",
      ...(bouncer ? { bouncer: "bouncer" } : {}),
      lb: "lb",
      api: ["api", 28],
      cache: "cache",
      kv: ["kv", 6],
      ...(queued ? { queue: "queue", workers: ["worker", workers] } : {}),
      oncall: "oncall",
    },
    head,
    "api>cache",
    "api>kv",
    queued ? "api>queue>workers>kv" : "api>kv",
  )
}

const TWITTER_FANOUT = interview({
  id: "twitter-fanout",
  name: "Twitter fan-out",
  jobId: 20,
  goal: "Put every post on its followers' timelines, and shrug off bots, for under $7,000 a month.",
  opener: "A timeline service. What do you need to know before you start?",
  nudges: {
    success: "What happens to the database when every post is copied to every follower while the poster waits?",
    faults: "What happens when bots show up at twice your real traffic?",
    lag: "What if the background work cannot keep up with the posts?",
  },
  scenario: scenario(
    [
      { name: "Timeline rush", seconds: 60, ...TIMELINE_PHASE },
      { name: "Bot swarm", seconds: 60, ...TIMELINE_PHASE, fault: { kind: "botFlood", bots: 2 } },
    ],
    [
      story("scroll", "A reader scrolls their timeline", "read", 0.95),
      story("post", "Someone posts and every follower's timeline updates", "fanout", 0.05, { durable: true, async: true }),
    ],
    { cacheHitRate: 0.8, fanout: 40 },
  ),
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 10, availability: 0.999, budgetPerMonth: 7000 },
  reference: timelineBoard({}),
  naive: [
    naive(
      "Fan out to PostgreSloth while they wait",
      "success",
      board(
        { users: "users", bouncer: "bouncer", lb: "lb", api: ["api", 28], cache: "cache", db: ["sql", 2] },
        "users>bouncer>lb>api",
        "api>cache",
        "api>db",
      ),
    ),
    naive("No bouncer", "faults", timelineBoard({ bouncer: false })),
    naive("One minion", "lag", timelineBoard({ workers: 1 })),
  ],
})

const VIDEO_PHASE = { rps: 20_000 }

const videoBoard = (parts: { bouncer?: boolean; queued?: boolean }): Design => {
  const { bouncer = true, queued = true } = parts
  const door = bouncer ? "bouncer" : "users"
  return board(
    {
      users: "users",
      ...(bouncer ? { bouncer: ["bouncer", 2] } : {}),
      cdn: "cdn",
      files: "blob",
      lb: "lb",
      api: ["api", 4],
      ...(queued ? { queue: "queue" } : {}),
      workers: ["worker", 4],
      oncall: "oncall",
    },
    ...(bouncer ? ["users>bouncer"] : []),
    `${door}>cdn>files`,
    `${door}>lb>api`,
    queued ? "api>queue>workers>files" : "api>workers>files",
  )
}

const VIDEO_STREAMING = interview({
  id: "video-streaming",
  name: "Video streaming",
  jobId: 22,
  goal: "Stream a season finale to everyone and encode uploads in the background, for under $1,300 a month.",
  opener: "A video site. Ask what you need.",
  nudges: {
    success: "Where do the uploaders' videos go once they are sent?",
    faults: "What happens when scrapers hit you at twice your real traffic?",
    p95: "How long does an uploader wait while a video encodes?",
  },
  scenario: scenario(
    [
      { name: "Season finale", seconds: 60, ...VIDEO_PHASE },
      { name: "Scrapers", seconds: 60, ...VIDEO_PHASE, fault: { kind: "botFlood", bots: 2 } },
    ],
    [
      story("watch", "A viewer watches a video", "static", 0.87),
      story("browse", "A viewer browses the catalog", "read", 0.07),
      story("upload", "A creator uploads a video to encode", "upload", 0.06, { durable: true, async: true }),
    ],
    { cacheHitRate: 0.8, edgeHitRate: 0.5 },
  ),
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 10, availability: 0.9995, budgetPerMonth: 1300 },
  reference: videoBoard({}),
  naive: [
    naive(
      "Viewing only, no way to upload",
      "success",
      board({ users: "users", bouncer: ["bouncer", 2], cdn: "cdn", files: "blob" }, "users>bouncer>cdn>files"),
    ),
    naive("No bouncer", "faults", videoBoard({ bouncer: false })),
    naive("Encode while they wait", "p95", videoBoard({ queued: false })),
  ],
})

const GLOBAL_PHASE = { rps: 6000 }

const globalBoard = (parts: { region?: boolean; api?: number }): Design => {
  const { region = true, api = 20 } = parts
  return board(
    {
      users: "users",
      lb: "lb",
      api: ["api", api],
      cache: "cache",
      replicas: ["replica", 2],
      db: "sql",
      standby: "standby",
      oncall: "oncall",
      ...(region ? { ohio: "region" } : {}),
    },
    "users>lb>api",
    "api>cache",
    "api>replicas",
    "api>db",
    "db>replicas",
    "db>standby",
  )
}

const GLOBAL_SERVICE = interview({
  id: "global-service",
  name: "Global service",
  jobId: 24,
  goal: "Keep a payments app answering on every continent, even when a region dies, for under $8,000 a month.",
  opener: "A service for every continent. Ask what you need.",
  nudges: {
    faults: "What happens when a whole region goes dark?",
    availability: "Is extra hardware in one place the same as being up everywhere?",
    budget: "Do you need a second copy of absolutely everything?",
  },
  scenario: scenario(
    [
      { name: "Follow the sun", seconds: 60, ...GLOBAL_PHASE },
      { name: "Server down", seconds: 60, ...GLOBAL_PHASE, fault: { kind: "killReplica", target: "api" } },
      { name: "Region down", seconds: 60, ...GLOBAL_PHASE, fault: { kind: "regionOutage" } },
    ],
    [
      story("browse", "A customer browses their history", "read", 0.93),
      story("balance", "A customer sees their balance right after a transfer", "read", 0.05, { consistency: "strong" }),
      story("transfer", "A customer sends a transfer", "write", 0.02, { durable: true }),
    ],
    { cacheHitRate: 0.9 },
  ),
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 10, availability: 0.99995, budgetPerMonth: 8000 },
  reference: globalBoard({}),
  naive: [
    naive("One region", "faults", globalBoard({ region: false })),
    naive("One region, plenty of spares", "availability", globalBoard({ region: false, api: 36 })),
    naive("Two regions of everything", "budget", globalBoard({ api: 80 })),
  ],
})

/** In interview order, which is also the order of the jobs they gate. */
export const INTERVIEWS: readonly Interview[] = [
  HELLO_SERVER,
  THREE_TIER,
  STATIC_SITE,
  URL_SHORTENER,
  PASTEBIN,
  IMAGE_UPLOAD,
  READ_HEAVY_FEED,
  NOTIFICATION_FANOUT,
  WHATSAPP,
  TWITTER_FANOUT,
  VIDEO_STREAMING,
  GLOBAL_SERVICE,
]
