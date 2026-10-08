import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Behavior, randomStep} from './lib/behavior.js';
import {Buddy} from './lib/buddy.js';
import {loadVariants, randomSize, spriteSize} from './lib/sprites.js';

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

export default class HomieExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._buddies = [];
        this._sources = [];
        this._settings.connectObject('changed', () => this._reload(), this);
        Main.layoutManager.connectObject('monitors-changed', () => this._reload(), this);
        Main.overview.connectObject(
            'showing', () => this._setHidden(this._settings.get_boolean('hide-in-overview')),
            'hidden', () => this._setHidden(false), this);
        this._reload();
    }

    disable() {
        this._clear();
        this._settings.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);
        Main.overview.disconnectObject(this);
        this._settings = null;
        this._buddies = null;
        this._sources = null;
    }

    // Destroys dinos, stops timers and cancels any load in flight.
    _clear() {
        this._cancellable?.cancel();
        this._cancellable = null;
        this._sources.forEach(id => GLib.source_remove(id));
        this._sources = [];
        this._buddies.forEach(b => b.destroy());
        this._buddies = [];
    }

    // Any setting or monitor change rebuilds everything from scratch.
    async _reload() {
        this._clear();
        const cancellable = new Gio.Cancellable();
        this._cancellable = cancellable;
        const path = this._settings.get_string('sprite-path') ||
            this.dir.get_child('sprites').get_child('dino').get_path();

        let variants;
        try {
            variants = await loadVariants(path, cancellable);
        } catch (e) {
            if (!cancellable.is_cancelled())
                console.error(`homie: cannot load sprites from ${path}: ${e.message}`);
            return;
        }
        // A newer reload or disable() ran while we were loading.
        if (cancellable.is_cancelled())
            return;
        if (variants.length === 0) {
            console.error(`homie: no usable sprites in ${path}`);
            return;
        }
        this._spawn(variants);
    }

    _spawn(variants) {
        const s = this._settings;
        const native = variants[0].idle;
        const base = spriteSize(native, s.get_int('width'), s.get_int('height'));
        const area = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        const minX = area.x;
        const maxX = area.x + area.width;

        // Each dino gets a random color, size, direction and speed, all fixed
        // until the next reload. Colors come from a shuffled deck, so every
        // color appears once before any repeats.
        const deck = [];
        for (let i = 0; i < s.get_int('count'); i++) {
            if (deck.length === 0)
                deck.push(...shuffle([...variants]));
            const variant = deck.pop();
            const [width, height] = randomSize(native, base, Math.random());
            const x = minX + Math.floor(Math.random() * Math.max(area.width - width, 1));
            const behavior = new Behavior(x, {
                left: Math.random() < 0.5,
                stepPx: randomStep(Math.random()),
            });
            const buddy = new Buddy(variant, width, height, behavior, s.get_int('click-chance'));
            buddy.set_position(x, area.y + area.height - height);
            Main.layoutManager.addTopChrome(buddy, {trackFullscreen: true});
            this._buddies.push(buddy);
        }
        this._setHidden(Main.overview.visible && s.get_boolean('hide-in-overview'));

        this._addTimer(1000 / s.get_int('fps'), b => b.animate());
        this._addTimer(1000 / s.get_int('speed'), b => b.move(minX, maxX));
    }

    _addTimer(ms, fn) {
        this._sources.push(GLib.timeout_add(GLib.PRIORITY_DEFAULT, Math.round(ms), () => {
            this._buddies.forEach(fn);
            return GLib.SOURCE_CONTINUE;
        }));
    }

    // Uses opacity, not `visible`: trackFullscreen makes the layout manager
    // own `visible`, and it sets it back to true when the overview opens.
    _setHidden(hidden) {
        for (const b of this._buddies) {
            b.opacity = hidden ? 0 : 255;
            b.reactive = !hidden;
        }
    }
}
