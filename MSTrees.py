import numpy as np, dendropy as dp, networkx as nx
from subprocess import Popen, PIPE
import sys, os, tempfile, platform, re

params = dict(method='MSTreeV2', # MSTree , NJ
              matrix_type='symmetric',
              edge_weight = 'eBurst',
              missing_data = 'pair_delete', # complete_delete , absolute_distance , as_allele
              neighbor_branch_reconnection='F',
              NJ_Windows = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'binaries', 'fastme.exe'),
              NJ_Darwin = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'binaries', 'fastme-2.1.5-osx'),
              NJ_Linux = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'binaries', 'fastme-2.1.5-linux32'),
              edmonds_Windows = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'binaries', 'edmonds.exe'),
              edmonds_Darwin = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'binaries', 'edmonds-osx'),
              edmonds_Linux = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'binaries', 'edmonds-linux')
              )

class distance_matrix(object) :
    @staticmethod
    def asymmetric(profiles, missing_data = 'pair_delete') :
        distances = np.zeros(shape=[profiles.shape[0], profiles.shape[0]])
        presences = (profiles > 0)
        if missing_data not in ('absolute_distance', ) :
            for id, (profile, presence) in enumerate(zip(profiles, presences)) :
                diffs = np.sum(((profiles != profile) & presence), axis=1) * float(presence.size)/np.sum(presence)
                distances[:, id] = diffs
        else :
            for id, (profile, presence) in enumerate(zip(profiles, presences)) :
                diffs = np.sum((profiles != profile) & presence, axis=1)
                distances[:, id] = diffs
        return distances
    @staticmethod
    def symmetric(profiles, links=None, missing_data = 'pair_delete') :
        if missing_data in ('as_allele', ) :
            presences = np.ones(shape=profiles.shape, dtype=int)
        elif missing_data in ('pair_delete', 'absolute_distance') :
            presences = (profiles > 0)
        else :
            presences = np.repeat(np.sum(profiles >0, 0) >= profiles.shape[0], profiles.shape[0]).reshape([profiles.shape[1], profiles.shape[0]]).T

        if links is None :
            distances = np.zeros(shape=[profiles.shape[0], profiles.shape[0]])
            if missing_data in ('pair_delete',) :
                for id, (profile, presence) in enumerate(zip(profiles, presences)) :
                    comparable = (presences[:id] * presence)
                    diffs = np.sum((profiles[:id] != profile) & comparable, axis=1) * float(presence.size) / np.sum(comparable, axis=1)
                    distances[:id, id] = distances[id, :id] = diffs
            else :
                for id, (profile, presence) in enumerate(zip(profiles, presences)) :
                    diffs = np.sum((profiles[:id] != profile) & (presences[:id] * presence), axis=1)
                    distances[:id, id] = distances[id, :id] = diffs
            return distances
        else :
            return [ [ s, t, np.sum((profiles[s] != profiles[t]) & presences[s] & presences[t]) ] \
                     for s, t, d in links ]
    @staticmethod
    def harmonic(dist) :
        conn_weights = dist.shape[0] / np.sum(1.0/(dist + 0.1), 1)
        conn_weights[np.argsort(conn_weights, kind='mergesort')] = np.arange(dist.shape[0], dtype=float)/dist.shape[0]
        dist = np.round(dist, 0) + conn_weights.reshape([conn_weights.size, -1])
        np.fill_diagonal(dist, 0.0)
        return dist

    @staticmethod
    def eBurst(dist) :
        weights = np.apply_along_axis(np.bincount, 1, dist.astype(int), minlength=np.max(dist).astype(int)+1).T
        dist_order = np.concatenate([[0], np.arange(weights.shape[0]-1, 0, -1)])
        orders = np.lexsort(-weights[dist_order])
        weights = np.zeros(shape=[orders.size, orders.size])
        weights[:, orders] = (np.arange(orders.size))/float(orders.size)
        weights[weights > weights.T] = weights.T[weights > weights.T]
        dist = np.round(dist, 0) + weights
        np.fill_diagonal(dist, 0.0)
        return dist

class methods(object) :
    @staticmethod
    def _symmetric(dist, **params) :
        g = nx.Graph()
        xs, ys = np.where(dist >= 0)
        edges = [[x, y, dict(weight=dist[x][y])] for x, y in zip(xs, ys) if x < y]
        g.add_edges_from(edges)

        ms = nx.minimum_spanning_tree(g)
        return [[d[0], d[1], int(d[2]['weight'])] for d in ms.edges(data=True)]

    @staticmethod
    def _asymmetric(dist, **params) :
        mstree = Popen([params['edmonds_' + platform.system()]], stdin=PIPE, stdout=PIPE).communicate(input='\n'.join(['\t'.join([str(dd) for dd in d]) for d in dist.tolist()]))[0]
        return np.array([ br.strip().split() for br in mstree.strip().split('\n')], dtype=float).astype(int).tolist()
    @staticmethod
    def _neighbor_branch_reconnection(branches, dist, n_loci) :
        def contemporary(a,b,c) :
            a, b, c = max(min(a, n_loci-0.2), 0.2), max(min(b, n_loci-0.2), 0.2), max(min(c, n_loci-0.2), 0.2)
            if b >= a + c :
                return False
            elif b == c :
                return True
            s11, s12 = np.sqrt(1-a/n_loci), (2*n_loci - b - c)/2/np.sqrt(n_loci*(n_loci-a))
            v = 1-((n_loci-a)*(n_loci-c)/n_loci+(n_loci-b))/2/n_loci
            s21, s22 = 1+a*v/(b-2*n_loci*v), 1+c*v/(b-2*n_loci*v)

            p1 = a*np.log(1-s11*s11) + (n_loci-a)*np.log(s11*s11) + (b+c)*np.log(1-s11*s12) + (2*n_loci-b-c)*np.log(s11*s12)
            p2 = a*np.log(1-s21) + (n_loci-a)*np.log(s21) + b*np.log(1-s21*s22) + (n_loci-b)*np.log(s21*s22) + c*np.log(1-s22) + (n_loci-c)*np.log(s22)
            return p1 >= p2

        if n_loci is None :
            n_loci = np.max(dist)
        weights = dist.shape[0] / np.sum(1.0/(dist + 0.1), 1)
        weights[np.argsort(weights, kind='mergesort')] = np.arange(1, dist.shape[0]+1, dtype=float)/dist.shape[0]-1

        group_id, groups, childrens = {b:b for br in branches for b in br[:2]}, \
            {b:[b] for br in branches for b in br[:2]}, \
            {b:[] for br in branches for b in br[:2]}
        branches = sorted(branches, key=lambda br:[dist[br[0], br[1]]] + sorted([weights[br[0]], weights[br[1]]]))
        i = 0
        while i < len(branches) :
            src, tgt, brlen = branches[i]
            sources, targets = groups[group_id[src]], groups[group_id[tgt]]
            tried = {}
            if len(sources) > 1 :
                for w, d, s in sorted(zip(weights[sources], dist[sources, tgt], sources))[:3] :
                    if s == src : break
                    if d < 2*dist[src, tgt] :
                        if contemporary(dist[s, src], d, dist[src, tgt]) :
                            tried[src], src = s, s
                            break
                while src not in tried :
                    tried[src] = src
                    mid_nodes = sorted([[weights[s], dist[s,tgt], s] for s in childrens[src] if s not in tried and dist[s,tgt] < 2*dist[src, tgt]])
                    for w, d, s in mid_nodes :
                        if d < dist[src, tgt] :
                            if not contemporary(dist[src, s], dist[src, tgt], d) :
                                tried[src], src = s, s
                                break
                        elif w < weights[src] :
                            if contemporary(dist[s, src], d, dist[src, tgt]) :
                                tried[src], src = s, s
                                break
                        tried[s] = src
            if len(targets) > 1 :
                for w, d, t in sorted(zip(weights[targets], dist[src, targets], targets))[:3] :
                    if t == tgt : break
                    if d < 2*dist[src, tgt] :
                        if contemporary(dist[t, tgt], d, dist[src, tgt]) :
                            tried[tgt], tgt = t, t
                            break
                while tgt not in tried :
                    tried[tgt] = tgt
                    mid_nodes = sorted([[weights[t], dist[src,t], t] for t in childrens[tgt] if t not in tried and dist[src, t] < 2*dist[src, tgt]])
                    for w, d, s in mid_nodes :
                        if d < dist[src, tgt] :
                            if not contemporary(dist[tgt, t], dist[src, tgt], d) :
                                tried[tgt], tgt = t, t
                                break
                        elif w < weights[tgt] :
                            if contemporary(dist[t, tgt], d, dist[src, tgt]) :
                                tried[tgt], tgt = t, t
                                break
                        tried[t] = tgt
            brlen = dist[src, tgt]
            branches[i] = [src, tgt, brlen]
            if i >= len(branches) - 1 or branches[i+1][2] >= brlen:
                tid = group_id[tgt]
                for t in targets :
                    group_id[t] = group_id[src]
                groups[group_id[src]].extend(groups.pop(tid, []))
                childrens[src].append(tgt)
                childrens[tgt].append(src)
                i += 1
            else :
                branches[i:] = sorted(branches[i:], key=lambda br:br[2])
        return branches

    @staticmethod
    def _network2tree(branches, names) :
        branches.sort(key=lambda x:x[2], reverse=True)
        branch = []
        in_use = {branches[0][0]:1}
        while len(branches) :
            remain = []
            for br in branches :
                if br[0] in in_use :
                    branch.append(br)
                    in_use[br[1]] = 1
                elif br[1] in in_use :
                    branch.append([br[1], br[0], br[2]])
                    in_use[br[0]] = 1
                else :
                    remain.append(br)
            branches = remain

        tre = dp.Tree()
        node = tre.seed_node
        node.taxon = tre.taxon_namespace.new_taxon(label=branch[0][0])
        for src, tgt, dif in branch :
            node = tre.find_node_with_taxon_label(src)
            n = dp.Node(taxon=node.taxon)
            node.add_child(n)
            n.edge_length = 0.0
            node.__dict__['taxon'] = None

            n = dp.Node(taxon=tre.taxon_namespace.new_taxon(label=tgt))
            node.add_child(n)
            n.edge_length = dif
        for taxon in tre.taxon_namespace :
            taxon.label = names[taxon.label]
        return tre

    @staticmethod
    def MSTree(names, profiles, matrix_type='asymmetric', edge_weight='harmonic', neighbor_branch_reconnection='T', missing_data='pair_delete', **params) :

        dist = eval('distance_matrix.'+matrix_type)(profiles, missing_data = missing_data)
        wdist = eval('distance_matrix.'+edge_weight)(dist)

        tree = eval('methods._'+matrix_type)(wdist, **params)
        if neighbor_branch_reconnection != 'F' :
            tree = methods._neighbor_branch_reconnection(tree, dist, profiles.shape[1])
        tree = distance_matrix.symmetric(profiles, tree, missing_data= missing_data)
        tree = methods._network2tree(tree, names)
        return tree

    @staticmethod
    def NJ(names, profiles, missing_data='pair_delete', **params) :
        dist = distance_matrix.symmetric(profiles, missing_data = missing_data)
        dist_txt = ['    {0}'.format(dist.shape[0])]
        for n, d in enumerate(dist) :
            dist_txt.append('{0!s:10} {1}'.format(n, ' '.join(['{:.6f}'.format(dd) for dd in d])))

        #write profile
        fin = tempfile.NamedTemporaryFile(delete=False)
        fin.write('\n'.join(dist_txt))
        fin.close()
        Popen('{0} -i {1} -m B'.format(params['NJ_{0}'.format(platform.system())], fin.name).split(), stdout=PIPE).communicate()
        tree = dp.Tree.get_from_path(fin.name + '_fastme_tree.nwk', schema='newick')
        from glob import glob
        for fname in glob(fin.name + '*') :
            os.unlink(fname)
        for taxon in tree.taxon_namespace :
            taxon.label = names[int(taxon.label)]
        return tree

def nonredundant(names, profiles) :
    encoded_profile = np.array([np.unique(p, return_inverse=True)[1]+1 for p in profiles.T]).T
    encoded_profile[(profiles == '-') | (profiles == '0')] = 0

    names = names[np.lexsort(encoded_profile.T)]
    profiles = encoded_profile[np.lexsort(encoded_profile.T)]
    uniqueness = np.concatenate([[1], np.sum(np.diff(profiles, axis=0) != 0, 1) > 0])

    embeded = {names[0]:[]}
    embeded_group = embeded[names[0]]
    for n, u in zip(names, uniqueness) :
        if u == 0 :
            embeded_group.append(n)
        else :
            embeded[n] = [n];
            embeded_group = embeded[n];
    names = names[uniqueness>0]
    profiles = profiles[uniqueness>0]
    return names, profiles, embeded

def backend(**parameters) :
    '''
    paramters :
        profile: input file or the content of the file as a string. Can be either profile or fasta. Headings start with an '#' will be ignored.
        method: MSTreeV2, MSTree or NJ
        matrix_type: asymmetric or symmetric
        edge_weight: harmonic or eBurst
        neighbor_branch_reconnection: T or F

    Outputs :
        A string of a NEWICK tree

    Examples :
        To run MSTreeV2, use :
        backend(profile=<filename>, method='MSTreeV2')

        OR simply
        backend(profile=<filename>)

        To run a standard minimum spanning tree :
        backend(profile=<filename>, method='MSTree')

        To run a NJ tree (using FastME 2.0) :
        backend(profile=<filename>, method='NJ')

    Can also be called in command line:
        MSTreeV2: MSTrees.py profile=<filename> method=MSTreeV2
        MSTree: MSTrees.py profile=<filename> method=MSTree
        NJ:  MSTrees.py profile=<filename> method=NJ
    '''
    params.update(parameters)
    if params['method'] == 'MSTreeV2' :
        params.update(dict(
            method = 'MSTree',
            matrix_type = 'asymmetric',
            edge_weight = 'harmonic',
            neighbor_branch_reconnection = 'T'
        ))

    names, profiles = [], []
    fin = open(params['profile']).readlines() if os.path.isfile(params['profile']) else params['profile'].split('\n')

    for line_id, line in enumerate(fin) :
        if line.startswith('#') :
            continue
        fmt = 'fasta' if line.startswith('>') else 'profile'
        break

    if fmt == 'fasta' :
        for line in fin[line_id:] :
            if line.startswith('>') :
                names.append(line.strip().split()[0])
                profiles.append([])
            else :
                profiles[-1].extend(line.strip().split())
        for id, p in enumerate(profiles) :
            profiles[id] = list(''.join(p))
    else :
        for line in fin[line_id:] :
            part = line.strip().split('\t')
            if not part[0]:
                continue
            names.append(part[0])
            profiles.append(part[1:])

    names = [re.sub(r'[\(\)\ \,\"\';]', '_', n) for n in names]
    names, profiles, embeded = nonredundant(np.array(names), np.array(profiles))
    tre = eval('methods.' + params['method'])(names, profiles, **params)

    for taxon in tre.taxon_namespace :
        embeded_group = embeded[taxon.label]
        if len(embeded) > 1 :
            taxon.label = '({0}:0)'.format(':0,'.join(embeded_group))

    return tre.as_string('newick').replace("'", "")

if __name__ == '__main__' :
    tre = backend(**dict([p.split('=') for p in sys.argv[1:]]))
    print tre
