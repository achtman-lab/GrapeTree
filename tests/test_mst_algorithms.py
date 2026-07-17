import subprocess

import numpy as np
import pytest

from grapetree.module import MSTrees
from grapetree.module.MSTrees import methods


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
