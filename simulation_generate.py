import subprocess, sys, os, numpy as np
from pyLib.bio_parser import readFasta_toList

simbac = 'SimBac'

if __name__ == '__main__' :
	rec = 0.0
    prefix, mut, n_gene = sys.argv[1:]
    prefix = '_'.join([prefix, mut.split('.')[1], n_gene])
    cmd = '{3} -N 40 -D 500 -e 500 -r 0 -T {1} -R 0 -B {2} -c {0}.global -o {0}.genome -l {0}.local'.format(prefix, mut, int(n_gene)*1000, simbac)
    subprocess.Popen(cmd.split()).communicate()
    seq = readFasta_toList('{0}.genome'.format(prefix))
    os.unlink('{0}.genome'.format(prefix))
    #subprocess.Popen('gzip -f {0}.genome'.format(prefix).split()).communicate()
    genes = ['#ST_id']
    profiles = np.zeros([len(seq), int(n_gene)+1], dtype=int)
    profiles.T[0] = [ n for n,s in seq ]
    for g_id in xrange(1, int(n_gene)+1) :
        genes.append('Gene_{0}'.format(g_id))
        alleles = {}
        coord = ((g_id-1)*1000, 900 + (g_id-1)*1000)
        for s_id, (n, s) in enumerate(seq) :
            allele = s[coord[0]:coord[1]]
            if allele not in alleles :
                alleles[allele] = len(alleles) + 1
            profiles[s_id][g_id] = alleles[allele]
    with open('{0}.profile'.format(prefix), 'w') as fout :
        fout.write('{0}\n'.format('\t'.join(genes)))
        for profile in profiles.tolist() :
            fout.write('{0}\n'.format('\t'.join([str(allele) for allele in profile])))
