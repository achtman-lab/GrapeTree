from copy import deepcopy

import pytest

from module import MSTrees, app


@pytest.fixture(autouse=True)
def restore_mutable_application_state():
    """Keep legacy module-level configuration from leaking between tests."""
    backend_params = deepcopy(MSTrees.params)
    app_params = deepcopy(app.config.get('PARAMS', {}))

    yield

    MSTrees.params.clear()
    MSTrees.params.update(backend_params)
    app.config['PARAMS'] = app_params
