from grapetree import app

def test_tautology():
    assert True  == True

def test_server_home():
    app_test = app.test_client()
    homepage =  app_test.get('/')
    assert homepage.status_code == 200
    bad_homepage =  app_test.get('/safgasdgag')
    assert bad_homepage.status_code == 404

