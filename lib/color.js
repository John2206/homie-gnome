// Recolors sprite pixels by shifting the body hue. Pure pixel math, no
// GNOME imports, so test/color.test.js can run it with plain gjs.

// Extra body hues (degrees) generated from the first sprite variant.
// The bundled dinos already cover blue (210), red (0) and yellow-green (75).
export const EXTRA_HUES = [45, 130, 175, 260, 300, 330];

// Only pixels within this many degrees of the body hue change, so accents
// in other colors (the dinos' orange details) stay as drawn.
const HUE_WINDOW = 45;
// Pixels below this HSV saturation count as outline/white and never change.
const MIN_SATURATION = 0.2;

function rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d > 0) {
        if (max === r)
            h = ((g - b) / d + 6) % 6;
        else if (max === g)
            h = (b - r) / d + 2;
        else
            h = (r - g) / d + 4;
    }
    return [h * 60, max === 0 ? 0 : d / max, max];
}

function hsvToRgb(h, s, v) {
    const f = n => {
        const k = (n + h / 60) % 6;
        return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return [f(5), f(3), f(1)];
}

function hueDistance(a, b) {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
}

// Calls fn(offset) for each visible pixel. Skips rowstride padding.
// `img` is {data: Uint8Array, width, height, channels, rowstride}.
function forEachPixel(img, fn) {
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const i = y * img.rowstride + x * img.channels;
            if (img.channels === 4 && img.data[i + 3] === 0)
                continue;
            fn(i);
        }
    }
}

// Most common hue (in 15° buckets) among saturated, visible pixels.
export function dominantHue(images) {
    const counts = new Map();
    for (const img of images) {
        const d = img.data;
        forEachPixel(img, i => {
            const [h, s] = rgbToHsv(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
            if (s < MIN_SATURATION)
                return;
            const bucket = Math.round(h / 15) * 15 % 360;
            counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
        });
    }
    let best = null;
    for (const [hue, n] of counts) {
        if (best === null || n > counts.get(best))
            best = hue;
    }
    return best;
}

// Returns a copy of img.data with pixels near hue `from` rotated to hue `to`.
export function shiftHue(img, from, to) {
    const out = new Uint8Array(img.data);
    forEachPixel(img, i => {
        const [h, s, v] = rgbToHsv(out[i] / 255, out[i + 1] / 255, out[i + 2] / 255);
        if (s < MIN_SATURATION || hueDistance(h, from) > HUE_WINDOW)
            return;
        const [r, g, b] = hsvToRgb((h + to - from + 360) % 360, s, v);
        out[i] = Math.round(r * 255);
        out[i + 1] = Math.round(g * 255);
        out[i + 2] = Math.round(b * 255);
    });
    return out;
}
