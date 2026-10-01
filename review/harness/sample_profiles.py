#!/usr/bin/env python3
"""Reproducibly sample complete cgMLST records from an EnteroBase archive.

The largest requested sample is selected with reservoir sampling in one pass.
Smaller samples are independently shuffled subsets of that reservoir.  Every
sample is therefore uniform over the whole source archive, not its first rows.
"""

import argparse
import gzip
import hashlib
import json
import platform
import random
from datetime import datetime, timezone
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def sample_archive(source, output, species, sizes, seeds, source_url):
    source = Path(source)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    sizes = sorted(set(sizes))
    if not sizes or sizes[0] < 1:
        raise ValueError("sample sizes must be positive")
    width = None
    reservoirs = {seed: [] for seed in seeds}
    generators = {seed: random.Random(seed) for seed in seeds}
    count = 0
    opener = gzip.open if source.suffix == ".gz" else open
    with opener(source, "rt", encoding="utf-8", newline="") as handle:
        raw_header = handle.readline().rstrip("\r\n")
        if not raw_header:
            raise ValueError("source is empty")
        fields = raw_header.split("\t")
        if len(fields) < 2:
            raise ValueError("source has no allele columns")
        width = len(fields)
        header = "#Strain\t" + "\t".join(fields[1:]) + "\n"
        for line_number, raw in enumerate(handle, 2):
            line = raw.rstrip("\r\n")
            if not line or line.startswith("#"):
                continue
            values = line.split("\t")
            if len(values) != width:
                raise ValueError(
                    f"line {line_number}: {len(values)} columns, expected {width}"
                )
            if not values[0]:
                raise ValueError(f"line {line_number}: empty source ID")
            count += 1
            record = (line_number, values[0], line)
            for seed, reservoir in reservoirs.items():
                if len(reservoir) < sizes[-1]:
                    reservoir.append(record)
                else:
                    place = generators[seed].randrange(count)
                    if place < sizes[-1]:
                        reservoir[place] = record
    if count < sizes[-1]:
        raise ValueError(f"requested {sizes[-1]} rows but source contains {count}")

    source_digest = sha256(source)
    retrieval_time = datetime.fromtimestamp(source.stat().st_mtime, timezone.utc).isoformat()
    result = []
    for seed, reservoir in reservoirs.items():
        for size in sizes:
            # Separate stable shuffle per size means each case is independently
            # reproducible and cannot depend on the order of --sizes arguments.
            selection = random.Random(f"{seed}:{size}:subset").sample(reservoir, size)
            selection.sort(key=lambda item: item[0])
            ids = [record[1] for record in selection]
            if len(set(ids)) != len(ids):
                raise ValueError(f"duplicate source IDs in seed {seed}, size {size}")
            stem = f"{species}.n{size}.s{seed}"
            path = output / f"{stem}.profile"
            with path.open("wt", encoding="utf-8", newline="\n") as out:
                out.write(header)
                for line_number, source_id, line in selection:
                    out.write(f"{species}_ST{source_id}\t{line.split(chr(9), 1)[1]}\n")
            manifest = {
                "schema_version": 1,
                "source_url": source_url,
                "source_path": str(source.resolve()),
                "source_sha256": source_digest,
                "source_file_mtime_utc": retrieval_time,
                "source_record_count": count,
                "source_column_count": width,
                "species": species,
                "sample_size": size,
                "seed": seed,
                "sampling": "reservoir(max_requested_size), then seeded uniform subset",
                "reservoir_size": sizes[-1],
                "requested_sizes": sizes,
                "rng_algorithm": "Python random.Random MT19937",
                "python_version": platform.python_version(),
                "subset_seed": f"{seed}:{size}:subset",
                "selected_records": [
                    {"line": row[0], "source_id": row[1]} for row in selection
                ],
                "profile_path": str(path.resolve()),
                "profile_sha256": sha256(path),
            }
            manifest_path = output / f"{stem}.manifest.json"
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
            result.append({"profile": str(path), "manifest": str(manifest_path)})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--species", required=True)
    parser.add_argument("--sizes", type=int, nargs="+", required=True)
    parser.add_argument("--seeds", type=int, nargs="+", default=[7, 19, 43])
    parser.add_argument("--source-url", required=True)
    args = parser.parse_args()
    print(json.dumps(sample_archive(
        args.source, args.output, args.species, args.sizes,
        args.seeds, args.source_url,
    ), indent=2))


if __name__ == "__main__":
    main()
