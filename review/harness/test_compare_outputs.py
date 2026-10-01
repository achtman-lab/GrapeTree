import unittest
import tempfile
from pathlib import Path

from compare_outputs import compare_matrices, compare_matrix_files, compare_trees


class ComparatorTests(unittest.TestCase):
    def test_directed_distance_mutation_is_found(self):
        original = "    3\na 0 1 2\nb 3 0 4\nc 5 6 0\n"
        same_different_order = "    3\nc 0 5 6\na 2 0 1\nb 4 3 0\n"
        # Reordered rows and columns retain every directed entry.
        assert compare_matrices(original, same_different_order)["pass"]
        mutated = same_different_order.replace("b 4 3 0", "b 4 30 0")
        result = compare_matrices(original, mutated)
        assert not result["pass"]
        assert any(item.get("source") == "b" and item.get("target") == "a"
                   for item in result["differences"])
        with tempfile.TemporaryDirectory() as directory:
            left = Path(directory) / "left.txt"
            right = Path(directory) / "right.txt"
            left.write_text(original)
            right.write_text(same_different_order)
            assert compare_matrix_files(left, right)["pass"]
            right.write_text(mutated)
            result = compare_matrix_files(left, right)
            assert not result["pass"] and result["difference_count"] == 1

    def test_leaf_length_and_topology_mutations_are_found(self):
        original = "((a:1,b:1):2,(c:1,d:1):2);"
        rerooted = "(a:1,b:1,(c:1,d:1):4);"
        assert compare_trees(original, rerooted)["pass"]
        assert not compare_trees(original, original.replace("a:1", "x:1"))["pass"]
        assert not compare_trees(original, original.replace("a:1", "a:2"))["pass"]
        changed_topology = "((a:1,c:1):2,(b:1,d:1):2);"
        differences = compare_trees(original, changed_topology)["differences"]
        assert any(item["kind"] == "positive_topology" for item in differences)

    def test_zero_length_resolution_is_visible(self):
        first = "((a:0,b:0):0,(c:1,d:1):2);"
        second = "((a:0,c:1):0,(b:0,d:1):2);"
        result = compare_trees(first, second)
        assert any(item["kind"] == "raw_topology" for item in result["differences"])

    def test_large_tree_requires_exact_validated_match(self):
        long_tree = "(" + ",".join(f"n{i}:1" for i in range(1100)) + ");"
        result = compare_trees(long_tree, long_tree)
        assert result["pass"] and result["leaf_count"] == 1100
        changed = long_tree.replace("n1099:1", "n1099:2")
        result = compare_trees(long_tree, changed)
        assert not result["pass"] and result["blocked"]
        malformed = long_tree.replace("n1099:1", "n1099:1:2")
        with self.assertRaisesRegex(ValueError, "unexpected branch length"):
            compare_trees(malformed, malformed)


if __name__ == "__main__":
    unittest.main()
