#!/usr/bin/env bash
set -euo pipefail
node_version=22.14.0
node_archive="node-v${node_version}-darwin-arm64.tar.gz"
node_directory="${TMPDIR:-/tmp}/verti-ci-node"
mkdir -p "$node_directory"
curl -fsSL --retry 3 "https://nodejs.org/dist/v${node_version}/SHASUMS256.txt" -o "$node_directory/SHASUMS256.txt"
curl -fsSL --retry 3 "https://nodejs.org/dist/v${node_version}/$node_archive" -o "$node_directory/$node_archive"
(
  cd "$node_directory"
  awk -v name="$node_archive" '$2 == name' SHASUMS256.txt > expected.sha256
  test -s expected.sha256
  shasum -a 256 -c expected.sha256
  tar -xzf "$node_archive"
)
# CircleCI sources BASH_ENV in subsequent run steps.
printf 'export PATH="%s/bin:$PATH"\n' "$node_directory/node-v${node_version}-darwin-arm64" >> "$BASH_ENV"
