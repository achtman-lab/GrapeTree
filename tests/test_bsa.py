import json
from urllib.parse import urlencode

from grapetree.module import app
from grapetree.module.MSTrees import backend


PROFILE = """#Strain\tA\tB
alpha\t1\t1
beta\t1\t2
gamma\t2\t2
"""


EXPECTED_DISTANCE_MATRIX = """    3
alpha      0.000000 0.502488 1.000000
beta       0.502488 0.000000 0.502488
gamma      1.000000 0.502488 0.000000"""


def test_distance_matrix_characterisation():
    app_test = app.test_client()
    response = app_test.post(
        '/maketree',
        data=dict(profile=PROFILE, method='distance', checkEnv='0'),
    )

    assert response.status_code == 200
    assert response.get_data(as_text=True) == EXPECTED_DISTANCE_MATRIX


def test_maketree_request_does_not_leak_into_the_next_request():
    app_test = app.test_client()
    generated = app_test.post(
        '/maketree',
        data=dict(profile=PROFILE, method='distance', checkEnv='0'),
    )
    empty = app_test.post('/maketree')

    assert generated.status_code == 200
    assert empty.status_code == 204


def test_duplicate_taxa_return_a_user_input_error():
    duplicate_profile = """#Strain\tA\tB
alpha\t1\t1
alpha\t1\t2
"""

    response = app.test_client().post(
        '/maketree',
        data=dict(
            profile=duplicate_profile,
            method='MSTreeV2',
            checkEnv='0',
        ),
    )

    assert response.status_code == 400
    assert response.get_data(as_text=True) == (
        'Duplicate taxon names after sanitising: alpha'
    )


def test_mstree_v2_characterisation():
    tree = backend(profile=PROFILE, method='MSTreeV2', n_proc=1)

    assert tree == '(alpha:1,gamma:1,beta:0);'


def test_large_profile_form_field_reaches_backend():
    loci = 1521
    header = '#Strain\t' + '\t'.join(
        'locus_{0}'.format(index) for index in range(loci)
    )
    rows = [
        'sample_{0}\t{1}'.format(
            sample,
            '\t'.join(
                str(((sample * 17 + locus * 7) % 31) + 1)
                for locus in range(loci)
            ),
        )
        for sample in range(80)
    ]
    profile = '\n'.join([header] + rows)

    response = app.test_client().post(
        '/maketree',
        data=dict(profile=profile, method='MSTreeV2', checkEnv='1'),
    )

    encoded_form = urlencode(
        dict(profile=profile, method='MSTreeV2', checkEnv='1')
    ).encode()
    assert len(encoded_form) > 500_000
    assert response.status_code == 200
    estimate = json.loads(response.get_data(as_text=True))
    assert estimate['memory'] > 0
    assert estimate['time'] > 0


def test_oversized_profile_preserves_the_http_413_status(monkeypatch):
    monkeypatch.setitem(app.config, 'MAX_CONTENT_LENGTH', 100)
    monkeypatch.setitem(app.config, 'MAX_FORM_MEMORY_SIZE', 100)

    response = app.test_client().post(
        '/maketree',
        data=dict(
            profile='#Strain\tA\n' + ('sample\t1\n' * 100),
            method='MSTreeV2',
            checkEnv='0',
        ),
    )

    assert response.status_code == 413


def test_405():
    # maketree must be POST - cause of data size otherwise return 405
    app_test = app.test_client()
    response = app_test.get('/maketree')
    assert response.status_code == 405


def test_params():
    # BSA params cannot be null
    app_test = app.test_client()
    assert app.config.get('PARAMS') is not None
    assert app.config['PARAMS']['n_proc'] == 1
