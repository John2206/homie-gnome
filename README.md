# Homie for GNOME

Animated desktop dinos that run along the bottom of your screen.
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
- Every dino picks a random color when it spawns and again each time it wraps around the screen.
- Dinos start running right away, without a click.
- The `run-left` setting also mirrors the sprite, so the dino faces where it runs.
- Animation always uses the `fps` setting. The GIF's own frame delays are ignored.
