# AnimatedStatus

A [Vencord](https://github.com/Vendicated/Vencord) userplugin that cycles your custom status through a
list of text/emoji steps on a timer. Includes a full in-client editor (statuses, presets, and a global
timing/settings tab), accessible from the plugin's own settings entry.

Uses Vencord's official `UserSettingsAPI` (proto-based) to update your status rather than the legacy REST
settings endpoint, which avoids a long-standing Discord-side 429 rate-limit bug on frequent status updates.

## Install

Vencord userplugins aren't standalone — Vencord compiles everything in `src/userplugins/` into the client
at build time, so there's no drop-in installer. To use this plugin:

1. Clone [Vencord](https://github.com/Vendicated/Vencord) and follow its
   [dev install guide](https://docs.vencord.dev/installing/).
2. Copy (or `git clone`) this repo's contents into `src/userplugins/AnimatedStatus/` in your Vencord checkout.
3. Enable the `UserSettingsAPI` plugin (Vencord Settings → Plugins) — AnimatedStatus depends on it.
4. `pnpm build`, then inject/reinject as usual.

## Note

Vencord's own contribution guidelines list automated/repeated-status plugins under plugins they won't accept
into the main project (grouped with API-spam style plugins). This repo exists purely as a personal userplugin
for anyone who wants to build it into their own client — it is not, and will not be, submitted upstream.
