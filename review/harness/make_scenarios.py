#!/usr/bin/env python3
"""Create deterministic metadata and close-cluster challenge profiles."""

import argparse
import csv
import json
from pathlib import Path


def read_profiles(path):
    with open(path, newline="") as handle:
        rows = list(csv.reader(handle, delimiter="\t"))
    if len(rows) < 3 or len({len(row) for row in rows}) != 1:
        raise ValueError("input requires a rectangular profile table with two samples")
    return rows


def write_tsv(path, rows):
    with open(path, "w", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerows(rows)


def make_metadata(names):
    countries = ["United Kingdom", "France", "Kenya", "Japan"]
    sources = ["Human", "Food", "Environment", "Animal"]
    rows = [["ID", "Country", "Year", "Source", "Cluster", "Score",
             "Latitude", "Longitude", "Comment"]]
    for index, name in enumerate(names):
        rows.append([
            name, countries[index % len(countries)], str(2018 + index % 8),
            sources[(index // 2) % len(sources)], f"C{index // 3 + 1}",
            str(index * 1.25), str(51.5 + index * .1), str(-0.1 + index * .1),
            "café / Δ" if index == 0 else ("" if index % 5 == 0 else "synthetic"),
        ])
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    rows = read_profiles(args.profile)
    args.output.mkdir(parents=True, exist_ok=True)
    names = [row[0] for row in rows[1:]]
    metadata_path = args.output / f"{args.profile.stem}.metadata.tsv"
    write_tsv(metadata_path, make_metadata(names))

    base = rows[1][1:]
    distant = rows[2][1:]
    nonmissing = [index for index, value in enumerate(base) if value not in ("0", "N", "-")]
    if len(nonmissing) < 5:
        raise ValueError("base profile has too few non-missing loci")
    altered = []
    for loci_changed in (1, 2, 3):
        values = base.copy()
        for index in nonmissing[:loci_changed]:
            values[index] = str(int(values[index]) + 100000 + loci_changed)
        altered.append(values)
    missing = base.copy()
    missing[nonmissing[0]] = "0"
    missing[nonmissing[1]] = "0"
    challenge_rows = [rows[0], ["outbreak_ref"] + base,
                      ["outbreak_duplicate"] + base,
                      ["outbreak_1"] + altered[0],
                      ["outbreak_2"] + altered[1],
                      ["outbreak_3"] + altered[2],
                      ["outbreak_missing"] + missing,
                      ["outbreak_outlier"] + distant]
    challenge_path = args.output / "synthetic_outbreak.profile"
    write_tsv(challenge_path, challenge_rows)
    challenge_metadata = args.output / "synthetic_outbreak.metadata.tsv"
    write_tsv(challenge_metadata, make_metadata([row[0] for row in challenge_rows[1:]]))
    all_missing = args.output / "synthetic_all_missing.profile"
    write_tsv(all_missing, challenge_rows + [["all_missing"] + ["0"] * len(base)])
    duplicate_id = args.output / "synthetic_duplicate_id.profile"
    write_tsv(duplicate_id, challenge_rows + [["outbreak_ref"] + distant])
    manifest = {"source": str(args.profile.resolve()),
                "metadata": str(metadata_path.resolve()),
                "challenge_profile": str(challenge_path.resolve()),
                "challenge_metadata": str(challenge_metadata.resolve()),
                "all_missing_profile": str(all_missing.resolve()),
                "duplicate_id_profile": str(duplicate_id.resolve()),
                "claims": "All metadata and modified allele calls are synthetic; source rows are documented in the sampling manifest."}
    (args.output / "scenarios.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
