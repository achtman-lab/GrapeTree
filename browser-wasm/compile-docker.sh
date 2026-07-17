#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
image_name="grapetree-emscripten:3.1.50"

docker build --platform linux/amd64 -t "${image_name}" -f "${script_dir}/Dockerfile.build" "${script_dir}"
docker run --rm --platform linux/amd64 \
  -v "${repo_root}:/work" \
  "${image_name}" \
  bash /work/browser-wasm/compile.sh
