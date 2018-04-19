import numpy as np, dendropy as dp, networkx as nx
from subprocess import Popen, PIPE
import sys, os, tempfile, platform, re, tempfile, psutil
import argparse

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

params = dict(method='MSTreeV2', # MSTree , NJ
              matrix_type='symmetric',
              heuristic = 'eBurst',
              handle_missing = 'pair_delete', # complete_delete , absolute_distance , as_allele
              branch_recraft=False,
              wgMLST = False,
              n_proc = 5,
              checkEnv = False,
              NJ_Windows = os.path.join(base_dir, 'binaries', 'fastme.exe'),
              NJ_Darwin = os.path.join(base_dir, 'binaries', 'fastme-2.1.5-osx'),
              NJ_Linux = os.path.join(base_dir, 'binaries', 'fastme-2.1.5-linux64'),
              NJ_Linux32 = os.path.join(base_dir, 'binaries', 'fastme-2.1.5-linux32'),
              edmonds_Windows = os.path.join(base_dir, 'binaries', 'edmonds.exe'),
              edmonds_Darwin = os.path.join(base_dir, 'binaries', 'edmonds-osx'),
              edmonds_Linux = os.path.join(base_dir, 'binaries', 'edmonds-linux'),
              goeburst_Linux = os.path.join(base_dir, 'binaries', 'goeburst'),
             )


def add_args() :
    parser = argparse.ArgumentParser(description='Parameters for command line version of GrapeTree. \nYou can drag the Newick output into the web interface. ', formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--profile', '-p', help='A file contains either MLST / SNP profiles or multile aligned sequences in fasta format.', required=True)
    parser.add_argument('--method', '-m', help='backend algorithms to call. Allowed values are "MSTreeV2" [default], "MSTree" and "NJ"', default='MSTreeV2')
    parser.add_argument('--matrix', '-x', dest='matrix_type', help='Either "symmetric" [default for MSTree and NJ] \nor "asymmetric" [default for MSTreeV2]. ', default='symmetric')
    parser.add_argument('--recraft', '-r', dest='branch_recraft', help='Allows local branch recrafting after tree construction. Default in MSTreeV2. ', default=False, action="store_true")
    parser.add_argument('--missing', '-y', dest='handle_missing', help='Alternative ways of handling missing data.\n0: missing data are ignored in pairwise comparisons [default]. \n1: Columns that have missing data are ignored in the whole analysis. \n2: missing data are treated as a special value (allele). \n3: Naive counting of absolute differences between profiles. ', default=0, type=int)
    parser.add_argument('--wgMLST', '-w', help='Experimental option for a better support of wgMLST schemes.', default=False, action="store_true")
    parser.add_argument('--heuristic', '-t', dest='heuristic', help='Tiebreak rules between co-optimal edges. Only used in MSTree [default: eBurst] and MSTreeV2 [default: harmonic]', default='eBurst')
    parser.add_argument('--n_proc', '-n', help='Number of processes. Default: 5. ', type=int, default=5)
    parser.add_argument('--check', '-c', dest='checkEnv', help='Do not calculate the tree but only show the expected time/memory consumption. ', default=False, action="store_true")
    args = parser.parse_args()
    args.handle_missing = ['pair_delete', 'complete_delete', 'as_allele', 'absolute_distance'][args.handle_missing]
    return args.__dict__

def parallel_distance(callup) :
    func, prof_file, sub_prefix, handle_missing, index_range = callup
    profiles = np.load(prof_file)
    res = eval('distance_matrix.'+func)(profiles, handle_missing, index_range)
    subfile = sub_prefix.format(index_range[0])
    np.save(subfile, res)
    return subfile


class distance_matrix(object) :
    @staticmethod
    def get_distance(func, profiles, handle_missing) :
        from multiprocessing import Pool
        n_profile = profiles.shape[0]
        n_proc = min(int(params['n_proc']), profiles.shape[0])
        np.save(params['prof_file'], profiles)
        if n_proc > 1 :
            pool = Pool(n_proc)
            indices = np.array([[n_profile*v/n_proc+0.5, n_profile*(v+1)/n_proc+0.5] for v in np.arange(n_proc, dtype=float)], dtype=int)
            del profiles
            subfiles = pool.map(parallel_distance, [[func, params['prof_file'], params['dist_subfile'], handle_missing, idx] for idx in indices])
            pool.close()
            del pool
            res = np.hstack([ np.load(subfile) for subfile in subfiles ])
        else :
            subfiles = [parallel_distance([func, params['prof_file'], params['dist_subfile'], handle_missing, [0, n_profile]])]
            res = np.load(subfiles[0])
        for subfile in subfiles :
            try :
                os.unlink(subfile)
            except :
                pass
        np.save(params['dist_file'], res)
        if func == 'symmetric' :
            res[res.T > res] = res.T[res.T > res]
        return res
    @staticmethod
    def asymmetric_wgMLST(profiles, handle_missing = 'pair_delete', index_range=None) :
        if index_range is None :
            index_range = [0, profiles.shape[0]]

        presences = (profiles > 0)
        pp = np.sum(presences, 0).astype(float)
        pp = pp*(pp-1)/(presences.shape[0]*(presences.shape[0]-1))
        distances = np.zeros(shape=[profiles.shape[0], index_range[1] - index_range[0]])

        if handle_missing not in ('absolute_distance', ) :
            for i2, id in enumerate(np.arange(*index_range)) :
                profile, presence = profiles[id], presences[id]
                diffs = np.sum(((profiles != profile) & (presences * presence))+(presences < presence)*pp, axis=1) * float(presence.size)/np.sum(presence)
                distances[:, i2] = diffs
        else :
            for i2, id in enumerate(np.arange(*index_range)) :
                profile, presence = profiles[id], presences[id]
                diffs = np.sum((profiles != profile) & presence, axis=1)
                distances[:, i2] = diffs
        return distances

    @staticmethod
    def asymmetric(profiles, handle_missing = 'pair_delete', index_range=None) :
        if index_range is None :
            index_range = [0, profiles.shape[0]]

        presences = (profiles > 0)
        distances = np.zeros(shape=[profiles.shape[0], index_range[1] - index_range[0]])

        if handle_missing not in ('absolute_distance', ) :
            for i2, id in enumerate(np.arange(*index_range)) :
                profile, presence = profiles[id], presences[id]
                diffs = np.sum(((profiles != profile) & presence), axis=1) * float(presence.size)/np.sum(presence)
                distances[:, i2] = diffs
        else :
            for i2, id in enumerate(np.arange(*index_range)) :
                profile, presence = profiles[id], presences[id]
                diffs = np.sum((profiles != profile) & presence, axis=1)
                distances[:, i2] = diffs
        return distances

    @staticmethod
    def symmetric(profiles, handle_missing = 'pair_delete', index_range=None) :
        if index_range is None :
            index_range = [0, profiles.shape[0]]

        if handle_missing in ('as_allele', ) :
            presences = np.ones(shape=profiles.shape, dtype=int)
        elif handle_missing in ('pair_delete', 'absolute_distance') :
            presences = (profiles > 0)
        else :
            presences = np.repeat(np.sum(profiles >0, 0) >= profiles.shape[0], profiles.shape[0]).reshape([profiles.shape[1], profiles.shape[0]]).T

        distances = np.zeros(shape=[profiles.shape[0], index_range[1] - index_range[0]])
        if handle_missing in ('pair_delete',) :
            for i2, id in enumerate(np.arange(*index_range)) :
                profile, presence = profiles[id], presences[id]
                comparable = (presences[:id] * presence)
                diffs = np.sum((profiles[:id] != profile) & comparable, axis=1) * float(presence.size) / np.sum(comparable, axis=1)
                distances[:id, i2] = diffs
        else :
            for i2, id in enumerate(np.arange(*index_range)) :
                profile, presence = profiles[id], presences[id]
                diffs = np.sum((profiles[:id] != profile) & (presences[:id] * presence), axis=1)
                distances[:id, i2] = diffs
                distances[id, :i2] = diffs[index_range[0]:index_range[0]+id]
        return distances

    @staticmethod
    def symmetric_link(profiles, links, handle_missing = 'pair_delete') :
        if handle_missing in ('as_allele', ) :
            presences = np.ones(shape=profiles.shape, dtype=int)
        elif handle_missing in ('pair_delete', 'absolute_distance') :
            presences = (profiles > 0)
        else :
            presences = np.repeat(np.sum(profiles >0, 0) >= profiles.shape[0], profiles.shape[0]).reshape([profiles.shape[1], profiles.shape[0]]).T

        return [ [ s, t, np.sum((profiles[s] != profiles[t]) & presences[s] & presences[t]) ] \
                 for s, t, d in links ]

    @staticmethod
    def harmonic(dist, n_str) :
        weights = dist.shape[0] / np.sum(1.0/(dist + 0.1), 1)
        cw = np.vstack([-np.array(n_str), weights])
        weights[np.lexsort(cw)] = np.arange(dist.shape[0], dtype=float)/dist.shape[0]
        return weights

    @staticmethod
    def eBurst(dist, n_str) :
        weights = np.apply_along_axis(np.bincount, 1, np.hstack([dist.astype(int), np.array([[np.max(dist).astype(int)+1]]*dist.shape[1])]) )
        weights.T[0] += n_str
        dist_order = np.concatenate([[0], np.arange(weights.shape[1]-1, 0, -1)])
        orders = np.lexsort(-weights.T[dist_order])
        weights = np.zeros(dist.shape[0])
        weights[orders] = (np.arange(orders.size))/float(orders.size)
        return weights


class methods(object) :
    @staticmethod
    def _symmetric(dist, weight, **params) :
        def minimum_spanning_tree(dist) :
            n_node = dist.shape[0]
            nodes = np.arange(n_node)
            ng = {n:[n] for n in nodes}
            edges = np.array([ [x, y, dist[x, y]] for y in np.arange(n_node) for x in np.arange(y) ])
            edges = edges[np.argsort(edges.T[2])].astype(int)
            mst = []
            for m, e in enumerate(edges) :
                if nodes[e[0]] == nodes[e[1]] :
                    continue
                mst.append(e.tolist())
                if nodes[e[0]] > nodes[e[1]] :
                    s, e = nodes[e[1]], nodes[e[0]]
                else :
                    s, e = nodes[e[0]], nodes[e[1]]
                nodes[ng[e]] = s
                ng[s].extend(ng.pop(e))
            return mst


        dist = np.round(dist, 0) + weight.reshape([weight.size, -1])
        np.fill_diagonal(dist, 0.0)
        dist[dist > dist.T] = dist.T[dist > dist.T]
        try:
            res = minimum_spanning_tree(dist)
            dist = np.round(dist, 0)
            return res
        except :
            g = nx.Graph(dist)
            ms = nx.minimum_spanning_tree(g)
            dist = np.round(dist, 0)
            return [[d[0], d[1], int(d[2]['weight'])] for d in ms.edges(data=True)]

    @staticmethod
    def _asymmetric(dist, weight, **params) :
        def get_shortcut(dist, weight, cutoff=5) :
            if dist.shape[0] < 10000 :
                cutoff = 1
            link = np.array(np.where(dist < (cutoff+1) ))
            link = link.T[weight[link[0]] < weight[link[1]]].T
            link = np.vstack([link, dist[link.tolist()] + weight[link[0]]])
            link = link.T[np.lexsort(link)]
            return link[np.unique(link.T[1], return_index=True)[1]].astype(int)

        try:
            wdist = np.round(dist, 0) + weight.reshape([weight.size, -1])
            np.fill_diagonal(wdist, 0.0)
            del dist

            presence = np.arange(weight.shape[0])
            shortcuts = get_shortcut(wdist, weight)
            for (s, t, d) in shortcuts :
                wdist[s, wdist[s] > wdist[t]] = wdist[t, wdist[s] > wdist[t]]
                presence[t] = -1
            wdist = wdist.T[presence >= 0].T[presence >= 0]
            presence = presence[presence >=0]

            wdist_file = params['tempfix'] + '.wdist.list'
            with open(wdist_file, 'w') as fout :
                for d in wdist :
                    fout.write('{0}\n'.format('\t'.join([str(dd) for dd in (d+1.)])))
            del wdist, d
            mstree = Popen([params['edmonds_' + platform.system()], wdist_file], stdout=PIPE).communicate()[0]
            os.unlink(wdist_file)
            mstree = np.array([ br.strip().split() for br in mstree.strip().split('\n')], dtype=float).astype(int)
            assert mstree.size > 0
            mstree.T[2] -= 1
            mstree.T[:2] = presence[mstree.T[:2]]
            return mstree.tolist() + shortcuts.tolist()
        except :
            try :
                os.unlink(wdist_file)
            except :
                pass
            dist = np.load(params['dist_file'])
            wdist = np.round(dist, 0) + weight.reshape([weight.size, -1])
            np.fill_diagonal(wdist, 0.0)
            del dist

            presence = np.arange(weight.shape[0])
            shortcuts = get_shortcut(wdist, weight)
            for (s, t, d) in shortcuts :
                wdist[s, wdist[s] > wdist[t]] = wdist[t, wdist[s] > wdist[t]]
                presence[t] = -1
            wdist = wdist.T[presence >= 0].T[presence >= 0]
            presence = presence[presence >=0]

            g = nx.DiGraph(wdist)
            ms = nx.minimum_spanning_arborescence(g)
            return [[presence[d[0]], presence[d[1]], int(d[2]['weight'])] for d in ms.edges(data=True)] + shortcuts.tolist()

    @staticmethod
    def _branch_recraft(branches, dist, weights, n_loci) :
        def contemporary(a,b,c) :
            a[0], a[1] = max(min(a[0], n_loci-0.5), 0.5), max(min(a[1], n_loci-0.5), 0.5);
            b, c = max(min(b, n_loci-0.5), 0.5), max(min(c, n_loci-0.5), 0.5)
            if b >= a[0] + c and b >= a[1] + c :
                return False
            elif b == c :
                return True
            s11, s12 = np.sqrt(1-a[0]/n_loci), (2*n_loci - b - c)/2/np.sqrt(n_loci*(n_loci-a[0]))
            v = 1-((n_loci-a[1])*(n_loci-c)/n_loci+(n_loci-b))/2/n_loci
            s21, s22 = 1+a[1]*v/(b-2*n_loci*v), 1+c*v/(b-2*n_loci*v)

            p1 = a[0]*np.log(1-s11*s11) + (n_loci-a[0])*np.log(s11*s11) + (b+c)*np.log(1-s11*s12) + (2*n_loci-b-c)*np.log(s11*s12)
            p2 = a[1]*np.log(1-s21) + (n_loci-a[1])*np.log(s21) + b*np.log(1-s21*s22) + (n_loci-b)*np.log(s21*s22) + c*np.log(1-s22) + (n_loci-c)*np.log(s22)
            return p1 >= p2

        if n_loci is None :
            n_loci = np.max(dist)

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
                    if d < 1.5*dist[src, tgt] :
                        if contemporary([dist[s, src], dist[src, s]], d, dist[src, tgt]) :
                            tried[src], src = s, s
                            break
                while src not in tried :
                    tried[src] = src
                    mid_nodes = sorted([[weights[s], dist[s,tgt], s] for s in childrens[src] if s not in tried and dist[s,tgt] < 2*dist[src, tgt]])
                    for w, d, s in mid_nodes :
                        if d < dist[src, tgt] :
                            if not contemporary([dist[src, s], dist[s, src]], dist[src, tgt], d) :
                                tried[src], src = s, s
                                break
                        elif w < weights[src] :
                            if contemporary([dist[s, src], dist[src, s]], d, dist[src, tgt]) :
                                tried[src], src = s, s
                                break
                        tried[s] = src
            if len(targets) > 1 :
                for w, d, t in sorted(zip(weights[targets], dist[src, targets], targets))[:3] :
                    if t == tgt : break
                    if d < 1.5*dist[src, tgt] :
                        if contemporary([dist[t, tgt], dist[tgt, t]], d, dist[src, tgt]) :
                            tried[tgt], tgt = t, t
                            break
                while tgt not in tried :
                    tried[tgt] = tgt
                    mid_nodes = sorted([[weights[t], dist[src,t], t] for t in childrens[tgt] if t not in tried and dist[src, t] < 2*dist[src, tgt]])
                    for w, d, s in mid_nodes :
                        if d < dist[src, tgt] :
                            if not contemporary([dist[tgt, t], dist[t, tgt]], dist[src, tgt], d) :
                                tried[tgt], tgt = t, t
                                break
                        elif w < weights[tgt] :
                            if contemporary([dist[t, tgt], dist[tgt, t]], d, dist[src, tgt]) :
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
    def MSTree(names, profiles, embeded, matrix_type='asymmetric', heuristic='harmonic', branch_recraft=True, handle_missing='pair_delete', **params) :
        n_loci = profiles.shape[1]
        dist = distance_matrix.get_distance(matrix_type, profiles, handle_missing)
        weight = eval('distance_matrix.'+heuristic)(dist, [len(embeded[n]) for n in names])

        tree = eval('methods._'+matrix_type)(dist, weight, **params)
        if branch_recraft :
            tree = methods._branch_recraft(tree, np.load(params['dist_file']), weight, n_loci)
            del dist
        tree = distance_matrix.symmetric_link(np.load(params['prof_file']), tree, handle_missing= handle_missing)
        tree = methods._network2tree(tree, names)
        return tree

    @staticmethod
    def goeBurst(names, profiles, embeded, handle_missing='pair_delete', **params) :
        goeburst = Popen([params['goeburst_Linux']] + ['-t'], stdin=PIPE, stdout=PIPE)
        if handle_missing == 'pair_delete' :
            for n, p in enumerate(profiles) :
                goeburst.stdin.write('{0}\t{1}\n'.format(n, '\t'.join([str(pp) if pp > 0 else '-' for pp in p])))
        else :
            for n, p in enumerate(profiles) :
                goeburst.stdin.write('{0}\t{1}\n'.format(n, '\t'.join([str(pp) for pp in p])))
        tree = []
        for line in goeburst.communicate()[0].split('\n') :
            nodes = line.strip().split(' ')
            if len(nodes) > 1 :
                tree.append([int(nodes[0]), int(nodes[1]), 0])
        tree = distance_matrix.symmetric_link(profiles, tree, handle_missing= handle_missing)
        tree = methods._network2tree(tree, names)
        return tree
    @staticmethod
    def distance(names, profiles, embeded, matrix_type='symmetric', handle_missing='pair_delete', **params) :
        ids = {n:id for id, n in enumerate(names)}
        ids = { gg:ids[k] for k,g in embeded.iteritems() for gg in g }
        names, indices = [], []
        for n, i in sorted(ids.iteritems(), key=lambda x:(x[1], x[0])) :
            names.append(n)
            indices.append(i)
        indices = np.array(indices)
        d = distance_matrix.get_distance(matrix_type, profiles, handle_missing)
        dist = np.zeros([len(names), len(names)])
        for i, i2 in enumerate(indices) :
            dist[i] = d[i2, indices]
        dist_txt = ['    {0}'.format(dist.shape[0])]
        for n, d in zip(names, dist) :
            dist_txt.append('{0!s:10} {1}'.format(n, ' '.join(['{:.6f}'.format(dd) for dd in d])))
        return dist_txt

    @staticmethod
    def NJ(names, profiles, embeded, handle_missing='pair_delete', **params) :
        dist = distance_matrix.get_distance('symmetric', profiles, handle_missing)

        dist_file = params['tempfix'] + 'dist.list'
        with open(dist_file, 'w') as fout :
            fout.write('    {0}\n'.format(dist.shape[0]))
            for n, d in enumerate(dist) :
                fout.write( '{0!s:10} {1}\n'.format(n, ' '.join(['{:.6f}'.format(dd) for dd in d])) )
        del dist, d
        try :
            Popen([params['NJ_{0}'.format(platform.system())], '-i', dist_file, '-m', 'N'], stdout=PIPE).communicate()
        except Exception as e :
            if platform.system() == 'Linux' :
                Popen([params['NJ_Linux32'], '-i', dist_file, '-m', 'N'], stdout=PIPE).communicate()
            else :
                raise e
        tree = dp.Tree.get_from_path(dist_file + '_fastme_tree.nwk', schema='newick')
        try :
            tree.reroot_at_midpoint()
        except :
            pass
        tree.is_rooted = False
        from glob import glob
        for fname in glob(dist_file + '*') :
            os.unlink(fname)
        for taxon in tree.taxon_namespace :
            taxon.label = names[int(taxon.label)]
        return tree

def nonredundant(names, profiles) :
    encoded_profile = np.array([np.unique(p, return_inverse=True)[1]+1 for p in profiles.T]).T
    encoded_profile[ (profiles == '0') | (profiles == 'N') | (profiles == '-')] = 0
    if params['handle_missing'] == 'complete_delete' :
        encoded_profile = encoded_profile[:, np.sum(encoded_profile == 0, 0) > 0]
    names = names[np.lexsort(encoded_profile.T)]
    profiles = encoded_profile[np.lexsort(encoded_profile.T)]
    presence = (np.sum(profiles > 0, 1) > 0)
    names, profiles = names[presence], profiles[presence]

    uniqueness = np.concatenate([[1], np.sum(np.diff(profiles, axis=0) != 0, 1) > 0])

    embeded = {names[0]:[]}
    embeded_group = embeded[names[0]]
    for n, u in zip(names, uniqueness) :
        if u == 0 :
            embeded_group.append(n)
        else :
            embeded[n] = [n]
            embeded_group = embeded[n]
    names = names[uniqueness>0]
    profiles = profiles[uniqueness>0]
    return names, profiles, embeded

def backend(**args) :
    '''
    paramters :
        profile: input file or the content of the file as a string. Can be either profile or fasta. Headings start with an '#' will be ignored.
        method: MSTreeV2, MSTree or NJ
        matrix_type: asymmetric or symmetric
        heuristic: harmonic or eBurst
        branch_recraft: T or F

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

        To obtain a standard distance matrix :
        backend(profile=<filename>, method='distance')

    Can also be called in command line:
        MSTreeV2: MSTrees.py profile=<filename> method=MSTreeV2
        MSTree: MSTrees.py profile=<filename> method=MSTree
        NJ:  MSTrees.py profile=<filename> method=NJ
        distance:  MSTrees.py profile=<filename> method=distance
    '''
    global params
    params.update(args)
    if params['method'] == 'MSTreeV2' :
        params.update(dict(
            method = 'MSTree',
            matrix_type = 'asymmetric',
            heuristic = 'harmonic',
            branch_recraft = True,
        ))
    if params['wgMLST'] and params['matrix_type'] == 'asymmetric' :
        matrix_type = 'asymmetric_wgMLST'


    names, profiles = [], []
    fin = open(params['profile']).readlines() if os.path.isfile(params['profile']) else params['profile'].split('\n')

    allele_cols = None
    for line_id, line in enumerate(fin) :
        if line.startswith('#') :
            if not line.startswith('##') :
                header = line.strip().split('\t')
                allele_cols = np.array([ id for id, col in enumerate(header) if id > 0 and not col.startswith('#')])
            continue
        fmt = 'fasta' if line.startswith('>') else 'profile'
        break

    if fmt == 'fasta' :
        for line in fin[line_id:] :
            if line.startswith('>') :
                names.append(line[1:].strip().split()[0])
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
            if allele_cols is not None :
                profiles.append(np.array(part)[allele_cols])
            else :
                profiles.append(part[1:])
    profiles = np.char.upper(profiles)
    names = [re.sub(r'[\(\)\ \,\"\';]', '_', n) for n in names]
    names, profiles, embeded = nonredundant(np.array(names), np.array(profiles))
    if int(params.get('checkEnv', False)) :
        time, memory = estimate_Consumption(platform.system(), params['method'], params['matrix_type'], int(params['n_proc']), profiles.shape[1], profiles.shape[0])
        free_memory = psutil.virtual_memory().available
        import json
        return json.dumps(dict(time=time, memory=memory, affordable=free_memory >= memory))
    with tempfile.NamedTemporaryFile(delete=True, dir='.') as f :
        params['tempfix'] = f.name
        params['prof_file'] = params['tempfix']+'.prof.npy'
        params['dist_file'] = params['tempfix']+'.dist.npy'
        params['dist_subfile'] = params['tempfix']+'.dist.{0}.npy'
        tre = eval('methods.' + params['method'])(names, profiles, embeded, **params)
        if params['method'] != 'distance' :
            for taxon in tre.taxon_namespace :
                embeded_group = embeded[taxon.label]
                if len(embeded_group) > 1 :
                    taxon.label = '({0}:0)'.format(':0,'.join(embeded_group))

            for fname in (params['prof_file'], params['dist_file']) :
                try:
                    os.unlink(fname)
                except :
                    pass
            return tre.as_string('newick').replace("'", "")
        else :
            for fname in (params['prof_file'], params['dist_file']) :
                try:
                    os.unlink(fname)
                except :
                    pass
            return '\n'.join(tre)

def estimate_Consumption(platform, method, matrix, n_proc, n_loci, n_profile) :
    if method == 'MSTree' :
        if matrix == 'asymmetric' :
            if platform == 'Windows' :
                time = 5.600754e-6 * n_profile * n_profile + 6.22306e-9 * n_loci * n_profile * n_profile/n_proc + 22.71
                memory = 182.16 * n_profile * n_profile + 282674000
            else :
                time = 2.431284e-6 * n_profile * n_profile + 2.701426667e-9 * n_loci * n_profile * n_profile/n_proc + 33.753
                memory = 103.77 * n_profile * n_profile + 516625000
        else :
            if platform == 'Windows' :
                time = 3.362214e-6 * n_profile * n_profile + 3.735793333e-9 * n_loci * n_profile * n_profile/n_proc + 20
                memory = 70.140 * n_profile * n_profile + 292156000
            else :
                time = 2.272428e-6 * n_profile * n_profile + 32.625 + 2.52492e-9 * n_loci * n_profile * n_profile/n_proc
                memory = 66.297 * n_profile * n_profile + 429570000
    elif method == 'NJ' :
        if platform == 'Windows' :
            time = 1.149e-8 *  n_profile * n_profile * n_profile
            memory = max(0.058292 *  n_profile * n_profile * n_profile, 1.39e6 * n_profile - 9.86e8)
        else :
            time = 1.1042e-8 *  n_profile * n_profile * n_profile
            memory = max(0.058292 *  n_profile * n_profile * n_profile, 1.39e6 * n_profile - 9.86e8)

    return max(time, 5), max(memory, 50*1024*1024)

if __name__ == '__main__' :
    tre = backend(**add_args())
    print tre

