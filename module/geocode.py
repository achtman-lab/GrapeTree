import os, sys, re, requests, json, pandas as pd, numpy as np
import copy, unidecode
def geoCoding_openstreet(location, country='', countries=None) :
    res = dict(Longitude='',  Latitude='',
               Continient='', Country='',
               admin1='',     admin2='',
               City='',
               confidence='0.',
               )
    
    data = []
    openstreetApi = 'https://nominatim.openstreetmap.org/?format=json&addressdetails=1&limit=10&q={location}&country={country}&accept-language=en-GB'
    q = requests.get(openstreetApi.format(location=location, country=country))
    if q.status_code == 200 :
        try:
            data = json.loads(unidecode.unidecode(q.text))
        except :
            data = json.loads(q.text)
    if len(data) == 0 :
        openstreetApi = 'https://nominatim.openstreetmap.org/?format=json&addressdetails=1&limit=10&q={location}+{country}&accept-language=en-GB'
        q = requests.get(openstreetApi.format(location=location, country=country))
        if q.status_code == 200 :
            try:
                data = json.loads(unidecode.unidecode(q.text))
            except :
                data = json.loads(q.text)

    if len(data) > 0 :
        data = [d for d in data if d['importance'] >= 0.7*data[0]['importance']]
        for d in data :
            if d['type'] in {'city', 'town'} :
                d['address']['town'] = d['display_name'].split(',', 1)[0]
            if 'town' in d['address'] :
                d['address']['city'] = d['address']['town']

        for id, d1 in enumerate(data) :
            if d1['importance'] > 0 :
                db1 = np.array(d1['boundingbox'], dtype=float)
                for jd in range(id+1, len(data)) :
                    d2 = data[jd]
                    if d2['importance'] > 0 :
                        db2 = np.array(d2['boundingbox'], dtype=float)
                        s1, e1, s2, e2 = max(db1[0], db2[0]), min(db1[1], db2[1]), max(db1[2], db2[2]), min(db1[3], db2[3])
                        if ((e1-s1+1) >= 0.9*(db1[1]-db1[0]+1) or (e1-s1+1) >= 0.9*(db2[1]-db2[0]+1)) and \
                           ((e2-s2+1) >= 0.9*(db1[3]-db1[2]+1) or (e2-s2+1) >= 0.9*(db2[3]-db2[2]+1)) :
                            if (db2[1]-db2[0]+1)*(db2[3]-db2[2]+1) > (db1[1]-db1[0]+1)*(db1[3]-db1[2]+1) :
                                if 'city' in d1['address'] and (('county' in d2['address'] and d1['address']['city'] != d2['address']['county']) or ('county' not in d2['address'] and d1['address']['city'] != d2['address']['state'])) :
                                    d2['importance'] = d1['importance']
                                    data[id] = copy.deepcopy(d2)
                                    d1, db1 = data[id], np.array(data[id]['boundingbox'], dtype=float)
                            elif (db2[1]-db2[0]+1)*(db2[3]-db2[2]+1) < (db1[1]-db1[0]+1)*(db1[3]-db1[2]+1) :
                                if 'city' in d2['address'] and (('county' in d1['address'] and d2['address']['city'] == d1['address']['county']) or ('county' not in d1['address'] and d2['address']['city'] == d1['address']['state'])) :
                                    d2['importance'] = d1['importance']
                                    data[id] = copy.deepcopy(d2)
                                    d1, db1 = data[id], np.array(data[id]['boundingbox'], dtype=float)

                            d2['importance'] = -1.
        data = [d for d in data if d['importance'] >= 0.85*data[0]['importance']]

        res['Longitude'], res['Latitude'], res['confidence'] = data[0]['lon'], data[0]['lat'], str(data[0]['importance'])

        country2 = np.unique([d['address'].get('country_code', '') for d in data], return_counts=True)
        if np.max(country2[1]) > 0.5*len(data) :
            country2 = countries[countries.T[0] == country2[0][(np.argmax(country2[1]))].upper(), 3:]
            if len(country2) :
                res['Country'], res['Continient'] = unidecode.unidecode(country2[0, 0]), unidecode.unidecode(country2[0, 1])

        state = np.unique([d['address'].get('state', '') for d in data], return_counts=True)
        if np.max(state[1]) > 0.5*len(data) :
            res['admin1'] = state[0][np.argmax(state[1])]
        county = np.unique([d['address'].get('county', '') for d in data], return_counts=True)
        if np.max(county[1]) > 0.5*len(data) :
            res['admin2'] = county[0][np.argmax(county[1])]
        city = np.unique([d['address'].get('city', '') for d in data], return_counts=True)
        if np.max(city[1]) > 0.5*len(data) :
            res['City'] = city[0][np.argmax(city[1])]
    return res

def geoCoding(data) :
    countries = pd.read_csv(os.path.join(os.path.dirname(__file__), 'countries.csv'), encoding='ISO-8859-1').values
    try:
        history = np.load(os.path.join(os.path.dirname(__file__), 'geocode.npz'))
    except:
        history = {}
    
    res = []
    for d in data :
        location, country = [d, ''] if not isinstance(d, (list, tuple)) else \
            ([d[0], ''] if len(d) == 1 else d[:2])
        
        key = str(country)+' '+location
        if key in history :
            res.append( dict(history[key].tolist()) )
        else :
            r = geoCoding_openstreet('+'.join([l for l in re.split(r'[_\-,\s]+', location.lower()) if l != '']), country=country, countries=countries)
            if not isinstance(history, dict) :
                history = dict(history.items())
            history[key] = np.array(list(r.items()))
            res.append( dict(history[key].tolist()) )
    if isinstance(history, dict) :
        np.savez_compressed(os.path.join(os.path.dirname(__file__), 'geocode.npz'), **history)    
    return res

if __name__ == '__main__' :
    geoCoding(sys.argv[1:])
