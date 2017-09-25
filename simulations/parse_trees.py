import sys
from ete2 import Tree
import collections

trees_file = sys.argv[1]
target = sys.argv[2]

tree_hash = {}
begin = False
file = open(trees_file,"r")
for line in file:
    if "=" in line:
        begin = True
    if "DIM" in line:
        continue
    if begin:
        x = line.rstrip("\n").lstrip(" ").split(" =")
        name = x[0].split(" ")[1]
        tree_hash[name] = x[1].lstrip(" ")

file.close()

def parse_weird_tree(tree_string):
    s = tree_string.split("]")
    normTree = ""
    doubleTaxa = {}
    for elem in s:
        if "[" in elem:
            taxa = elem.split("{")[1].split(",")
            if len(taxa) > 1:
                doubleTaxa[taxa[0]] = taxa[1:]
            x = elem.split("[")
            normTree += x[0]
        else:
            normTree += elem
    tree = Tree(normTree, format=1)
    #tree.unroot()
    for node in tree.traverse():
        if node.name in doubleTaxa:
            for elem in doubleTaxa[node.name]:
                n = elem.rstrip("}")
                node.add_child(name=n)
    #strategy: remove [] first, remember all nodes that represent multiple taxa
    #build ete2 tree
    #add additional taxa: if leaf, add sister leaf
    #if internal, add sister node as leaf (should be fine for def of splits)
    a = tree.write(format=1,format_root_node=True)
    return a

#parse trees that are not in pure newick format
for elem in tree_hash:
    if elem == target:
        if "&" in tree_hash[elem]:
            p = parse_weird_tree(tree_hash[elem])
            tree_hash[elem] = p
        out = open(trees_file[:-6]+"_"+elem,"w")
        out.write(tree_hash[elem])
        out.close()
