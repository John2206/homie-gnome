// Run with: gjs -m test/color.test.js
import {dominantHue, shiftHue} from '../lib/color.js';

function assert(cond, msg) {
    if (!cond)
        throw new Error(`FAIL: ${msg}`);
}

// 2×2 RGBA image with 4 bytes of row padding: red body ×2, orange accent,
// black outline. rowstride 12 = 2 px × 4 channels + 4 padding.
const data = new Uint8Array([
    255, 0, 0, 255,   255, 0, 0, 255,   9, 9, 9, 9,
    255, 128, 0, 255,   0, 0, 0, 255,   9, 9, 9, 9,
]);
const img = {data, width: 2, height: 2, channels: 4, rowstride: 12};

assert(dominantHue([img]) === 0, 'red is the dominant hue');
const out = shiftHue(img, 0, 120);
assert(out[0] === 0 && out[1] === 255 && out[2] === 0, 'red body becomes green');
assert(out[3] === 255, 'alpha unchanged');
// Orange (30°) is inside the 45° window, so it moves with the body.
assert(out[12] === 0 && out[13] === 255 && out[14] === 128, 'near-hue pixel shifts too');
assert(out[16] === 0 && out[17] === 0 && out[18] === 0, 'black outline unchanged');
assert(out[8] === 9 && out[20] === 9, 'row padding untouched');
assert(data[0] === 255 && data[1] === 0, 'input not modified');

// Blue (240°) is outside the window around red: unchanged.
const blue = {data: new Uint8Array([0, 0, 255, 255]), width: 1, height: 1, channels: 4, rowstride: 4};
const b = shiftHue(blue, 0, 120);
assert(b[0] === 0 && b[1] === 0 && b[2] === 255, 'far hue unchanged');

print('color: all checks passed');
