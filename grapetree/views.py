from flask import render_template, request, make_response
from . import app
import numpy as np 
from MSTrees import methods, nonredundent
import traceback
import dendropy as dp 

@app.route("/")
def index():
    return render_template('MSTree_launch.html', version=app.config.get('VERSION'))


@app.route("/maketree", methods=['POST'])
def generate_tree():
    params = app.config.get('PARAMS')
    # method: PSA, eBurst, ninja
    params.update(dict(request.form))
    # Handle any lists
    for param in params:
        if isinstance(params[param], list):
            params[param] = params[param][0]
    names = []
    profiles = []
    profile_list = params['profile'].split('\n')
    head = profile_list[0]
    if head.startswith('>'):
        names.append(head[1:].strip().split()[0])
        profiles.append([])
        for line in profile_list :
            if line.startswith('>') :
                names.append(line.strip().split()[0])
                profiles.append([])
            else :
                profiles[-1].extend(line.strip().split())
        for id, p in enumerate(profiles) :
            profiles[id] = list(''.join(p))
    else:
        for line in profile_list:
            part = line.strip().split()
            if len(part) > 0:
                names.append(part[0])
                profiles.append(part[1:])
    try:
        names, profiles, embeded = nonredundent(np.array(names), np.array(profiles))
        tre = eval('methods.' + params['method'])(names, profiles, **params)
    except Exception as e:
        return make_response(str(e), 500)
    
    for src, tgt in embeded :
        node = tre.find_node_with_taxon_label(src)
        n = dp.Node(taxon=node.taxon)
        node.add_child(n)
        n.edge_length = 0.0
        node.__dict__['taxon'] = None
        
        n = dp.Node(taxon=tre.taxon_namespace.new_taxon(label=tgt))
        node.add_child(n)
        n.edge_length = 0.0
    return make_response(tre.as_string('newick'), 200)
