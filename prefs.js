import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

Gio._promisify(Gtk.FileDialog.prototype, 'select_folder');

export default class HomiePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;
        const page = new Adw.PreferencesPage();
        window.add(page);

        const sprites = new Adw.PreferencesGroup({title: 'Sprites'});
        page.add(sprites);

        const pathRow = new Adw.ActionRow({title: 'Sprite directory'});
        const showPath = () => {
            pathRow.subtitle = settings.get_string('sprite-path') || 'Bundled dinos';
        };
        showPath();
        settings.connect('changed::sprite-path', showPath);

        const choose = new Gtk.Button({icon_name: 'folder-open-symbolic', valign: Gtk.Align.CENTER});
        choose.connect('clicked', async () => {
            try {
                const dir = await new Gtk.FileDialog({title: 'Sprite directory'}).select_folder(window, null);
                settings.set_string('sprite-path', dir.get_path());
            } catch (e) {
                // Dismissing the dialog rejects; nothing to do.
            }
        });
        const reset = new Gtk.Button({
            icon_name: 'edit-undo-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Use bundled dinos',
        });
        reset.connect('clicked', () => settings.reset('sprite-path'));
        pathRow.add_suffix(choose);
        pathRow.add_suffix(reset);
        sprites.add(pathRow);

        const hide = new Adw.SwitchRow({title: 'Hide in overview'});
        settings.bind('hide-in-overview', hide, 'active', Gio.SettingsBindFlags.DEFAULT);
        sprites.add(hide);

        const look = new Adw.PreferencesGroup({
            title: 'Next flock',
            description: 'These settings apply to dinos spawned from now on. Dinos already running keep theirs.',
        });
        page.add(look);
        const spin = (key, title, subtitle, lower, upper) => {
            const row = Adw.SpinRow.new_with_range(lower, upper, 1);
            row.set({title, subtitle});
            settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
            look.add(row);
        };
        spin('count', 'Number of dinos', '', 1, 100);
        spin('width', 'Base width', 'Pixels; 0 infers from height; dinos vary 0.5–1.5×', 0, 1024);
        spin('height', 'Base height', 'Pixels; 0 infers from width; dinos vary 0.5–1.5×', 0, 1024);
        spin('fps', 'Animation FPS', '', 1, 60);
        spin('speed', 'Speed', 'Steps per second; each dino moves 5–15 px per step', 1, 60);
        spin('click-chance', 'Click animation chance', 'Percent, when clicking an idle dino', 0, 100);

        const toggle = (key, title) => {
            const row = new Adw.SwitchRow({title});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            look.add(row);
        };
        toggle('whole-screen', 'Use the whole screen');

        const spawn = new Adw.ButtonRow({title: 'Spawn dinos'});
        spawn.connect('activated', () =>
            settings.set_int('spawn-counter', settings.get_int('spawn-counter') + 1));
        look.add(spawn);
    }
}
