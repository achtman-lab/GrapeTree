import numpy as np, dendropy as dp, scipy as sp
from subprocess import Popen, PIPE
import sys, os

class distance_matrix(object) :
    @staticmethod
    def asymmetric(profiles, normalize=True) :
        distances = np.zeros(shape=[profiles.shape[0], profiles.shape[0]])
        presences = profiles > 0
        if normalize is not True :
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
            if normalize is not True :
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
            if normalize is not None :
                return [ [s, t, np.sum((profiles[s] != profiles[t]) & presences[s] & presences[t]) * normalize(presences.shape[1]) / np.sum(presences[s] & presences[t]), np.sum(presences[s] & presences[t])] \
                         for s, t, d in links ]
            else :
                return [ [s, t, np.sum((profiles[s] != profiles[t]) & presences[s] & presences[t]), np.sum(presences[s] & presences[t])] \
                         for s, t, d in links ]
    @staticmethod
    def harmonic_weight(dist) :
        conn_weights = dist.shape[0] / np.sum(1.0/(dist + 0.1), 1)
        conn_weights[np.argsort(conn_weights)] = np.arange(dist.shape[0])/float(dist.shape[0])
        dist = np.round(dist, 0) + conn_weights.reshape([conn_weights.size, -1])
        np.fill_diagonal(dist, 0.0)
        return dist
        
    @staticmethod
    def eBurst_weight(dist) :
        weights = np.apply_along_axis(np.bincount, 1, dist.astype(int), minlength=max(dist).astype(int))
        orders = np.lexsort(weights)
        weights = np.zeros(shape=[orders.size, orders.size])
        weights[orders, :] = (np.arange(orders.size))/float(orders.size)
        weights[weights < weights.T] = weights.T[weights < weights.T]
        dist = np.round(dist, 0) + weights
        np.fill_diagonal(dist, 0.0)
        return dist


def NBTR(branches, dist, n_loci=None) :
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
    w = dist.shape[0] / np.sum(1.0/(dist + 0.1), 1)
    weights = np.zeros(shape=[w.size, 2])
    weights[:, 1][np.argsort(w)] = np.arange(w.size)
    weights = weights.tolist()
    
    root = branches[0][0]
    group_id, groups = {b:b for br in branches for b in br[:2]}, {b:[b] for br in branches for b in br[:2]}
    childrens = {b:[] for br in branches for b in br[:2]}
    branches.sort(key=lambda br:[br[2]] + sorted([weights[br[0]][1], weights[br[1]][1]]))
    i = 0
    while i < len(branches) :
        src, tgt, brlen = branches[i]
        brlen=float(brlen)
        sources, targets = groups[group_id[src]], groups[group_id[tgt]]
        tried = {}
        if len(sources) > 1 and weights[src] > min([weights[s] for s in sources]):
            for w, d, s in sorted(zip([weights[s] for s in sources], dist[sources,tgt], sources))[:3] :
                if d >= 2*brlen :
                    continue
                if s != src :
                    a, b, c = dist[s, src], dist[s, tgt], dist[src, tgt]
                    if contemporary(a,b,c) :
                        tried[src] = 1
                        src = s
                        break
                else :
                    break
            moved = 1
            while moved :
                moved = 0
                mid_nodes = sorted([[weights[s], dist[s,tgt], s] for s in childrens[src] if weights[s] > weights[src] and dist[s, tgt] < dist[src, tgt] and s not in tried])
                for w, d, s in mid_nodes :
                    if d >= 2*brlen :
                        continue                    
                    a, b, c = dist[src, s], dist[src, tgt], dist[s, tgt]
                    if not contemporary(a,b,c) :
                        tried[src] = 1
                        src, move = s, 1
                        break
                    else :
                        tried[s] = 1
        if len(targets) > 1 and weights[tgt] > min([weights[t] for t in targets]):
            for w, d, t in sorted(zip([weights[t] for t in targets], dist[src,targets], targets))[:3] :
                if d >= 2*brlen :
                    continue
                if t != tgt :
                    a, b, c = dist[t, tgt], dist[src, t], dist[src, tgt]
                    if contemporary(a,b,c) :
                        tried[tgt] = 1
                        tgt = t
                        break
                else :
                    break
            moved = 1
            while moved :
                moved = 0
                mid_nodes = sorted([[weights[t], dist[src,t], t] for t in childrens[tgt] if weights[t] > weights[tgt] and dist[src, t] < dist[src, tgt] and t not in tried])
                for w, d, t in mid_nodes :
                    if d >= 2*brlen :
                        continue                    
                    a, b, c = dist[tgt, t], dist[src, tgt], dist[src, t]
                    if not contemporary(a,b,c) :
                        tried[tgt] = 1
                        tgt, move = t, 1
                        break
                    else :
                        tried[t] = 1
        brlen = dist[src, tgt]
        branches[i] = [src, tgt, brlen]
        if i >= len(branches) - 1 or branches[i+1][2] >= brlen:
            tid = group_id[tgt]
            for t in targets :
                group_id[t] = group_id[src]
            groups[group_id[src]].extend(groups.pop(tid, []))
            childrens[src].append(tgt)
            childrens[tgt].append(src)
            weights[src][0] -= 1
            weights[tgt][0] -= 1
            i += 1
        else :
            branches[i:] = sorted(branches[i:], key=lambda br:br[2])
    return branches

def profile2cMST(sts, profiles, mode='asym', ignore_cBurst=False) :
    dist = asymmetric_dist(profiles) if mode=='asym' else symmetric_dist(profiles, normalize=int)
    branches = DMSTree( dist )
    # correction
    if not ignore_cBurst :
        branches = cBurst(branches, dist, profiles.shape[1])
    
    # remeasure branch lengths
    branches = symmetric_dist(profiles, branches, normalize=None)

    # reroot
    root = max(branches, key=lambda x:x[2])[0]
    new_branches, to_move = [], {root:1}
    while len(branches) :
        for id in xrange(len(branches)-1, -1, -1) :
            if branches[id][0] in to_move :
                br = branches.pop(id)
                to_move[br[1]] = 1
                new_branches.append(br)
            elif branches[id][1] in to_move :
                br = branches.pop(id)
                br = [br[1], br[0]] + br[2:]
                to_move[br[1]] = 1
                new_branches.append(br)
    branches = new_branches

    tre = dp.Tree()
    node = tre.seed_node
    node.taxon = tre.taxon_namespace.new_taxon(label=branches[0][0])
    node.annotations.add_new(name='taxa', value=[sts[branches[0][0]]])
    node_label = {branches[0][0]:branches[0][0]}
    for src, tgt, dif, tot in branches :
        if src != node.taxon.label :
            node = tre.find_node_with_taxon_label(node_label[src])
        if dif > 0 :
            node_label[tgt] = tgt
            n = dp.Node(taxon=tre.taxon_namespace.new_taxon(label=tgt))
            n.annotations.add_new(name='shared_loci', value=tot)
            n.annotations.add_new(name='taxa', value=[sts[tgt]])
            node.add_child(n)
            n.edge_length = dif
        else :
            node_label[tgt] = node.taxon.label
            node.annotations.add_new(name='taxa', \
                                  value=node.annotations.drop(name='taxa').get_value('taxa') + [sts[tgt]])
    for taxon in tre.taxon_namespace :
        taxon.label = sts[taxon.label]
    return tre


def dist2cMST(sts, dist, n_loci=None, mode='asym', ignore_cBurst=False) :
    if n_loci is None :
        if np.max(dist) > 1 :
            n_loci = np.max(dist)
        else :
            n_loci = int( 1/np.min(dist[dist > 0]) + 0.5 )
            dist = dist * n_loci

    branches = DMSTree( dist )
    # correction
    if not ignore_cBurst :
        branches = cBurst(branches, dist*n_loci, n_loci)

    # reroot
    root = max(branches, key=lambda x:x[2])[0]
    new_branches, to_move = [], {root:1}
    while len(branches) :
        for id in xrange(len(branches)-1, -1, -1) :
            if branches[id][0] in to_move :
                br = branches.pop(id)
                to_move[br[1]] = 1
                new_branches.append(br)
            elif branches[id][1] in to_move :
                br = branches.pop(id)
                br = [br[1], br[0]] + br[2:]
                to_move[br[1]] = 1
                new_branches.append(br)
    branches = new_branches

    tre = dp.Tree()
    node = tre.seed_node
    node.taxon = tre.taxon_namespace.new_taxon(label=branches[0][0])
    node.annotations.add_new(name='taxa', value=[sts[branches[0][0]]])
    node_label = {branches[0][0]:branches[0][0]}
    for src, tgt, dif in branches :
        if src != node.taxon.label :
            node = tre.find_node_with_taxon_label(node_label[src])
        if dif > 0 :
            node_label[tgt] = tgt
            n = dp.Node(taxon=tre.taxon_namespace.new_taxon(label=tgt))
            n.annotations.add_new(name='taxa', value=[sts[tgt]])
            node.add_child(n)
            n.edge_length = dif
        else :
            node_label[tgt] = node.taxon.label
            node.annotations.add_new(name='taxa', \
                                  value=node.annotations.drop(name='taxa').get_value('taxa') + [sts[tgt]])
    for taxon in tre.taxon_namespace :
        taxon.label = str(sts[taxon.label])
    return tre


def profile2gMST(sts, profiles, mode='sym', executable='/home/zhemin/CRobot/pipelines/DMSTree_ext/fastme-2.1.5/binaries/fastme-2.1.5-linux64-omp', dist_matrix='distance.list') :
    def run_fastme(sts, distances, executable, dist_matrix) :
        with open(dist_matrix, 'w') as fout :
            fout.write('    {0}\n'.format(len(sts)))
            for st_id, distance in zip(sts, distances) :
                fout.write('\t'.join([str(st_id)] + [str(d) for d in distance]) + '\n')
        
        cmd = '{0} -i {1} -o {1}.nwk -T 1 -m B -n B'
        Popen(cmd.format(executable, dist_matrix).split(), stdout=PIPE, stderr=PIPE).communicate()
        return '{0}.nwk'.format(dist_matrix)
    dist = symmetric_dist(profiles) if mode == 'sym' else asymmetric_dist(profiles, normalize=float)
    nwk_file = run_fastme(sts, dist, executable, dist_matrix)
    tre = nwk2gMST(nwk_file, tips=sts, tip_profile=profiles)
    for fname in (dist_matrix, dist_matrix + '.nwk', dist_matrix + '_fastme_stat.txt') :
        os.unlink(fname)
    return tre


def nwk2gMST(tree, schema='newick', force_collapse=0.3, non_empty_collapse=20000, tips=None, tip_profile=None) :
    def find_founder(profiles, br_lens) :
        founder = np.argmin(np.sum(profiles <= 0, 1) + np.array(br_lens))
        dist = np.sum(((profiles[founder] != profiles) & ((profiles > 0) *(profiles[founder] > 0))), 1)
        return dist, founder
    tre = dp.Tree.get_from_path(tree, schema)
    proper_midroot(tre)
    for node in tre.preorder_node_iter() :
        node.annotations.add_new(name='taxa', value=[node.taxon.label] if node.is_leaf() else [])
    nodes = { node:node.edge_length for node in tre.preorder_node_iter(filter_fn=lambda node:(node.edge_length < force_collapse)&(node.edge_length is not None)) }
    while len(nodes) > 0 :
        node, dist = min(nodes.items(), key=lambda x:x[1])
        if dist > force_collapse :
            break
        if dist > 0 :
            for n in node.sibling_nodes() + [node.parent_node] :
                if n.edge_length > 0 :
                    n.edge_length += dist
                    if n in nodes :
                        nodes[n] = n.edge_length
        
        if node.is_internal() :
            for n in node.child_nodes() :
                node.parent_node.add_child(n)
            node.parent_node.remove_child(node)
        else :
            node.edge_length = 0.0
        del nodes[node]
    
    tip_ids = {tip:id for id, tip in enumerate(tips)}
    for node in tre.postorder_internal_node_iter() :
        if tip_profile is None :
            l, n = min([ [c.edge_length, c] for c in node.child_nodes() ])
            if l <= non_empty_collapse :
                n.edge_length = 0.0
                node.taxon = n.taxon                
                for c in n.sibling_nodes() :
                    c.edge_length += l
        else :
            dists, n = find_founder(tip_profile[[tip_ids[c.taxon.label] for c in node.child_nodes()], :], [c.edge_length for c in node.child_nodes()])
            n = node.child_nodes()[n]
            if node.edge_length is not None :
                node.edge_length += n.edge_length
            node.taxon = n.taxon            
            for d, c in zip(dists, node.child_nodes()) :
                c.edge_length = d
        node.annotations.add_new('taxa', node.annotations.drop(name='taxa').get_value('taxa', []) + \
                                 [ t for c in node.child_node_iter(lambda x:x.edge_length == 0.0) for t in c.annotations.get_value('taxa', []) ])
        for c in list(node.child_node_iter(lambda x:x.edge_length == 0.0)) :
            for cc in c.child_nodes() :
                node.add_child(cc)
            node.remove_child(c)
    return tre



def network2tree(names, branches) :
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
    

class methods(object) :
    def MSA(names, profiles) :
        dist = distance_matrix.asymmetric(profiles)
        dist = distance_matrix.harmonic_weight(dist)
        
    def PSA(names, profiles) :
        dist = distance_matrix.asymmetric(profiles)
        dist = distance_matrix.harmonic_weight(dist)
        
    def eBurst(names, profiles) :
        dist = distance_matrix.symmetric(profiles)
        dist = distance_matrix.eBurst_weight(dist)
        dist = dist + 1
        np.fill_diagonal(dist, 0.0)
        
        mst = sp.sparse.csgraph.minimum_spanning_tree(dist)
        
        
    def ninja(names, profiles) :
        dist = distance_matrix.symmetric(profiles)

if __name__ == '__main__' :
    # method: PSA, eBurst, ninja
    method, profile_file = sys.argv[1:3]
    names = []
    profiles = []
    with open(sys.argv[1]) as fin :
        head = fin.readline()
        if head.startswith('>') :
            encode = {'a':1, 'c':2, 'g':3, 't':4, 
                      'A':1, 'C':2, 'G':3, 'T':4}
            names.append(head[1:].strip().split()[0])
            profiles.append([])
            for line in fin :
                if line.startswith('>') :
                    names.append(line.strip().split()[0])
                    profiles.append([])
                else :
                    profiles[-1].extend(line.strip().split())
            for id, p in enumerate(profiles) :
                profiles[id] = [ encode.get(b, 0) for b in ''.join(p) ]
        else :
            for line in fin :
                part = line.strip().split()
                names.append(part[0])
                profiles.append([int(p) for p in part[1:]])
    profiles = np.array(profiles, dtype=int)

    m = methods()
    tre = eval('m.' + method)(names, profiles)
    
    print tre.as_string('nexus')
