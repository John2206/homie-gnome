# Shell functions for Homie. Add this line to ~/.bashrc:
#
#   source ~/Desktop/Private/homie/tools/homie.sh
#
#   dinos     spawns a fresh set of dinos with random settings
#   nodinos   removes all dinos

HOMIE_UUID=homie@jonathan
HOMIE_DIR=$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..

_homie_set() {
    gsettings --schemadir "$HOMIE_DIR/schemas" set org.gnome.shell.extensions.homie "$1" "$2"
}

# Random integer from $1 to $2, inclusive.
_homie_rand() {
    echo $(( $1 + RANDOM % ($2 - $1 + 1) ))
}

dinos() {
    # Disable first so the new settings apply in one rebuild, not one per key.
    gnome-extensions disable "$HOMIE_UUID" 2>/dev/null
    _homie_set count "$(_homie_rand 25 100)"
    _homie_set fps "$(_homie_rand 5 20)"
    _homie_set speed "$(_homie_rand 10 50)"
    _homie_set click-chance "$(_homie_rand 0 100)"
    # Base height in multiples of the 24 px sprite; each dino varies around it.
    _homie_set width 0
    _homie_set height "$(( 24 * $(_homie_rand 1 6) ))"
    gnome-extensions enable "$HOMIE_UUID"
}

nodinos() {
    gnome-extensions disable "$HOMIE_UUID"
}
