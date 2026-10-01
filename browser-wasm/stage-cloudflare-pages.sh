#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="${repo_root}/dist/grapetree-pages"
python3 "${repo_root}/browser-wasm/build-worker.py" --check

rm -rf -- "${site_dir}"
mkdir -p "${site_dir}/browser-wasm/vendor/edmonds" "${site_dir}/browser-wasm/vendor/rapidnj"
cp "${repo_root}/MSTree_holder.html" "${site_dir}/"
cp "${repo_root}/LICENSE" "${site_dir}/"
cp -R "${repo_root}/static" "${site_dir}/"
cp -R "${repo_root}/src" "${site_dir}/"
cp -R "${repo_root}/browser-wasm/sources" "${site_dir}/browser-wasm/"
cp "${repo_root}/browser-wasm/"{index.html,app.js,runtime-worker.js,browser-backend.js,edmonds-worker.js,THIRD_PARTY.md,build-worker.py,compile.sh,compile-docker.sh,Dockerfile.build} "${site_dir}/browser-wasm/"
cp "${repo_root}/browser-wasm/vendor/edmonds/"{edmonds.js,edmonds.wasm} "${site_dir}/browser-wasm/vendor/edmonds/"
cp "${repo_root}/browser-wasm/vendor/rapidnj/"{rapidnj.js,rapidnj.wasm,LICENSE} "${site_dir}/browser-wasm/vendor/rapidnj/"

cat > "${site_dir}/_redirects" <<'EOF'
/ /browser-wasm/ 302
EOF

cat > "${site_dir}/_headers" <<'EOF'
/browser-wasm/
  Cache-Control: no-store
/browser-wasm/index.html
  Cache-Control: no-store
/browser-wasm/app.js
  Cache-Control: no-store
/browser-wasm/runtime-worker.js
  Cache-Control: no-store
EOF

cat > "${site_dir}/index.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0; url=/browser-wasm/">
    <title>GrapeTree</title>
  </head>
  <body><a href="/browser-wasm/">Open GrapeTree in your browser</a></body>
</html>
EOF

printf '%s\n' "${site_dir}"
