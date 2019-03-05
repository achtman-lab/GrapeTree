from flask import render_template, request, make_response
from . import app
import numpy as np
from .MSTrees import methods, backend
from .geocode import geoCoding
from ete3 import Tree

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
def sendToMicroReact() :
    try:
        params = app.config.get('PARAMS')
        params.update(dict(request.form))

        from ete3 import Tree
        tree, metadata, colors = params['tree'], params['metadata'], params['colors']

        names = []
        for strain in metadata :
            names.append(strain.ID)
            if strain['longitude'] == '' or strain['latitude'] == '' :
                address = ' '.join([f for f in [strain['Continient'], strains['Country'], strains['admin1'], strains['admin2'], strains['City']] if f != ''])
                geocode = geoCoding(address)
                strain['longitude'], strain['latitude'] = geocode['longitude'], geocode['latitude']
            for fld, categories in colors.items() :
                strain[fld+'__color'] = categories.get(strain[fld], '#FFFFFF')
        tree = Tree(newick=tree, format=9)
        names = set(names)
        for node in tree.traverse(strategy="postorder") :
            if node.is_leaf() :
                if node.name not in names :
                    node.delete()
            elif len(node.children()) < 2 :
                if node.up is not None :
                    c = node.children()[0]
                    c.up = node.up
                    node.up.addChildren(c)
                node.delete()
        return metadata

    except Exception as e:
        return make_response(str(e), 500)

