# `tilt up`: npm install, then Vite. Emoji assignment reruns when catalog inputs
# change (not on startup). Nav button forces a regen from emoji.gg.
#
# dev reruns when package.json or emojiManifest.json change (manifest is
# rewritten by pull:sources). resource_deps keeps install before Vite on startup.

load("ext://uibutton", "cmd_button", "location")

EMOJI_DEPS = [
    "src/data/phases.ts",
    "src/data/gear.ts",
    "src/data/capital.ts",
    "scripts/generate-emoji-manifest.mjs",
    "scripts/emojigg.mjs",
]

# Only package.json — npm install rewrites the lockfile and would loop if lock were a dep.
local_resource(
    "npm-install",
    cmd = "npm install",
    deps = ["package.json"],
)

local_resource(
    "emojis",
    cmd = "npm run pull:sources",
    deps = EMOJI_DEPS,
    resource_deps = ["npm-install"],
    auto_init = False,
)

local_resource(
    "dev",
    cmd = "true",
    serve_cmd = "npm run dev",
    deps = [
        "package.json",
        "src/data/emojiManifest.json",
    ],
    resource_deps = ["npm-install"],
    links = [link("http://127.0.0.1:43123", "app")],
    readiness_probe = probe(
        period_secs = 2,
        http_get = http_get_action(host = "127.0.0.1", port = 43123, path = "/"),
    ),
)

cmd_button(
    "pull-sources",
    argv = ["npm", "run", "pull:sources"],
    location = location.NAV,
    resource = "emojis",
    icon_name = "image",
    text = "Regenerate emojis",
)
