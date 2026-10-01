import gzip
import json
import tempfile
import unittest
from pathlib import Path

from sample_profiles import sample_archive


class SamplerTests(unittest.TestCase):
    def test_seeded_streaming_sample_is_reproducible_and_reaches_late_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "profiles.list.gz"
            with gzip.open(source, "wt") as handle:
                handle.write("ST\tL1\tL2\n")
                for index in range(1, 101):
                    handle.write(f"{index}\t{index}\t{index + 1}\n")
            first = sample_archive(source, root / "first", "Test", [3, 10], [7],
                                   "https://example.invalid/profiles.list.gz")
            second = sample_archive(source, root / "second", "Test", [3, 10], [7],
                                    "https://example.invalid/profiles.list.gz")
            for item_a, item_b in zip(first, second):
                assert Path(item_a["profile"]).read_bytes() == Path(item_b["profile"]).read_bytes()
            manifest = json.loads(Path(first[1]["manifest"]).read_text())
            selected = [int(row["source_id"]) for row in manifest["selected_records"]]
            assert manifest["source_record_count"] == 100
            assert manifest["source_column_count"] == 3
            assert len(set(selected)) == 10
            assert max(selected) > 10

    def test_malformed_row_fails_with_line_number(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "bad.list.gz"
            with gzip.open(source, "wt") as handle:
                handle.write("ST\tL1\tL2\n1\t1\t2\n2\t3\n")
            with self.assertRaisesRegex(ValueError, "line 3"):
                sample_archive(source, root / "samples", "Test", [1], [7], "source")


if __name__ == "__main__":
    unittest.main()
