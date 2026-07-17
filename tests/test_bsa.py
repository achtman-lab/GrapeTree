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


def test_mstree_v2_characterisation():
    tree = backend(profile=PROFILE, method='MSTreeV2', n_proc=1)

    assert tree == '(alpha:1,gamma:1,beta:0);'


def test_405():
    # maketree must be POST - cause of data size otherwise return 405
    app_test = app.test_client()
    response = app_test.get('/maketree')
    assert response.status_code == 405


def test_params():
    # BSA params cannot be null
    app_test = app.test_client()
    assert app.config.get('PARAMS') is not None
