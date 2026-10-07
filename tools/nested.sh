#!/bin/bash
# Start a nested GNOME Shell (GNOME 49+) with its own dconf database.
#
# Without this, the nested session's dconf-service writes to the real
# ~/.config/dconf/user and overwrites e.g. enabled-extensions. The variables
# must be exported before dbus-run-session so dconf-service inherits them.
# The database name must be a valid D-Bus path element (no hyphens).
#
# Run commands against the nested shell with:  source /tmp/homie-nested/env
set -e
dir=/tmp/homie-nested
mkdir -p "$dir/config"
echo 'user-db:homienested' > "$dir/dconf-profile"
export XDG_CONFIG_HOME="$dir/config"
export DCONF_PROFILE="$dir/dconf-profile"
exec dbus-run-session bash -c '
    cat > '"$dir"'/env <<END
export XDG_CONFIG_HOME='"$dir"'/config
export DCONF_PROFILE='"$dir"'/dconf-profile
export DBUS_SESSION_BUS_ADDRESS=$DBUS_SESSION_BUS_ADDRESS
END
    exec gnome-shell --devkit'
