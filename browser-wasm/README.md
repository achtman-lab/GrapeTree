# Browser-only GrapeTree

This is a separate product track from the Flask application. It runs scientific
calculation in a Web Worker so uploaded data stays in the browser.

The first compatibility slice compiles GrapeTree's in-repository Edmonds
optimum-branching implementation to WebAssembly. The generated JavaScript and
WASM are built reproducibly with Emscripten 3.1.50. The upstream biowasm
repository still declares its older 2.0.25 image; GrapeTree uses the newer
version in the maintained compilation guidance while retaining an exact pin.

```bash
./browser-wasm/compile-docker.sh
python -m http.server 8001
```

Open <http://127.0.0.1:8001/browser-wasm/>. The Playwright suite checks the
worker's output against the same expected branching as the native source.

This is not yet the full browser product. Profile parsing, distance matrices,
MSTree/MSTreeV2 assembly, and the existing visualiser still need to be joined
behind the worker API before issue #113 can close.
