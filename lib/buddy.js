// One on-screen dino: an St.Widget exactly the sprite's size, so clicks
// beside it reach the windows below.
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import St from 'gi://St';


export const Buddy = GObject.registerClass(
class HomieBuddy extends St.Widget {
    // `variant` is the dino's color, fixed for its lifetime.
    _init(variant, width, height, behavior, clickChance) {
        super._init({
            reactive: true,
            width,
            height,
            // Mirror around the center when running left.
            pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
            scale_x: behavior.left ? -1 : 1,
        });
        // Nearest-neighbor keeps pixel art crisp at any scale.
        this.set_content_scaling_filters(Clutter.ScalingFilter.NEAREST,
            Clutter.ScalingFilter.NEAREST);
        this._variant = variant;
        this._clickChance = clickChance;
        this.behavior = behavior;
        this.showFrame();
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

    // Movement timer tick.
    move(minX, maxX) {
        this.behavior.step(minX, maxX, this.width);
        this.x = this.behavior.x;
    }

    vfunc_button_press_event() {
        this.behavior.click(this._clickChance, Math.random());
        this.showFrame();
        return Clutter.EVENT_STOP;
    }
});
