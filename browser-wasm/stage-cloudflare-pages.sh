#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="${repo_root}/dist/grapetree-pages"

rm -rf -- "${site_dir}"
mkdir -p "${site_dir}/browser-wasm/vendor/edmonds" "${site_dir}/browser-wasm/vendor/rapidnj"
cp "${repo_root}/MSTree_holder.html" "${site_dir}/"
cp "${repo_root}/LICENSE" "${site_dir}/"
cp -R "${repo_root}/static" "${site_dir}/"
cp -R "${repo_root}/src" "${site_dir}/"
cp -R "${repo_root}/browser-wasm/sources" "${site_dir}/browser-wasm/"
cp "${repo_root}/browser-wasm/"{index.html,app.js,worker-loader.js,browser-backend.js,edmonds-worker.js,THIRD_PARTY.md,compile.sh,compile-docker.sh,Dockerfile.build} "${site_dir}/browser-wasm/"
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
/browser-wasm/worker-loader.js
  Cache-Control: no-store
EOF

cat > "${site_dir}/vercel.json" <<'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [{ "source": "/", "destination": "/browser-wasm/", "permanent": false }],
  "headers": [
    { "source": "/browser-wasm/", "headers": [{ "key": "Cache-Control", "value": "no-store" }] },
    { "source": "/browser-wasm/index.html", "headers": [{ "key": "Cache-Control", "value": "no-store" }] },
    { "source": "/browser-wasm/app.js", "headers": [{ "key": "Cache-Control", "value": "no-store" }] },
    { "source": "/browser-wasm/worker-loader.js", "headers": [{ "key": "Cache-Control", "value": "no-store" }] }
  ]
}
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
