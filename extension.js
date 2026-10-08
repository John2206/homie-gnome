import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Behavior, randomIn} from './lib/behavior.js';
import {Buddy} from './lib/buddy.js';
import {loadVariants} from './lib/sprites.js';

// Movement timer rate. Each dino moves speed / MOVE_HZ px per tick.
const MOVE_HZ = 30;

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

// A flock is one batch of dinos spawned with one set of settings. Flocks run
// side by side; each has its own timers.
export default class HomieExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._flocks = [];
        this._cancellable = new Gio.Cancellable();
        // Settings only shape the next flock. Bumping spawn-counter (the
        // dinos/dinosall shell functions, or the prefs button) adds one.
        this._settings.connectObject('changed::spawn-counter',
            () => this._addFlock(this._readParams()), this);
        Main.layoutManager.connectObject('monitors-changed', () => this._rebuild(), this);
        Main.overview.connectObject(
            'showing', () => this._setHidden(this._settings.get_boolean('hide-in-overview')),
            'hidden', () => this._setHidden(false), this);
        this._addFlock(this._readParams());
    }

    disable() {
        this._cancellable.cancel();
        this._flocks.forEach(f => this._destroyFlock(f));
        this._settings.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);
        Main.overview.disconnectObject(this);
        this._settings = null;
        this._flocks = null;
        this._cancellable = null;
    }

    _readParams() {
        const s = this._settings;
        return {
            path: s.get_string('sprite-path') ||
                this.dir.get_child('sprites').get_child('dino').get_path(),
            sizeMin: s.get_int('size-min'),
            sizeMax: s.get_int('size-max'),
            count: s.get_int('count'),
            fps: s.get_int('fps'),
            speedMin: s.get_int('speed-min'),
            speedMax: s.get_int('speed-max'),
            clickChance: s.get_int('click-chance'),
            wholeScreen: s.get_boolean('whole-screen'),
        };
    }

    async _addFlock(params) {
        const flock = {params, buddies: [], sources: [], dead: false};
        this._flocks.push(flock);
        const cancellable = this._cancellable;

        let variants;
        try {
            // ponytail: each flock decodes its own frames; share a cache if
            // spawning many flocks gets slow.
            variants = await loadVariants(params.path, cancellable);
        } catch (e) {
            if (!cancellable.is_cancelled())
                console.error(`homie: cannot load sprites from ${params.path}: ${e.message}`);
            return;
        }
        // disable() or a monitor rebuild ran while we were loading.
        if (cancellable.is_cancelled() || flock.dead)
            return;
        if (variants.length === 0) {
            console.error(`homie: no usable sprites in ${params.path}`);
            return;
        }
        this._spawn(flock, variants);
    }

    // Stops a flock's timers and destroys its dinos.
    _destroyFlock(flock) {
        flock.dead = true;
        flock.sources.forEach(id => GLib.source_remove(id));
        flock.buddies.forEach(b => b.destroy());
        flock.sources = [];
        flock.buddies = [];
    }

    // Monitor change: respawn every flock with its own settings on the new layout.
    _rebuild() {
        const all = this._flocks.map(f => f.params);
        this._flocks.forEach(f => this._destroyFlock(f));
        this._flocks = [];
        all.forEach(p => this._addFlock(p));
    }

    _spawn(flock, variants) {
        // At shell startup the extension can be enabled before any monitor
        // exists. The flock keeps its params; monitors-changed respawns it.
        if (!Main.layoutManager.primaryMonitor)
            return;
        const p = flock.params;
        const native = variants[0].idle;
        const ratio = native.width / native.height;
        const area = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        const minX = area.x;
        const maxX = area.x + area.width;

        // Each dino gets a random color, size, direction, speed and (with
        // whole-screen) height on screen. Colors come from a shuffled deck, so
        // every color appears once before any repeats.
        const deck = [];
        for (let i = 0; i < p.count; i++) {
            if (deck.length === 0)
                deck.push(...shuffle([...variants]));
            const variant = deck.pop();
            // Height and speed: any value in the configured ranges.
            const height = Math.round(randomIn(p.sizeMin, p.sizeMax, Math.random()));
            const width = Math.round(height * ratio);
            const x = minX + Math.floor(Math.random() * Math.max(area.width - width, 1));
            const behavior = new Behavior(x, {
                left: Math.random() < 0.5,
                stepPx: randomIn(p.speedMin, p.speedMax, Math.random()) / MOVE_HZ,
            });
            const buddy = new Buddy(variant, width, height, behavior, p.clickChance);
            // Along the bottom of the work area, or at a random fixed height.
            const y = p.wholeScreen
                ? area.y + Math.floor(Math.random() * Math.max(area.height - height, 1))
                : area.y + area.height - height;
            buddy.set_position(x, y);
            Main.layoutManager.addTopChrome(buddy, {trackFullscreen: true});
            flock.buddies.push(buddy);
        }
        this._setHidden(Main.overview.visible && this._settings.get_boolean('hide-in-overview'),
            flock.buddies);

        const timer = (ms, fn) => flock.sources.push(GLib.timeout_add(GLib.PRIORITY_DEFAULT,
            Math.round(ms), () => {
                flock.buddies.forEach(fn);
                return GLib.SOURCE_CONTINUE;
            }));
        timer(1000 / p.fps, b => b.animate());
        timer(1000 / MOVE_HZ, b => b.move(minX, maxX));
    }

    // Uses opacity, not `visible`: trackFullscreen makes the layout manager
    // own `visible`, and it sets it back to true when the overview opens.
    _setHidden(hidden, buddies = this._flocks.flatMap(f => f.buddies)) {
        for (const b of buddies) {
            b.opacity = hidden ? 0 : 255;
            b.reactive = !hidden;
        }
    }
}
