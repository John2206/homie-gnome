// Run with: gjs -m test/behavior.test.js
import {Behavior, State, STEP_PX, randomStep} from '../lib/behavior.js';

function assert(cond, msg) {
    if (!cond)
        throw new Error(`FAIL: ${msg}`);
}

// Starts running (feature 2); a click stops it, the next click restarts it.
const b = new Behavior(0);
assert(b.state === State.RUNNING, 'starts running');
b.click(20, 0.99);
assert(b.state === State.IDLE, 'click stops a running buddy');
b.click(20, 0.99);
assert(b.state === State.RUNNING, 'click above chance starts running');

// Idle + roll within chance plays the click animation, which ignores clicks
// and returns to idle after its last frame.
b.click(20, 0.5);
b.click(20, 0.1);
assert(b.state === State.CLICK, 'idle click within chance plays click');
b.click(20, 0.99);
assert(b.state === State.CLICK, 'clicks during click animation are ignored');
for (let i = 0; i < 4; i++)
    b.nextFrame(4);
assert(b.state === State.IDLE && b.frame === 0, 'click animation ends in idle');

// Idle buddies do not move.
assert(!b.step(0, 100, 20) && b.x === 0, 'idle does not move');

// Wrap right: past maxX it re-enters fully off the left edge.
const r = new Behavior(100 - STEP_PX);
assert(r.step(0, 100, 20), 'wraps at right edge');
assert(r.x === -20, 'right wrap re-enters at minX - width');
assert(!r.step(0, 100, 20) && r.x === -20 + STEP_PX, 'no wrap mid-screen');

// Wrap left: past minX - width it re-enters at maxX.
const l = new Behavior(-20 + 7, {left: true, stepPx: 7});
assert(l.step(0, 100, 20), 'wraps at left edge');
assert(l.x === 100, 'left wrap re-enters at maxX');
assert(l.left && !l.step(0, 100, 20) && l.x === 93, 'keeps direction and own step after wrap');

// Individual speeds stay within 0.5x..1.5x of the original step.
assert(randomStep(0) === 5 && randomStep(0.999) === 15, 'random step range');

print('behavior: all checks passed');
