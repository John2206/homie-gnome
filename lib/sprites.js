// Loads sprite sets: GIF frames → St.ImageContent, once, asynchronously.
//
// A directory holding idle.gif, click.gif and run.gif is one variant.
// A directory whose subdirectories hold those files is a set of variants
// (e.g. one per dino color).
import Cogl from 'gi://Cogl';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {EXTRA_HUES, dominantHue, shiftHue} from './color.js';

Gio._promisify(Gio.File.prototype, 'enumerate_children_async');
Gio._promisify(Gio.FileEnumerator.prototype, 'next_files_async');
Gio._promisify(Gio.File.prototype, 'read_async');
Gio._promisify(GdkPixbuf.PixbufAnimation, 'new_from_stream_async');

const STATES = ['idle', 'click', 'run'];
// Upper bound on frames read from one GIF; guards against endless loops.
const MAX_FRAMES = 256;

async function listChildren(dir, cancellable) {
    const en = await dir.enumerate_children_async('standard::name,standard::type',
        Gio.FileQueryInfoFlags.NONE, GLib.PRIORITY_DEFAULT, cancellable);
    const infos = [];
    for (;;) {
        const batch = await en.next_files_async(64, GLib.PRIORITY_DEFAULT, cancellable);
        if (batch.length === 0)
            break;
        infos.push(...batch);
    }
    return infos;
}

// GdkPixbuf has no frame list API. Walk the iterator with synthetic
// timestamps and stop when the frame sequence repeats.
function extractPixbufs(anim) {
    const time = new GLib.TimeVal();
    let ms = 0;
    const iter = anim.get_iter(time);
    const pixbufs = [];
    const sums = [];
    for (let i = 0; i < MAX_FRAMES; i++) {
        const pixbuf = iter.get_pixbuf().copy();
        pixbufs.push(pixbuf);
        sums.push(GLib.compute_checksum_for_bytes(GLib.ChecksumType.MD5,
            pixbuf.read_pixel_bytes()));
        const delay = iter.get_delay_time();
        if (delay < 0) // static image
            break;
        ms += Math.max(delay, 10);
        time.tv_sec = Math.floor(ms / 1000);
        time.tv_usec = (ms % 1000) * 1000;
        iter.advance(time);
    }
    // Smallest period p that explains the whole sequence. ponytail: a GIF
    // whose real loop is longer than MAX_FRAMES / 2 gets truncated.
    for (let p = 1; p <= sums.length / 2; p++) {
        if (sums.every((s, i) => i + p >= sums.length || s === sums[i + p]))
            return pixbufs.slice(0, p);
    }
    return pixbufs;
}

function toContent(pixbuf) {
    // Same call GNOME 50's own ui/screenshot.js uses (set_bytes, not set_data).
    const coglContext = global.stage.context.get_backend().get_cogl_context();
    const content = St.ImageContent.new_with_preferred_size(pixbuf.width, pixbuf.height);
    content.set_bytes(coglContext, pixbuf.read_pixel_bytes(),
        pixbuf.has_alpha ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888,
        pixbuf.width, pixbuf.height, pixbuf.rowstride);
    return content;
}

async function loadGif(file, cancellable) {
    const stream = await file.read_async(GLib.PRIORITY_DEFAULT, cancellable);
    try {
        const anim = await GdkPixbuf.PixbufAnimation.new_from_stream_async(stream, cancellable);
        return {width: anim.get_width(), height: anim.get_height(),
            frames: extractPixbufs(anim)};
    } finally {
        stream.close(null);
    }
}

async function loadVariant(dir, cancellable) {
    const variant = {};
    for (const state of STATES)
        variant[state] = await loadGif(dir.get_child(`${state}.gif`), cancellable);
    return variant;
}

function pixelsOf(pixbuf) {
    return {
        data: pixbuf.read_pixel_bytes().get_data(),
        width: pixbuf.width,
        height: pixbuf.height,
        channels: pixbuf.n_channels,
        rowstride: pixbuf.rowstride,
    };
}

// Copies of `variant` with its body hue moved to each of EXTRA_HUES.
// Runs once per load: ~10 frames of 24×24 px per state for the dinos.
function recolor(variant) {
    const all = STATES.flatMap(state => variant[state].frames).map(pixelsOf);
    const from = dominantHue(all);
    if (from === null) // grayscale sprite: nothing to recolor
        return [];
    return EXTRA_HUES.map(to => {
        const copy = {};
        for (const state of STATES) {
            copy[state] = {...variant[state], frames: variant[state].frames.map(pixbuf => {
                const img = pixelsOf(pixbuf);
                return GdkPixbuf.Pixbuf.new_from_bytes(new GLib.Bytes(shiftHue(img, from, to)),
                    GdkPixbuf.Colorspace.RGB, pixbuf.has_alpha, 8,
                    img.width, img.height, img.rowstride);
            })};
        }
        return copy;
    });
}

function toContentVariant(variant) {
    const out = {};
    for (const state of STATES)
        out[state] = {...variant[state], frames: variant[state].frames.map(toContent)};
    return out;
}

// Resolves to [{idle, click, run}], each {width, height, frames: [St.ImageContent]}.
// Besides the variants on disk, it adds recolored copies of the first one.
// Broken variants are logged and skipped; cancellation rejects.
export async function loadVariants(path, cancellable) {
    const root = Gio.File.new_for_path(path);
    const children = await listChildren(root, cancellable);
    const dirs = children.some(i => i.get_name() === 'idle.gif')
        ? [root]
        : children
            .filter(i => i.get_file_type() === Gio.FileType.DIRECTORY)
            .map(i => i.get_name())
            .sort()
            .map(name => root.get_child(name));

    const variants = [];
    for (const dir of dirs) {
        try {
            variants.push(await loadVariant(dir, cancellable));
        } catch (e) {
            if (e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                throw e;
            console.error(`homie: skipping sprites in ${dir.get_path()}: ${e.message}`);
        }
    }
    if (variants.length > 0)
        variants.push(...recolor(variants[0]));
    return variants.map(toContentVariant);
}

// Width/height settings; 0 infers from the aspect ratio. Both 0 → 3× native.
export function spriteSize(native, width, height) {
    const ratio = native.width / native.height;
    if (width > 0 && height > 0)
        return [width, height];
    if (width > 0)
        return [width, Math.round(width / ratio)];
    if (height > 0)
        return [Math.round(height * ratio), height];
    return [native.width * 3, native.height * 3];
}

// A random size between 0.5× and 1.5× of `base` [w, h], in whole multiples
// of the native sprite size so pixel art stays crisp. With the default
// 3× base, 24 px dinos come out 48–120 px tall.
export function randomSize(native, base, rand) {
    const baseScale = base[1] / native.height;
    const min = Math.max(1, Math.round(baseScale * 0.5));
    const max = Math.max(min, Math.round(baseScale * 1.5));
    const k = min + Math.floor(rand * (max - min + 1));
    return [Math.round(base[0] * k / baseScale), native.height * k];
}
