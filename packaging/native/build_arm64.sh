#!/usr/bin/env bash
# Build GrapeTree's three native Apple silicon helpers from pinned sources.
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
native="$repo/packaging/native"
out="$repo/binaries"
fastme_archive="$native/sources/FastME-v2.1.5.tar.gz"
rapidnj_archive="$native/sources/rapidNJ-ed2d36e219d9db16778b941b5054c0fd021b528a.tar.gz"
boost_include_dir=${BOOST_INCLUDE_DIR:-/opt/homebrew/include}

if [[ $(uname -s) != Darwin || $(uname -m) != arm64 ]]; then
    echo 'Build requires an Apple silicon Mac running macOS.' >&2
    exit 1
fi
if [[ ! -f "$boost_include_dir/boost/version.hpp" ]]; then
    echo "Boost headers required at $boost_include_dir/boost." >&2
    exit 1
fi

printf '%s  %s\n' \
    18965eed4636cca711bf59eeb504a34355b3928dfe07899efb8a9f895b8ae36d "$fastme_archive" \
    6586dbd26171cfd7d8ac124ca5d801afbe81b12e38616ad7bf01ae6da5869c6d "$rapidnj_archive" \
    07723c9f9457dd4316f1fde3dd4eb6f31dd67d9955f6c21f4e609ac1698be48a "$native/include/sse2neon.h" | shasum -a 256 -c -

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
tar -xzf "$fastme_archive" -C "$tmp"
tar -xzf "$rapidnj_archive" -C "$tmp"

cc=/usr/bin/clang
cxx=/usr/bin/clang++
common=(-arch arm64 -mmacosx-version-min=11.0 -O2 "-ffile-prefix-map=$tmp=." -mllvm -rng-seed=0)

"$cxx" "${common[@]}" -std=c++11 -I"$boost_include_dir" \
    "$repo/src/edmonds.cpp" -o "$out/edmonds-osx-arm64"

fastme="$tmp/FastME-v2.1.5"
# The tagged archive omits its autotools-generated config and has two stale
# four-argument TBR calls against the three-argument SPRTopShift declaration.
# Correct those calls in the temporary build tree only.
if [[ $(grep -c 'SPRTopShift (T, es->head' "$fastme/src/TBR.c") != 2 ]]; then
    echo 'Unexpected FastME TBR source; refusing to apply compatibility fix.' >&2
    exit 1
fi
sed -i '' 's/SPRTopShift (T, es->head/SPRTopShift (es->head/g' "$fastme/src/TBR.c"
(
    cd "$fastme"
    "$cc" "${common[@]}" -std=gnu99 -Wno-tautological-pointer-compare \
        -DPACKAGE='"fastme"' -DPACKAGE_NAME='"FastME"' -DPACKAGE_VERSION='"2.1.5"' \
        -DPACKAGE_STRING='"FastME 2.1.5"' -Isrc \
        src/*.c -lm -o "$out/fastme-2.1.5-osx-arm64"
)

rapidnj="$tmp/rapidNJ-ed2d36e219d9db16778b941b5054c0fd021b528a"
rapid_src=("$rapidnj"/src/*.cpp "$rapidnj"/src/distanceCalculation/*.cpp "$rapidnj"/src/getopt_pp/*.cpp)
# Match the upstream Makefile: sim_seq.cpp is a separate test-data generator;
# threadedNJ.cpp is not part of the RapidNJ executable target.
filtered=()
for src in "${rapid_src[@]}"; do
    case "$src" in
        */sim_seq.cpp|*/threadedNJ.cpp) ;;
        *) filtered+=("$src") ;;
    esac
done
"$cxx" "${common[@]}" -std=c++11 -pthread \
    -I"$native/include" -I"$rapidnj/src" -I"$rapidnj/src/distanceCalculation" \
    "${filtered[@]}" -o "$out/rapidnj-osx-arm64"

for binary in "$out/edmonds-osx-arm64" "$out/fastme-2.1.5-osx-arm64" "$out/rapidnj-osx-arm64"; do
    chmod 755 "$binary"
    file "$binary"
    otool -L "$binary"
done
