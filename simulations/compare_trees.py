# take two trees, compute the number of quartet splits they are sharing and the number of quartet splits
# that are conflicting
# TP = correct quartet agreeing with reference tree
# FP = quartet in disagreement with the reference tree

import sys
import itertools
import time
import collections
from ete2 import Tree

tree_file = sys.argv[1]
mode = sys.argv[3]
ref_file = sys.argv[2]


file = open(tree_file, "r")
newick = file.read()
file.close()
tree = Tree(newick, format=1)

file = open(ref_file,"r")
newick = file.read()
file.close()
ref = Tree(newick, format=1)


def get_splits(tree):
    splits = collections.defaultdict(set)
    stars = []
    nodes = []

    #tree.unroot()
    for node in tree.traverse("postorder"):
        if not node.is_leaf():
            children = node.get_children()
            for child in children:
                if node.get_distance(child) == 0:
                    if node.name == '':
                        node.name = child.name
                        x = child.detach()
                        for elem in x.get_children():
                            node.add_child(elem)

    # print tree.get_ascii()
    for node in tree.traverse():
        if not node.name == '':
            nodes.append(node)
    if not len(nodes) == 40:
        sys.exit(1)
    combs = itertools.combinations(nodes, 4)


    for node in tree.traverse():
        if len(node.get_children()) == 1:
            node.add_child(name='X')


    for comb in combs:
            elem = (comb[0].name, comb[1].name, comb[2].name, comb[3].name)
            split = False
            for node in tree.traverse():
                if len(node.children) > 1 and not node.dist == 0:
                    first = node.get_descendants()
                    c = []
                    d = []
                    if node in comb:
                        c.append(node.name)
                    for e in comb:
                        if not e == node:
                            if e in first:
                                c.append(e.name)
                            else:
                                d.append(e)
                    if len(c) == 2:
                            #counter_splits += 1
                            splits[(c[0],c[1])].add((d[0].name,d[1].name))
                            break

            if not split:
                stars.append(elem)
                #counter_star += 1
    return splits

def get_splits_hier(tree):
    splits = collections.defaultdict(set)
    counter_all = 0
    counter_star = 0
    leaves = tree.get_leaves()
    combs = itertools.combinations(leaves, 4)
    for node in tree.traverse():
        if len(node.get_children()) == 1:
            node.add_child(name='X')

    for comb in combs:
            split = False
            for edge in tree.iter_edges():
                if not len(edge[1]) <= 1 and not len(edge[0]) <= 1:
                    anc = tree.get_common_ancestor(edge[0])
                    first = anc.get_descendants()
                    c = []
                    d = []
                    if anc in comb:
                        c.append(anc.name)

                    for e in comb:
                        if e in first:
                            c.append(e.name)
                        elif not e == anc:
                            d.append(e.name)
                    if len(c) == 2:
                        split = True
                        splits[(c[0],c[1])].add((d[0],d[1]))
                        break

            if not split:
                #stars.append(elem)
                counter_star += 1
                print "ERROR"

    return splits



def write_splits(splits, outfile):
    out = open(outfile,"w")
    for elem in splits:
        for value in splits[elem]:
            #one line per split
            out.write(elem[0]+","+elem[1] + "|" + value[0]+","+value[1]+"\n")
    out.close()

def write_stars(stars, outfile):
    out = open(outfile,"w")
    for elem in stars:
        out.write(str(elem)+"\n")
    out.close()



#t0 = time.time()


if mode == "MST":
    splits = get_splits(tree)
    write_splits(splits,tree_file+".splits")
else:
    splits = get_splits_hier(tree)
    write_splits(splits,tree_file+".splits")


#print time.time() - t0, "seconds process time"
