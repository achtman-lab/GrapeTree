import sys
sys.path.append('c:\\Users\\Nabil\\Dropbox\\py\\EnteroMSTree')
from grapetree import app
import pytest
import os

def test_bsa_asymetric(): 
    app_test = app.test_client()
    with open(os.path.join('examples','sim14_005_0_7.profile')) as f:
        test_profile = f.read()
    with open(os.path.join('examples','sim14_005_0_7.BSA.nwk')) as f:
        test_results = f.read()
    tree =  app_test.post('/maketree', data=dict(profile=test_profile))
    assert str(tree.data).strip() == test_results

def test_bsa_symetric(): 
    app_test = app.test_client()
    with open(os.path.join('examples','sim14_005_0_7.profile')) as f:
        test_profile = f.read()
    with open(os.path.join('examples','sim14_005_0_7.BSA_sym.nwk')) as f:
        test_results = f.read()
    tree =  app_test.post('/maketree', data=dict(profile=test_profile, matrix_type='symmetric'))
    assert str(tree.data).strip() == test_results

def test_bad_profile(): 
    app_test = app.test_client()
    with open(os.path.join('examples','bad_profile.profile')) as f:
        test_profile = f.read()
    tree =  app_test.post('/maketree', data=dict(profile=test_profile))
    assert tree.status_code == 500

def test_405():
    # maketree must be POST - cause of data size otherwise return 405
    app_test = app.test_client()
    respones = app_test.get('/maketree')
    assert respones.status_code == 405

def test_params():
    # BSA params cannot be null
    app_test = app.test_client()
    assert app.config.get('PARAMS') is not None

if __name__ == "__main__":
    test_bsa_asymetric()
    test_bad_profile()