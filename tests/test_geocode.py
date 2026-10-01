import json

import numpy as np

from grapetree.module import geocode


class Response:
    status_code = 200

    def __init__(self, payload):
        self.text = json.dumps(payload)


def test_openstreet_geocoding_response_characterisation(monkeypatch):
    payload = [
        {
            'importance': 0.9,
            'type': 'city',
            'display_name': 'London, England, United Kingdom',
            'lon': '-0.1276',
            'lat': '51.5072',
            'boundingbox': ['51.2', '51.7', '-0.5', '0.3'],
            'address': {
                'country_code': 'gb',
                'state': 'England',
                'county': 'Greater London',
                'city': 'London',
            },
        }
    ]
    monkeypatch.setattr(
        geocode.requests,
        'get',
        lambda url: Response(payload),
    )
    countries = np.array(
        [['GB', 'GBR', 'UK', 'United Kingdom', 'Europe']],
        dtype=object,
    )

    result = geocode.geoCoding_openstreet(
        'London',
        country='United Kingdom',
        countries=countries,
    )

    assert result == {
        'Longitude': '-0.1276',
        'Latitude': '51.5072',
        'Continient': 'Europe',
        'Country': 'United Kingdom',
        'admin1': 'England',
        'admin2': 'Greater London',
        'City': 'London',
        'confidence': '0.9',
    }
