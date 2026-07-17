#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:-/work}"
output_dir="${repo_root}/browser-wasm/vendor/edmonds"
mkdir -p "${output_dir}"

em++ "${repo_root}/src/edmonds.cpp" \
  -I"${repo_root}/src" \
  -idirafter /usr/include \
  -std=c++11 \
  -O3 \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MAXIMUM_MEMORY=4GB \
  -s FORCE_FILESYSTEM=1 \
  -s INVOKE_RUN=0 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createEdmonds \
  -s ENVIRONMENT=web,worker \
  -s 'EXPORTED_RUNTIME_METHODS=["callMain","FS"]' \
  -o "${output_dir}/edmonds.js"
