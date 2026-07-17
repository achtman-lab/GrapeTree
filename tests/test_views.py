from io import StringIO
import json

from ete3 import Tree
import pandas as pd

from grapetree.module import app, views


class MicroReactResponse:
    text = json.dumps({'url': 'https://example.test/project'})


def test_send_to_microreact_payload_characterisation(monkeypatch):
    metadata = """ID\tlatitude\tlongitude\tgroup
alpha\t51.5\t-0.1\tA
beta\t52\t-1\tB
"""
    posted = {}

    def capture_post(url, json):
        posted['url'] = url
        posted['payload'] = json
        return MicroReactResponse()

    monkeypatch.setattr(views, 'geoCoding', lambda rows: [])
    monkeypatch.setattr(views.requests, 'post', capture_post)

    response = app.test_client().post(
        '/sendToMicroReact',
        data={
            'tree': '(alpha:1,beta:1,gamma:1);',
            'metadata': metadata,
            'colors': json.dumps({'group': {'A': '#123456'}}),
            'name': 'Characterisation project',
        },
    )

    assert response.status_code == 200
    assert response.get_data(as_text=True) == 'https://example.test/project'
    assert posted['url'] == 'https://microreact.org/api/project/'
    assert posted['payload']['name'] == 'Characterisation project'

    submitted_tree = Tree(posted['payload']['tree'], format=1)
    submitted_metadata = pd.read_csv(StringIO(posted['payload']['data']))
    assert sorted(submitted_tree.get_leaf_names()) == ['alpha', 'beta']
    assert submitted_metadata['id'].tolist() == ['alpha', 'beta']
    assert submitted_metadata['group__color'].tolist() == [
        '#123456',
        '#FFFFFF',
    ]
