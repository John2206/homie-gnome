// Run with: gjs -m test/behavior.test.js
import {Behavior, State, randomIn, runFps} from '../lib/behavior.js';

const STEP_PX = 10; // Behavior's default step

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

// Random sizes and speeds cover the whole range, in either order.
assert(randomIn(24, 144, 0) === 24 && randomIn(24, 144, 1) === 144, 'range ends');
assert(randomIn(24, 144, 0.5) === 84, 'range middle');
assert(randomIn(144, 24, 0) === 24, 'swapped range');

// Run FPS follows speed and size: the original's dino example gives ~7.
assert(Math.abs(runFps(150, 60, 30) - 150 / 21) < 1e-9, 'run fps from speed and height');
assert(runFps(2000, 24, 30) === 30 && runFps(1, 144, 30) === 1, 'run fps clamped');

// animate() advances at fps/hz per tick and carries the fraction over.
const a = new Behavior(0);
let steps = 0;
for (let i = 0; i < 30; i++)
    steps += a.animate(7, 30, 100) ? 1 : 0;
assert(steps === 7 && a.frame === 7, '7 fps on a 30 Hz timer = 7 frames per second');

print('behavior: all checks passed');
