# Cloudflare Pages hosting

The browser-only GrapeTree app is static. `stage-cloudflare-pages.sh` copies its
runtime assets and the established visualiser into `dist/grapetree-pages/`.
The root URL redirects to `/browser-wasm/`; the original visualiser remains at
`/MSTree_holder.html`. Uploaded profiles stay in the browser.
The generated `_headers` make the app shell and bundled worker
revalidate on each visit, so a previous deployment does not keep invoking an
old worker revision.

```bash
./browser-wasm/stage-cloudflare-pages.sh
wrangler pages deploy dist/grapetree-pages --project-name grapetree --branch codex-wasm-preview
```

The Cloudflare Pages project `grapetree` already exists with `master` as its
production branch. Authenticate Wrangler to the GenomicX Cloudflare account
before deploying.

The non-production branch creates a Pages preview URL. Inspect the returned URL
and run a browser profile-load check before promoting the same staged bundle:

```bash
wrangler pages deploy dist/grapetree-pages --project-name grapetree --branch master
```

The production site is <https://grapetree.genomicx.org/browser-wasm/>.
Cloudflare Pages binds `grapetree.genomicx.org` to the `grapetree` project;
the proxied DNS CNAME `grapetree` points to `grapetree.pages.dev`. Check the
Pages custom-domain status and HTTPS after a production deployment. The
repository's GitHub Pages site is independent of this Pages project.

The staging script must be rerun after changing any file in `MSTree_holder.html`,
`static/`, or the browser runtime. It excludes Flask and Python packages from
the hosted output. The licence, third-party notice, corresponding source, and
compilation instructions remain available in the bundle for the shipped
WebAssembly modules.

Cloudflare documentation: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/),
[branch previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/),
[_headers](https://developers.cloudflare.com/pages/configuration/headers/),
and [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).
