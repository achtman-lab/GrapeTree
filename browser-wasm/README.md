# Browser-only GrapeTree

This is a separate product track from the Flask application. It runs scientific
calculation in a Web Worker so uploaded data stays in the browser.

The browser app accepts GrapeTree profile files and currently calculates
MSTree, MSTreeV2, and all four established missing-data distance modes in a Web
Worker. MSTreeV2 uses GrapeTree's in-repository Edmonds optimum-branching
implementation compiled to WebAssembly. Results are loaded into the established
interactive visualiser in the same static page, without contacting Flask.

The generated JavaScript and WASM are built reproducibly with Emscripten 3.1.50. The upstream biowasm
repository still declares its older 2.0.25 image; GrapeTree uses the newer
version in the maintained compilation guidance while retaining an exact pin.

```bash
./browser-wasm/compile-docker.sh
python -m http.server 8001
```

Open <http://127.0.0.1:8001/browser-wasm/>. The Playwright suite checks the
worker's output against the same expected branching as the native source.

The shared Playwright fixtures check MSTree, MSTreeV2, every missing-data mode,
the full issue #82 technical-replicate input, the native/WASM branching result,
and actual visualiser rendering. NJ and RapidNJ remain server/native-only until
their canonical sources and licences are verified and browser builds reach the
same compatibility bar.
