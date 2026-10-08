# Shell functions for Homie. Add this line to ~/.bashrc:
#
#   source ~/Desktop/Private/homie/tools/homie.sh
#
#   dinos      adds random dinos along the bottom of the screen
#   dinosall   adds random dinos at random heights across the whole screen
#   nodinos    removes all dinos
#
# Repeated dinos/dinosall calls add more dinos; earlier ones keep running.

HOMIE_UUID=homie@jonathan
HOMIE_DIR=$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..

_homie_set() {
    gsettings --schemadir "$HOMIE_DIR/schemas" set org.gnome.shell.extensions.homie "$1" "$2"
}

# Random integer from $1 to $2, inclusive.
_homie_rand() {
    echo $(( $1 + RANDOM % ($2 - $1 + 1) ))
}

# Adds one flock of random dinos next to any already running.
# $1: true = whole screen, false = bottom only.
_homie_spawn() {
    # These settings only shape the next flock; running dinos keep theirs.
    _homie_set whole-screen "$1"
    _homie_set count "$(_homie_rand 25 100)"
    # Idle/click animation speed; running animation follows each dino's speed.
    _homie_set fps "$(_homie_rand 5 20)"
    _homie_set click-chance "$(_homie_rand 0 100)"
    # Each dino picks its own height (px) and speed (px/s) from these ranges.
    _homie_set size-min 24
    _homie_set size-max 144
    _homie_set speed-min 20
    _homie_set speed-max 1000
    if gnome-extensions info "$HOMIE_UUID" | grep -q 'State: ACTIVE'; then
        # Running: each change of spawn-counter adds one flock.
        local n
        n=$(gsettings --schemadir "$HOMIE_DIR/schemas" get org.gnome.shell.extensions.homie spawn-counter)
        _homie_set spawn-counter "$(( n + 1 ))"
    else
        # Off: enabling spawns the first flock.
        gnome-extensions enable "$HOMIE_UUID"
    fi
}

dinos() {
    _homie_spawn false
}

dinosall() {
    _homie_spawn true
}

nodinos() {
    gnome-extensions disable "$HOMIE_UUID"
}
