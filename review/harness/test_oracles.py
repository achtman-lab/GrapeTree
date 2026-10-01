import tempfile
import unittest
from pathlib import Path

from oracles import complete_delete_distance_oracle


class OracleTests(unittest.TestCase):
    def test_complete_delete_uses_only_fully_called_loci(self):
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory) / "small.profile"
            profile.write_text("#Strain\tA\tB\tC\na\t1\t0\t1\nb\t2\t2\t1\nc\t2\t2\t3\n")
            correct = "    3\na 0 .5 1\nb .5 0 .5\nc 1 .5 0\n"
            assert complete_delete_distance_oracle(profile, correct)["pass"]
            changed = correct.replace("b .5 0 .5", "b .5 0 0")
            result = complete_delete_distance_oracle(profile, changed)
            assert not result["pass"]
            assert result["difference_count"] == 1


if __name__ == "__main__":
    unittest.main()
