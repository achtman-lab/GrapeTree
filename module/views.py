import numpy as np, json, pandas as pd, re, requests, tempfile, os
from ete3 import Tree
from flask import render_template, request, make_response
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO

from . import app
from .MSTrees import methods, backend
from .geocode import geoCoding



@app.route("/")
def index():
    return render_template('MSTree_holder.html', version=app.config.get('VERSION'))


@app.route("/maketree", methods=['POST'])
def generate_tree():
    try:
        params = app.config.get('PARAMS')
        params.update(dict(request.form))
        if 'profile' not in params :
            return make_response('', 204)
        for param in params:
            if isinstance(params[param], list):
                params[param] = params[param][0]
        tree = backend(profile= params['profile'],
                        method=params['method'],
                        checkEnv = params['checkEnv'],
                        )
        return make_response(tree, 200)

    except Exception as e:
        return make_response(str(e), 500)



@app.route("/sendToMicroReact", methods=['POST'])
def sendToMicroReact(debug=None) :
    def reviseField(df, regex, fld, default='') :
        columns = list(filter(lambda c: c.find('__') < 0, df.columns))
        field = list(filter(lambda c: re.search(regex, c.lower()), columns))
        if len(field) == 0 :
            df[fld] = default
        elif fld not in field :
            df = df.rename(index=str, columns={field[0]:fld} )
        return df
    try:
        if debug :
            import pickle
            tree, metaString, colors = pickle.load(open(debug, 'rb'))
        else :
            params = dict(request.form)
            tree, metaString, colors, name = params['tree'][0], params['metadata'][0], json.loads(params['colors'][0]), params['name'][0]

        metadata = pd.read_csv(StringIO(metaString), sep='\t', header=[0], dtype=str, na_filter=False)
        for fld, categories in colors.items() :
            if not fld.endswith('__color') :
                metadata[fld+'__color'] = metadata[fld].astype(str).map(lambda v: categories.get(v, '#FFFFFF'))

        metadata = metadata.rename(index=str, columns={'ID':'id'} )
        names = metadata['id'].values.astype(str)


        metadata = reviseField(metadata, r'latitude|^lat$', 'latitude', '')
        metadata = reviseField(metadata, r'longitude|^lon$', 'longitude', '')
        metadata = reviseField(metadata, r'year', 'year', '1')
        metadata = reviseField(metadata, r'month', 'month', '1')
        metadata = reviseField(metadata, r'day', 'day', '1')

        #metadata[['latitude', 'longitude']] = metadata[['latitude', 'longitude']].astype(np.float64)
        for c in ('year', 'month', 'day') :
            d = metadata[c].values
            sites = metadata[c].str.extract(r'(-*\d+)').astype(float).values.flatten()
            sites[np.isnan(sites)] = -1
            d[sites < 0] = ''
            metadata[c] = d

        columns = list(filter(lambda c: c.find('__') < 0, metadata.columns))
        geo_columns = list(filter(lambda c: re.match(r'village|town|city|locat|state|region|district|^site$|geograph', c.lower()), columns))
        country_column = list(filter(lambda c: re.match(r'country', c.lower()), columns))
        if len(geo_columns) or len(country_column) :
            toRun = []
            for index, strain in metadata.iterrows() :
                if np.any(strain[['latitude', 'longitude']] == '') :
                    address = ' '.join(strain[geo_columns].values[strain[geo_columns] != ''])
                    country = '' if len(country_column) <=0 else strain[country_column][0]
                    if len(address) or len(country) :
                        toRun.append([address, country, index])
            results = geoCoding(toRun)
            for (_, _, index), geocode in zip(toRun, results) :
                if geocode['Longitude'] :
                    metadata.at[index, 'longitude'], metadata.at[index, 'latitude'] = geocode['Longitude'], geocode['Latitude']

        column_ids = {c.lower():id for id, c in reversed(list(enumerate(metadata.columns)))}
        metadata = metadata[metadata.columns[sorted(column_ids.values())]]
        metaString = metadata.to_csv()
        
        f = tempfile.NamedTemporaryFile(dir='.', prefix='geocoding', delete=False)
        f.close()
        with open(f.name, 'w') as fout :
            fout.write(tree)
        
        try :
            tree = Tree(newick=f.name, format=0)
        except :
            tree = Tree(newick=f.name, format=1)
        finally:
            os.unlink(f.name)
        names = set(names)
        for node in tree.traverse(strategy="postorder") :
            if node.is_leaf() :
                if node.name not in names :
                    node.up.remove_child(node)
                    node.up = None
                    node.delete()
            elif len(node.children) < 2 :
                p, c = node.up, node.children[0]
                c.up = p
                if p is not None :
                    p.remove_child(node)
                    p.add_child(c)
                    node.up = None
                else :
                    tree = c
                node.delete()
        tree = tree.write(format=0)
        q = requests.post('https://microreact.org/api/project/', json=dict(tree=tree, data=metaString, name=name))
        return make_response(json.loads(q.text)['url'], 200)

    except Exception as e:
        return make_response(str(e), 500)

if __name__ == '__main__' :
    sendToMicroReact('debug')