import numpy as np, dendropy as dp, networkx as nx
from subprocess import Popen, PIPE
import sys, os, tempfile

params = dict(method='MST',
              matrix_type='asymmetric', 
              edge_weight = 'harmonic', 
              neighbor_branch_reconnection='T',
              ninja = 'ninja')


class distance_matrix(object) :
    @staticmethod
    def asymmetric(profiles, normalize=True) :
        distances = np.zeros(shape=[profiles.shape[0], profiles.shape[0]])
        presences = profiles > 0
        if normalize is True :
            for id, (profile, presence) in enumerate(zip(profiles, presences)) :
                diffs = np.sum(((profiles != profile) & presence), axis=1) * float(presence.size)/np.sum(presence)
                distances[:, id] = diffs
        else :
            for id, (profile, presence) in enumerate(zip(profiles, presences)) :
                diffs = np.sum((profiles != profile) & presence, axis=1)
                distances[:, id] = diffs
        return distances
    @staticmethod
    def symmetric(profiles, links=None, normalize=True, count_absence=0) :
        presences = np.ones(shape=profiles.shape) if count_absence else (profiles > 0)
        if links is None :
            distances = np.zeros(shape=[profiles.shape[0], profiles.shape[0]])
            if normalize is True :
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
            if normalize is True :
                return [ [ s, t, np.sum((profiles[s] != profiles[t]) & presences[s] & presences[t]) * normalize(presences.shape[1]) / np.sum(presences[s] & presences[t]) ] \
                         for s, t, d in links ]
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
        weights = np.apply_along_axis(np.bincount, 1, dist.astype(int), minlength=max(dist).astype(int))
        orders = np.lexsort(weights)
        weights = np.zeros(shape=[orders.size, orders.size])
        weights[orders, :] = (np.arange(orders.size))/float(orders.size)
        weights[weights < weights.T] = weights.T[weights < weights.T]
        dist = np.round(dist, 0) + weights
        np.fill_diagonal(dist, 0.0)
        return dist

class methods(object) :
    @staticmethod
    def _symmetric(dist) :
        g = nx.Graph()
        xs, ys = np.where(dist >= 0)
        edges = [[x, y, dict(weight=dist[x][y])] for x, y in zip(xs, ys) if x < y]
        g.add_edges_from(edges)
    
        ms = nx.minimum_spanning_tree(g)
        return [[d[0], d[1], int(d[2]['weight'])] for d in ms.edges(data=True)]
    
    @staticmethod
    def _asymmetric(dist) :
        mstree = Popen([os.path.join(os.path.dirname(os.path.realpath(__file__)), 'edmonds')], stdin=PIPE, stdout=PIPE).communicate(input='\n'.join(['\t'.join([str(dd) for dd in d]) for d in dist.tolist()]))[0]
        return [ [int(s), int(t), float(l)] for br in mstree.strip().split() for s,t,l in br.split('\t')]
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
        
            p1 = 2*a*np.log(s11) + (n_loci-a)*np.log(1-s11*s11) + (b+c)*np.log(s11*s12) + (2*n_loci-b-c)*np.log(1-s11*s12)
            p2 = a*np.log(s21) + (n_loci-a)*np.log(1-s21) + b*np.log(s21*s22) + (n_loci-b)*np.log(1-s21*s22) + c*np.log(s22) + (n_loci-c)*np.log(1-s22)
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
                weights[src] -= 1
                weights[tgt] -= 1
                i += 1
            else :
                branches[i:] = sorted(branches[i:], key=lambda br:br[2])
        return branches
    
    @staticmethod
    def _network2tree(branches) :
        tre = dp.Tree()
        node = tre.seed_node
        node.taxon = tre.taxon_namespace.new_taxon(label=branches[0][0])
        node_label = {branches[0][0]:branches[0][0]}
        for src, tgt, dif in branches :
            if src != node.taxon.label :
                node = tre.find_node_with_taxon_label(node_label[src])
            node_label[tgt] = tgt
            n = dp.Node(taxon=tre.taxon_namespace.new_taxon(label=tgt))
            node.add_child(n)
            n.edge_length = dif
        for taxon in tre.taxon_namespace :
            taxon.label = names[taxon.label]
        return tre

    @staticmethod
    def MST(names, profiles, matrix_type='asymmetric', edge_weight='harmonic', neighbor_branch_reconnection='T', **params) :
        dist = eval('distance_matrix.'+matrix_type)(profiles)
        wdist = eval('distance_matrix.'+edge_weight)(dist)
        
        tree = eval('methods._'+matrix_type)(wdist)
        if neighbor_branch_reconnection != 'F' :
            tree = methods._neighbor_branch_reconnection(tree, dist, profiles.shape[1])
        tree = distance_matrix.symmetric(profiles, tree, normalize=False)
        return tree

    @staticmethod
    def ninja(names, profiles, **params) :
        dist = distance_matrix.symmetric(profiles)
        dist_txt = ['    {0}'.format(dist.shape[0])]
        for n, d in enumerate(dist) :
            dist_txt.append('{0!s:10} {1}'.format(n, ' '.join(['{:.6f}'.format(dd) for dd in d])))
        
        #write profile
        fin = tempfile.NamedTemporaryFile(delete=False)
        fin.write('\n'.join(dist_txt))
        fin.close()
        tree = Popen('{ninja} --in_type d {0}'.format(fin.name, **params).split(), stdout=PIPE).communicate()[0]
        fin.unlink()
        return tree

if __name__ == '__main__' :
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
    
    print tre.as_string('newick')
