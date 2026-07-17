import numpy as np
import pytest

from module.MSTrees import distance_matrix


PROFILES_WITH_MISSING_DATA = np.array(
    [
        [1, 1, 0],
        [1, 2, 3],
        [2, 2, 3],
    ]
)


@pytest.mark.parametrize(
    ('missing_handler', 'expected'),
    [
        (
            'pair_delete',
            [[0, 1.5074627, 3], [1.5074627, 0, 1.0066445], [3, 1.0066445, 0]],
        ),
        ('absolute_distance', [[0, 1, 2], [1, 0, 1], [2, 1, 0]]),
        ('as_allele', [[0, 2, 3], [2, 0, 1], [3, 1, 0]]),
        ('complete_delete', [[0, 1, 2], [1, 0, 1], [2, 1, 0]]),
    ],
)
def test_symmetric_missing_data_behaviour(missing_handler, expected):
    observed = distance_matrix.symmetric(
        PROFILES_WITH_MISSING_DATA,
        missing_handler,
    )

    np.testing.assert_allclose(observed, expected)


@pytest.mark.parametrize(
    ('missing_handler', 'expected'),
    [
        ('pair_delete', [[0, 2, 3], [1.5, 0, 1], [3, 1, 0]]),
        ('absolute_distance', [[0, 2, 3], [1, 0, 1], [2, 1, 0]]),
    ],
)
def test_asymmetric_missing_data_behaviour(missing_handler, expected):
    observed = distance_matrix.asymmetric(
        PROFILES_WITH_MISSING_DATA,
        missing_handler,
    )

    np.testing.assert_allclose(observed, expected)


def test_blockwise_distance_behaviour():
    observed = distance_matrix.blockwise(PROFILES_WITH_MISSING_DATA, 0.01)

    np.testing.assert_allclose(
        observed,
        [[0, 2, 2.01], [2, 0, 1], [2.01, 1, 0]],
    )
