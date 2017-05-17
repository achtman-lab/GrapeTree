from flask import render_template, request, make_response
from . import app
import numpy as np 
from MSTrees import methods

@app.route("/")
def index():
    return render_template('index.html', version=app.config.get('VERSION'))

@app.route("/mstree")
def mst_tree():
    return render_template('MSTree_launch.html')

@app.route("/maketree")
def generate_tree():
    params = app.config.get('PARAMS')
    # method: PSA, eBurst, ninja
    params.update(dict([p.split('=') for p in sys.argv[1:]]))

    names = []
    profiles = []
    with open(params['profile']) as fin :
        head = fin.readline()
        if head.startswith('>') :
            names.append(head[1:].strip().split()[0])
            profiles.append([])
            for line in fin :
                if line.startswith('>') :
                    names.append(line.strip().split()[0])
                    profiles.append([])
                else :
                    profiles[-1].extend(line.strip().split())
            for id, p in enumerate(profiles) :
                profiles[id] = list(''.join(p))
        else :
            for line in fin :
                part = line.strip().split()
                names.append(part[0])
                profiles.append(part[1:])
    profiles = np.array(profiles)
    encoded_profile = np.array([np.unique(p, return_inverse=True)[1]+1 for p in profiles.T]).T
    encoded_profile[(profiles == 'T') | (profiles == '0')] = 0

    tre = eval('methods.' + params['method'])(names, encoded_profile, **params)
    
    return make_response(tre.as_string('newick'), 200)
