# Cloudflare Pages hosting

The browser-only GrapeTree app is static. `stage-cloudflare-pages.sh` copies its
runtime assets and the established visualiser into `dist/grapetree-pages/`.
The root URL redirects to `/browser-wasm/`; the original visualiser remains at
`/MSTree_holder.html`. Uploaded profiles stay in the browser.
The generated `_headers` and `vercel.json` make the app shell and bundled worker
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
and run a browser profile-load check before attaching `grapetree.genomicx.org`.
Adding that domain in the Pages dashboard and updating DNS is a separate
production cutover. The repository's GitHub Pages site and manually managed
Vercel browser preview are independent of this Pages project.

The staging script must be rerun after changing any file in `MSTree_holder.html`,
`static/`, or the browser runtime. It excludes Flask and Python packages from
the hosted output. The licence, third-party notice, corresponding source, and
compilation instructions remain available in the bundle for the shipped
WebAssembly modules.

The existing Vercel browser preview uses the same staged files. Its public
`grapetree-browser-preview.vercel.app` alias points to the production target of
the preview-named Vercel project, so update it with:

```bash
vercel link --cwd dist/grapetree-pages --project grapetree-browser-preview --yes
vercel deploy --prod --yes --cwd dist/grapetree-pages
```

This command updates only that Vercel preview project; it does not attach the
Cloudflare custom domain.

Cloudflare documentation: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/),
[branch previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/),
[_headers](https://developers.cloudflare.com/pages/configuration/headers/),
and [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).
[Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
documents the generated `vercel.json` headers and redirect.
