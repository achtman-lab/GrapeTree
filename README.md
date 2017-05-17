# EnteroMSTree


## MSTrees.py
### paramters :
        profile: input file. Can be either profile or fasta. Headings start with an '#' will be ignored. 
        method: MST or NJ
        matrix_type: asymmetric or symmetric
        edge_weight: harmonic or eBurst
        neighbor_branch_reconnection: T or F
    
### Outputs :
        A string of a NEWICK tree
    
### Examples :
        To run a Balanced Spanning Arborescence (BSA), use :
        backend(profile=<filename>, method='MST', matrix_type='asymmetric', edge_weight='harmonic', neighbor_branch_reconnection='T')
    
        OR simply
        backend(profile=<filename>)
        
        To run a standard minimum spanning tree :
        backend(profile=<filename>, method='MST', matrix_type='symmetric', edge_weight='eBurst', neighbor_branch_reconnection='F')
        
        To run a NJ tree (using FastME 2.0) :
        backend(profile=<filename>, method='NJ')
    
### Can also be called in command line:
        BSA: MSTrees.py profile=<filename> method=MST matrix_type=asymmetric edge_weight=harmonic neighbor_branch_reconnection=T
        MST: MSTrees.py profile=<filename> method=MST matrix_type=symmetric edge_weight=eBurst neighbor_branch_reconnection=F
        NJ:  MSTrees.py profile=<filename> method=NJ
