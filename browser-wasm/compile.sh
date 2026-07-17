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

rapidnj_commit="ed2d36e219d9db16778b941b5054c0fd021b528a"
rapidnj_archive="${repo_root}/browser-wasm/sources/rapidNJ-${rapidnj_commit}.tar.gz"
rapidnj_build="$(mktemp -d)"
trap 'rm -rf "${rapidnj_build}"' EXIT
tar -xzf "${rapidnj_archive}" -C "${rapidnj_build}" --strip-components=1

emmake make -C "${rapidnj_build}" -j2 \
  CC=em++ \
  LINK=em++ \
  OPTIMIZATION_LEVEL='-O2 -msse2 -msimd128' \
  LIBRARIES='' \
  SWITCHES="-s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=4GB -s FORCE_FILESYSTEM=1 -s INVOKE_RUN=0 -s MODULARIZE=1 -s EXPORT_NAME=createRapidNJ -s ENVIRONMENT=web,worker -s 'EXPORTED_RUNTIME_METHODS=[\"callMain\",\"FS\"]'"

rapidnj_output="${repo_root}/browser-wasm/vendor/rapidnj"
mkdir -p "${rapidnj_output}"
install -m 0644 "${rapidnj_build}/bin/rapidnj" "${rapidnj_output}/rapidnj.js"
install -m 0644 "${rapidnj_build}/bin/rapidnj.wasm" "${rapidnj_output}/rapidnj.wasm"
install -m 0644 "${rapidnj_build}/LICENSE" "${rapidnj_output}/LICENSE"
