from copy import deepcopy

import pytest

from grapetree.module import app


@pytest.fixture(autouse=True)
def restore_mutable_application_state():
    """Keep Flask application configuration from leaking between tests."""
    app_params = deepcopy(app.config.get('PARAMS', {}))

    yield

    app.config['PARAMS'] = app_params
