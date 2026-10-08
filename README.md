# Homie for GNOME

Animated desktop dinos that run along the bottom of your screen, or across all of it.
This is a GNOME Shell extension rewrite of [Homie](https://github.com/hannahfluch/homie) by Hannah Fluch.
The original is a Rust/GTK4 app that needs `wlr-layer-shell`, which GNOME's Mutter does not implement.
This extension runs inside the shell instead, so it works on stock Ubuntu with Wayland.

No code is shared with the original. The behavior, the dino sprites and the configuration ideas come from it.

## Credits

- Original project and concept: [hannahfluch/homie](https://github.com/hannahfluch/homie), MIT license, © 2024 Hannah Fluch. See `LICENSE`.
- Dino sprites: [arks.itch.io/dino-characters](https://arks.itch.io/dino-characters), drawn by [@ScissorMarks](https://twitter.com/ScissorMarks). See `sprites/dino/credit.txt`.

## Tested environment

| | |
|---|---|
| OS | Ubuntu 26.04.1 LTS |
| Shell | GNOME Shell 50.1 (Mutter 18) |
| Session | Wayland, `ubuntu:GNOME` |
| Fractional scaling | on (`scale-monitor-framebuffer`, `xwayland-native-scaling`) |

## How the original behaves

The original buddy has three states: idle, running and click.

- It starts idle and stands still.
- A click on an idle buddy usually starts it running. With a configurable chance (default 15 %), it plays the click animation instead.
- A click on a running buddy makes it idle.
- Clicks during the click animation do nothing. After the click animation plays once, the buddy goes back to idle.
- While running, it moves 10 px per tick. The tick rate is the movement speed (default 20 per second).
- It always runs in one direction, set by a `left` option. It never turns around.
- When it leaves one screen edge, it reappears at the opposite edge.
- It plays each GIF with the GIF's own frame delays, unless an `fps` option overrides them.

## How this extension differs

- Several dinos run at once (setting `count`, default 3).
- Each dino spawns with a random color, size, direction and speed. With `whole-screen` on, it also gets a random height on screen. They stay fixed for the dino's lifetime. Colors are dealt from a shuffled deck, so every color appears once before any repeats.
- A dino keeps its direction. Left-running dinos are mirrored so they face where they run.
- Besides the three drawn colors, the extension makes six more by shifting the body hue of the first sprite set.
- Dinos start running right away, without a click.
- Animation always uses the `fps` setting. The GIF's own frame delays are ignored.

## Install

```bash
git clone https://github.com/John2206/homie-gnome.git
cd homie-gnome
glib-compile-schemas schemas/
ln -s "$PWD" ~/.local/share/gnome-shell/extensions/homie@jonathan
```

On Wayland, log out and back in so GNOME Shell detects the extension. Then run:

```bash
gnome-extensions enable homie@jonathan
```

To build a zip instead:

```bash
gnome-extensions pack --extra-source=lib --extra-source=sprites
```

## Shell commands

Add this line to `~/.bashrc`:

```bash
source ~/Desktop/Private/homie/tools/homie.sh
```

- `dinos` adds a flock of 25–100 dinos with a random animation speed and click chance. Each dino picks its own height from 24–144 px and its own speed from 20–1000 px/s. Edit `tools/homie.sh` to change these ranges.
- `dinosall` does the same, but the dinos run at random heights across the whole screen.
- Repeated `dinos`/`dinosall` calls add more flocks. Earlier flocks keep running.
- `nodinos` removes all dinos.

## Sprite format

The extension reads GIFs directly. No conversion step is needed.

- A directory with `idle.gif`, `click.gif` and `run.gif` is one sprite set.
- A directory whose subdirectories each hold those three files is a set of color variants. Each dino picks a random variant.
- The bundled `sprites/dino/` has three variants: `doux` (blue), `mort` (red) and `vita` (green).
- Sprites should face right. Dinos running left are mirrored.
- The extension adds six recolored copies of the first variant (gold, green, teal, purple, magenta, pink). It shifts only pixels near the sprite's most common hue, so outlines, whites and differently colored accents stay as drawn. A grayscale sprite gets no copies.
- A broken or missing GIF logs one `homie:` error line, and the extension skips that variant. With no usable variant, no dino appears.

## Settings

Open the settings with `gnome-extensions prefs homie@jonathan`.

| Key | Default | Meaning |
|---|---|---|
| `sprite-path` | empty | Sprite directory. Empty uses the bundled dinos. |
| `count` | 3 | Number of dinos (1–100). |
| `size-min`, `size-max` | 24, 144 | Each dino's height is a random value in this range, in px. Width follows the sprite's aspect ratio. |
| `fps` | 7 | Animation frames per second. |
| `speed-min`, `speed-max` | 20, 1000 | Each dino's speed is a random value in this range, in px per second. |
| `click-chance` | 20 | Percent chance that a click on an idle dino plays the click animation. |
| `whole-screen` | false | Run at random heights across the whole screen instead of along the bottom. |
| `hide-in-overview` | true | Hide dinos while the overview is open. |

All settings except `hide-in-overview` apply to the next flock only. A flock is one batch of dinos. Dinos already running keep their settings. The "Spawn dinos" button in prefs adds a flock with the current settings. Enabling the extension spawns one flock.

## Implementation notes

- GIF decoding uses `GdkPixbuf.PixbufAnimation`. GdkPixbuf has no frame-list API. `lib/sprites.js` therefore walks the iterator with synthetic timestamps and stops when the frame sequence repeats.
- On GNOME 50, frames upload with `St.ImageContent.set_bytes(coglContext, bytes, format, w, h, stride)`. This is the same call the shell's own `ui/screenshot.js` uses.
- `trackFullscreen` makes the layout manager control each actor's `visible` property. Hiding in the overview therefore uses `opacity` and `reactive` instead.

## Known limitations

- Frame timing comes from `fps`. The GIF's own per-frame delays are ignored.
- Dinos walk on the primary monitor only. On a multi-monitor setup, a dino can show partly on the neighboring monitor while it wraps.
- Under fractional scaling, nearest-neighbor scaling can make some art pixels one screen pixel wider than others.

## Development

```bash
gjs -m test/behavior.test.js
tools/nested.sh                           # nested shell, needs the mutter-dev-bin package
source /tmp/homie-nested/env              # in a second terminal
gnome-extensions enable homie@jonathan
```

Do not run a plain `dbus-run-session gnome-shell --devkit`. Its settings writes reach your real dconf database and overwrite your enabled extensions. `tools/nested.sh` gives the nested shell its own database.

The nested shell logs to its terminal. The real shell logs to the journal:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```
