import os, sys
from subprocess import Popen, PIPE
from MSTrees import backend as GrapeTree
from MSTrees2 import backend as GrapeTree2
from dendropy import Tree, TreeList

def appendTo(nwk, label, tlist) :
    tre = Tree.get_from_string(nwk, 'newick')
    tre.label = label
    tlist.append(tre)

if __name__ == '__main__' :
    sim_data = sys.argv[1]
    trees = TreeList()
    tree = GrapeTree(profile=sim_data, method='MSTreeV2')
    appendTo(tree, 'MSTreeV2', trees)
    
    tree = GrapeTree(profile=sim_data, method='MSTree', missing_data='as_allele',
                     matrix_type = 'symmetric',
                     edge_weight = 'eBurst',
                     branch_recrafting = 'F'
                    )
    appendTo(tree, 'goeBurstA', trees)

    tree = GrapeTree(profile=sim_data, method='MSTree', missing_data='pair_delete', 
                     matrix_type = 'symmetric',
                     edge_weight = 'eBurst',
                     branch_recrafting = 'F'
                    )
    appendTo(tree, 'goeBurstI', trees)

    tree = GrapeTree2(profile=sim_data, method='MSTreeV2')
    appendTo(tree, 'MSTreeV3', trees)
    
    tree = GrapeTree2(profile=sim_data, method='MSTree', missing_data='pair_delete', 
                     matrix_type = 'asymmetric',
                     edge_weight = 'harmonic',
                     branch_recrafting = 'F'
                    )
    appendTo(tree, 'MS2', trees)

    tree = GrapeTree(profile=sim_data, method='MSTree', missing_data='pair_delete', 
                     matrix_type = 'asymmetric', 
                     edge_weight = 'harmonic', 
                     neighbor_branch_reconnection = 'F'
                    )
    appendTo(tree, 'MSA', trees)

    tree = GrapeTree(profile=sim_data, method='NJ', missing_data='pair_delete')
    appendTo(tree, 'NJ', trees)

    print trees.as_string('nexus')
