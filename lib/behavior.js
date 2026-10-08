// State machine and movement for one buddy. No St/Clutter code here, so
// test/behavior.test.js can run it with plain gjs.

export const State = Object.freeze({IDLE: 'idle', RUNNING: 'run', CLICK: 'click'});

// A uniformly random number from the range [a, b]; the order of a and b
// does not matter.
export function randomIn(a, b, rand) {
    return Math.min(a, b) + rand * Math.abs(b - a);
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
