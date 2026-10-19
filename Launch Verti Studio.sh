#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
if [ -x 'dist/Verti Studio-linux/verti-studio' ]; then
  exec 'dist/Verti Studio-linux/verti-studio' "$@"
fi
exec node scripts/start.js "$@"
