// One on-screen dino: an St.Widget exactly the sprite's size, so clicks
// beside it reach the windows below.
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import St from 'gi://St';

import {Behavior} from './behavior.js';

export const Buddy = GObject.registerClass(
class HomieBuddy extends St.Widget {
    _init(variants, width, height, x, opts) {
        super._init({
            reactive: true,
            width,
            height,
            // Mirror around the center when running left.
            pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
            scale_x: opts.left ? -1 : 1,
        });
        // Nearest-neighbor keeps pixel art crisp at any scale.
        this.set_content_scaling_filters(Clutter.ScalingFilter.NEAREST,
            Clutter.ScalingFilter.NEAREST);
        this._variants = variants;
        this._opts = opts;
        this.behavior = new Behavior(x);
        this.pickColor();
        this.showFrame();
    }

    pickColor() {
        this._variant = this._variants[Math.floor(Math.random() * this._variants.length)];
    }

    showFrame() {
        const frames = this._variant[this.behavior.state].frames;
        this.set_content(frames[this.behavior.frame % frames.length]);
    }

    // Frame timer tick.
    animate() {
        this.behavior.nextFrame(this._variant[this.behavior.state].frames.length);
        this.showFrame();
    }

    // Movement timer tick. A new random color on every wrap (feature 1).
    move(minX, maxX) {
        if (this.behavior.step(this._opts.left, minX, maxX, this.width))
            this.pickColor();
        this.x = this.behavior.x;
    }

    vfunc_button_press_event() {
        this.behavior.click(this._opts.clickChance, Math.random());
        this.showFrame();
        return Clutter.EVENT_STOP;
    }
});
