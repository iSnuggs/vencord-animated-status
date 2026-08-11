<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo-light.svg" alt="isnuggs" height="128">
  </picture>
</p>

# AnimatedStatus

A [Vencord](https://github.com/Vendicated/Vencord) userplugin that cycles your custom status through a
list of text/emoji steps on a timer. Includes a full in-client editor (statuses, presets, and a global
timing/settings tab), accessible from the plugin's own settings entry.

Uses Vencord's official `UserSettingsAPI` (proto-based) to update your status rather than the legacy REST
settings endpoint, which avoids a long-standing Discord-side 429 rate-limit bug on frequent status updates.

## Install

> **Be warned: this is not a one-click install.** Vencord builds plugins *into* the client when the
> client itself is built, so there's no "download the file and drop it in a folder" option the way
> BetterDiscord has. To use any userplugin — this one included — you have to build Vencord yourself
> from its source code. That's a genuine time investment, and it's worth knowing that up front rather
> than halfway through.
>
> You do **not** need to know how to code. Every step below is a command you copy and paste. But you
> do need to be willing to use a terminal, and you'll need to redo a short version of this each time
> Vencord updates (see [Keeping it up to date](#keeping-it-up-to-date)).

### Before you start: three things to install

Install these first, in this order. All three are normal installers — click through them.

1. **[Node.js](https://nodejs.org/)** — version **22 or newer**. Take the "LTS" download on the front
   page. This is what actually builds Vencord.
2. **[Git](https://git-scm.com/downloads)** — this is how you download the Vencord source code and,
   later, update it. Accept every default in the installer.
3. **pnpm** — the tool that fetches Vencord's building blocks. It comes bundled with Node, but has to
   be switched on. Open a terminal (see the note below) and run:

   ```
   corepack enable
   ```

> **Opening a terminal.** On **Windows**, press Start, type `powershell`, hit Enter. On **macOS**,
> press Cmd+Space, type `terminal`, hit Enter. On **Linux** you already know. A terminal is just a
> window where you type commands instead of clicking — you'll paste each command below and press Enter.

To check all three worked, run these three commands. Each should print a version number rather than an
error:

```
node --version
git --version
pnpm --version
```

If `node --version` prints something lower than `v22`, install the newer Node before continuing —
the build will fail on older versions.

### Building Vencord with the plugin

Run these one at a time, waiting for each to finish.

1. **Download Vencord's source code.** This creates a `Vencord` folder wherever you currently are:

   ```
   git clone https://github.com/Vendicated/Vencord
   cd Vencord
   ```

2. **Fetch its building blocks.** This takes a few minutes the first time:

   ```
   pnpm install
   ```

3. **Add this plugin.** From inside that `Vencord` folder:

   ```
   git clone https://github.com/iSnuggs/vencord-animated-status src/userplugins/AnimatedStatus
   ```

   The folder name matters — Vencord looks for plugins inside `src/userplugins/`.

4. **Build it:**

   ```
   pnpm build
   ```

5. **Install it into Discord.** **Fully quit Discord first** — not just closing the window. On Windows,
   right-click the Discord icon in the system tray (bottom-right, possibly under the `^` arrow) and
   choose Quit. Then:

   ```
   pnpm inject
   ```

   It'll ask which Discord to patch; pick the one you actually use (most people: Stable). Then reopen
   Discord.

6. In Discord, open **Vencord Settings → Plugins**, search for `UserSettingsAPI` and turn it
   **on** — AnimatedStatus needs it to change your status. Then turn on **AnimatedStatus**.

That's it. If the plugin appears in that list, it worked.

### Keeping it up to date

Vencord changes often, and Discord updates can break plugins. When you want the latest version, go back
to your `Vencord` folder and run:

```
git pull
pnpm install
pnpm build
```

Then fully quit and reopen Discord. Your plugins in `src/userplugins/` are left alone by `git pull`, so
you won't lose anything. To update *this plugin* specifically:

```
cd src/userplugins/AnimatedStatus
git pull
cd ../../..
pnpm build
```

**The trade-off worth understanding:** a build-it-yourself Vencord doesn't auto-update the way the normal
installer does. Nothing breaks if you skip updates for a while, but you're now the one deciding when to
run them.

### If it doesn't work

- **Nothing changed after `pnpm inject`.** Discord almost certainly wasn't fully closed. Quit it from the
  system tray (or Task Manager — end every `Discord` process), then run `pnpm inject` again.
- **The plugin isn't in the Plugins list.** It's probably in the wrong folder. It must sit at
  `src/userplugins/AnimatedStatus/` inside your Vencord folder, with the code files directly inside it — not
  nested in a second folder of the same name. Fix it and run `pnpm build` again.
- **`pnpm build` printed errors.** Check `node --version` is 22 or higher. If it is, the error text
  itself is the useful part — open an issue on this repo and paste it in.
- **You want to undo all of this.** Run `pnpm uninject` from the Vencord folder (with Discord fully
  closed) and Discord goes back to normal. Deleting the Vencord folder afterwards removes the rest.

### Already using Vencord?

If you installed Vencord the normal way (the official installer), that version can't load userplugins —
it ships pre-built, and this plugin isn't in it. Running `pnpm inject` above replaces that install with
your own build, which is what you want. Your Vencord settings, themes and enabled plugins are stored
separately and carry over untouched.

## Usage

Go to **Vencord Settings → Plugins → AnimatedStatus** and click **Edit Statuses**. That opens the editor,
which has three tabs.

**Statuses**

Your list of steps. Each step is a line of status text plus an optional emoji, and the plugin rotates
through them on a timer. The emoji field accepts either:

- a custom server emoji in markdown form — `<:name:id>` — which resolves to the real CDN image, or
- a plain Unicode emoji typed or pasted directly (e.g. `🎮`).

**Presets**

Group steps into named presets — for example a gaming set and a working set. Marking a preset **active**
means only that preset's steps cycle; leave it unset to cycle through everything. The plugin settings page
shows which is live, e.g. `4/12 steps active (preset: gaming)`.

**Settings**

- **Step duration** — how long each status stays up, in milliseconds. The minimum is 10,000ms (10 seconds);
  Discord rate-limits status updates and going faster isn't reliable.
- **Randomize** — shuffle the order instead of cycling top to bottom.

## Note

Vencord's own contribution guidelines list automated/repeated-status plugins under plugins they won't accept
into the main project (grouped with API-spam style plugins). This repo exists purely as a personal userplugin
for anyone who wants to build it into their own client — it is not, and will not be, submitted upstream.

## License

Released under the **GNU General Public License v3.0 or later** — see [LICENSE](LICENSE).

Vencord itself is GPL-3.0-or-later, and a userplugin is compiled into a Vencord build, so this
plugin is distributed under the same terms. In plain terms: you may use, modify and redistribute
it freely, provided anything you share onward stays under the GPL and keeps this notice.

### Credit where it's due

This plugin began as a port of the **AnimatedStatus** BetterDiscord plugin by **toluschr** and
**SirSlender** ([toluschr/BetterDiscord-Animated-Status](https://github.com/toluschr/BetterDiscord-Animated-Status)),
which is released under the MIT licence. The status-cycling loop here — including the randomised
step selection and the 10-second minimum interval — derives from theirs.

The status editor (Statuses / Presets / Settings tabs), the preset system, and the move to
Vencord's protobuf-backed `UserSettingsAPI` instead of the legacy REST endpoint are additions.

The MIT licence permits redistribution under these terms provided its notice is preserved, so it
is reproduced here in full:

```
MIT License

Copyright (c) toluschr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The logo in `assets/` is a project mark rather than part of the licensed source, and is
excluded from the GPL grant — please do not reuse it to identify your own project.
