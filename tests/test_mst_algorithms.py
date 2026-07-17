import subprocess
import numpy as np
import pytest

from grapetree.module import MSTrees
from grapetree.module.MSTrees import contemporary, methods, shortcut_links


EDMONDS_DISTANCES = np.array(
    [
        [0.0, 5.0, 5.0],
        [5.0, 0.0, 5.0],
        [5.0, 5.0, 0.0],
    ]
)
WEIGHTS = np.array([0.0, 0.1, 0.2])


def asymmetric_config(tmp_path, edmonds_path):
    return {
        'tempfix': str(tmp_path / 'grapetree'),
        'edmonds_Test': str(edmonds_path),
    }


def test_contemporary_accepts_scalar_distances_without_a_jit_runtime():
    assert contemporary(1.0, 2.0, 3.0, 1.0, 100) is False
    assert contemporary(1.0, 2.0, 1.0, 1.0, 100) is True
    assert not hasattr(contemporary, 'signatures')


def legacy_shortcut_links(dist, weight, cutoff):
    links = np.array(np.where(dist < (cutoff + 1)))
    links = links.T[weight[links[0]] < weight[links[1]]].T
    links = np.vstack([
        links,
        dist[tuple(links.tolist())] + weight[links[0]],
    ])
    links = links.T[np.lexsort(links)]
    return links[
        np.unique(links.T[1], return_index=True)[1]
    ].astype(int)


def test_shortcut_selection_matches_the_legacy_algorithm():
    distances = np.array([
        [0, 1, 4, 2, 9],
        [1, 0, 2, 4, 5],
        [4, 2, 0, 1, 2],
        [2, 4, 1, 0, 1],
        [9, 5, 2, 1, 0],
    ], dtype=float)
    weights = np.array([0.4, 0.1, 0.3, 0.0, 0.2])

    np.testing.assert_array_equal(
        shortcut_links(distances, weights, cutoff=2),
        legacy_shortcut_links(distances, weights, cutoff=2),
    )


@pytest.mark.parametrize('seed', range(10))
def test_shortcut_selection_matches_legacy_randomised_inputs(seed):
    random = np.random.default_rng(seed)
    distances = random.integers(0, 10, size=(30, 30)).astype(float)
    weights = random.random(30)

    np.testing.assert_array_equal(
        shortcut_links(distances, weights, cutoff=5),
        legacy_shortcut_links(distances, weights, cutoff=5),
    )


def test_dense_shortcut_selection_keeps_only_linear_edge_storage(
    monkeypatch,
):
    size = 1_000
    distances = np.zeros((size, size), dtype=np.float32)
    weights = np.arange(size, dtype=float) / size
    monkeypatch.setattr(
        np,
        'where',
        lambda *args, **kwargs: pytest.fail(
            'shortcut selection materialised a coordinate list'
        ),
    )

    links = shortcut_links(distances, weights, cutoff=2)

    assert links.shape == (size - 1, 3)
    assert links.nbytes < distances.nbytes / 100


def test_asymmetric_mst_uses_networkx_when_edmonds_is_unavailable(
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(MSTrees.platform, 'system', lambda: 'Test')
    monkeypatch.setattr(
        MSTrees.subprocess,
        'run',
        lambda *args, **kwargs: pytest.fail('unavailable executable was run'),
    )
    config = asymmetric_config(tmp_path, tmp_path / 'missing-edmonds')

    tree = methods._asymmetric(EDMONDS_DISTANCES.copy(), WEIGHTS, config)

    assert len(tree) == 2


def test_malformed_edmonds_output_is_not_silently_substituted(
    tmp_path,
    monkeypatch,
):
    edmonds_path = tmp_path / 'edmonds'
    edmonds_path.write_text('#!/bin/sh\n')
    edmonds_path.chmod(0o755)
    config = asymmetric_config(tmp_path, edmonds_path)
    monkeypatch.setattr(MSTrees.platform, 'system', lambda: 'Test')
    monkeypatch.setattr(
        MSTrees.subprocess,
        'run',
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=args,
            returncode=0,
            stdout=b'not an edge list',
            stderr=b'',
        ),
    )

    with pytest.raises(ValueError, match='Invalid Edmonds output'):
        methods._asymmetric(EDMONDS_DISTANCES.copy(), WEIGHTS, config)


def test_edmonds_execution_failure_uses_networkx_fallback(
    tmp_path,
    monkeypatch,
):
    def fail_edmonds(*args, **kwargs):
        raise subprocess.CalledProcessError(1, args[0])

    edmonds_path = tmp_path / 'edmonds'
    edmonds_path.write_text('#!/bin/sh\n')
    edmonds_path.chmod(0o755)
    config = asymmetric_config(tmp_path, edmonds_path)
    monkeypatch.setattr(MSTrees.platform, 'system', lambda: 'Test')
    monkeypatch.setattr(
        MSTrees.subprocess,
        'run',
        fail_edmonds,
    )

    tree = methods._asymmetric(EDMONDS_DISTANCES.copy(), WEIGHTS, config)

    assert len(tree) == 2
