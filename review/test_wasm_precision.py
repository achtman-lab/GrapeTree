"""Independent checks for localised NJ branch precision comparison."""

from pathlib import Path

from review.wasm_precision import compare_edges


EXPECTED = (
    Path(__file__).resolve().parents[1] / 'tests' / 'fixtures' / 'compatibility' /
    'review_outbreak.NJ.nwk'
)


def test_equivalent_rerooted_edge_lengths_are_summed():
    rooted = '((A:1,B:2):3,(C:4,D:5):6);'
    rerooted = '(A:1,B:2,(C:4,D:5):9);'
    assert compare_edges(rooted, rerooted)['pass']


def test_small_wrong_internal_branch_fails_on_long_tree():
    expected = EXPECTED.read_text()
    altered = expected.replace('):0,', '):0.010914,', 1)
    assert altered != expected
    report = compare_edges(expected, altered)
    assert not report['pass']
    assert any(item['kind'] == 'branch_length' for item in report['differences'])
