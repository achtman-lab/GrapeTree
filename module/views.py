from flask import render_template, request, make_response
from . import app
import numpy as np
from MSTrees import methods, backend
import traceback, json
import dendropy as dp

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

