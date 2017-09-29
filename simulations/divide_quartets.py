import sys
import itertools
import time
import collections
from ete2 import Tree




tree_file = sys.argv[1]
outfile = sys.argv[2]


file = open(tree_file, "r")
newick = file.read()
file.close()
tree = Tree(newick, format=1)


def get_splits_divide(tree):
    splits_balanced = collections.defaultdict(set)
    splits_unbalanced = collections.defaultdict(set)
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
                        c.append(node)
                    for e in comb:
                        if not e == node:
                            if e in first:
                                c.append(e)
                            else:
                                d.append(e)
                    if len(c) == 2:
                            #counter_splits += 1

                            anc = c[0].get_common_ancestor(d[1])
                            anc2 = c[0].get_common_ancestor(d[0])
                            #print node.name
                            #print anc.name
                            if anc == node.up and anc2 == node.up:
                                #print "BALANCED"
                                splits_balanced[(c[0].name, c[1].name)].add((d[0].name, d[1].name))
                            else:
                                #print "UNBALANCED"
                                splits_unbalanced[(c[0].name, c[1].name)].add((d[0].name, d[1].name))
                            break

            if not split:
                stars.append(elem)
                #counter_star += 1

    return splits_balanced,splits_unbalanced

def write_splits(splits_b, splits_u, outfile):
    out = open(outfile,"w")
    for elem in splits_b:
        for value in splits_b[elem]:
            #one line per split
            out.write("BALANCED"+"\t"+elem[0]+","+elem[1] + "|" + value[0]+","+value[1]+"\n")

    for elem in splits_u:
        for value in splits_u[elem]:
            # one line per split
            out.write("UNBALANCED" + "\t" + elem[0] + "," + elem[1] + "|" + value[0] + "," + value[1] + "\n")

    out.close()


splits_balanced, splits_unbalanced = get_splits_divide(tree)
write_splits(splits_balanced,splits_unbalanced,outfile)
