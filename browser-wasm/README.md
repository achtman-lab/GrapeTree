# GrapeTree browser-only application

This directory is reserved for a browser-only evolution of GrapeTree. It is a
separate product from the established Flask application and must not replace or
silently change that application's behaviour.

The target architecture is:

1. a Web Worker that owns computation and keeps the interface responsive;
2. WebAssembly modules for native tree-building algorithms;
3. browser-native parsing, orchestration, and persistence;
4. an explicit request/result contract shared with the existing backend; and
5. compatibility fixtures that run against both implementations.

The first proof of concept will compile the in-repository Edmonds C++ source
with Emscripten and compare its results with the native backend. FastME and
RapidNJ can follow after their source and licences are verified. Pyodide is a
possible prototyping layer for Python-only calculations, but it cannot provide
the existing subprocess-based backend unchanged.

This folder currently records the product boundary only. Production code will
be added after the compatibility fixtures and performance budgets are in place.

The first shared fixtures now live in
[`tests/fixtures/compatibility/`](../tests/fixtures/compatibility/). Expected
tree results are expressed as pairwise path distances so equivalent Newick
rooting and child order do not produce false failures. Browser and WASM tests
must consume the same profiles and expected JSON rather than create a second
set of baselines.
