// State machine and movement for one buddy. No St/Clutter code here, so
// test/behavior.test.js can run it with plain gjs.

export const State = Object.freeze({IDLE: 'idle', RUNNING: 'run', CLICK: 'click'});

// A uniformly random number from the range [a, b]; the order of a and b
// does not matter.
export function randomIn(a, b, rand) {
    return Math.min(a, b) + rand * Math.abs(b - a);
}

// Fraction of the dino's height it covers per run-animation frame. Derived
// from the original's dino example: 150 px/s at 7 FPS for a 60 px sprite.
const STRIDE = 0.35;

// Run-animation FPS that matches a speed, so feet don't slide: bigger dinos
// take longer strides, faster ones step more often. Clamped to [1, maxFps].
export function runFps(speed, height, maxFps) {
    return Math.min(maxFps, Math.max(1, speed / (STRIDE * height)));
}

export class Behavior {
    // `left` and `stepPx` (pixels per movement tick) are fixed for the
    // dino's lifetime: it never turns or changes speed.
    constructor(x, {left = false, stepPx = 10} = {}) {
        this.x = x;
        this.left = left;
        this.stepPx = stepPx;
        this.state = State.RUNNING;
        this.frame = 0;
        this.phase = 0; // fraction of the next frame already elapsed
    }

    // Original rule: ignore clicks during the click animation. An idle buddy
    // plays the click animation with `chance` % probability, else it toggles.
    click(chance, rand) {
        if (this.state === State.CLICK)
            return;
        if (this.state === State.IDLE && rand * 100 <= chance)
            this._switch(State.CLICK);
        else
            this._switch(this.state === State.IDLE ? State.RUNNING : State.IDLE);
    }

    // Called once per tick of a `hz` timer. Advances frames at `fps`, which
    // may differ per state; leftover fractions carry over to the next tick.
    animate(fps, hz, length) {
        this.phase += fps / hz;
        let advanced = false;
        while (this.phase >= 1) {
            this.phase--;
            this.nextFrame(length);
            advanced = true;
        }
        return advanced;
    }

    // Advance one animation frame. The click animation plays once, then idles.
    nextFrame(length) {
        this.frame++;
        if (this.frame < length)
            return;
        this.frame = 0;
        if (this.state === State.CLICK)
            this.state = State.IDLE;
    }

    // Move while running. The buddy wraps between `minX - width` and `maxX`,
    // like the original. Returns true when it wrapped.
    step(minX, maxX, width) {
        if (this.state !== State.RUNNING)
            return false;
        if (this.left) {
            this.x -= this.stepPx;
            if (this.x <= minX - width) {
                this.x = maxX;
                return true;
            }
        } else {
            this.x += this.stepPx;
            if (this.x >= maxX) {
                this.x = minX - width;
                return true;
            }
        }
        return false;
    }

    _switch(state) {
        this.state = state;
        this.frame = 0;
    }
}
