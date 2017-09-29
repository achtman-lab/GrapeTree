import sys
import collections

outfile = sys.argv[1]

input = sys.argv[2:]


chunks = [input[x:x+50] for x in xrange(0, len(input), 50)]

def comp_stats_per_bin(bins,methods):
    stats_bin = {}
    for elem in bins:
        for method in methods:
            len_tp = bins[elem][(method,'tp_b')]
            len_fp = bins[elem][(method,'fp_b')]
            len_fn = bins[elem][(method,'fn_b')]
            stats_bin[(elem,method)] = comp_stats(len_tp,len_fp,len_fn)
            len_tp = bins[elem][(method,'tp_u')]
            len_fp = bins[elem][(method,'fp_u')]
            len_fn = bins[elem][(method,'fn_u')]
            x = comp_stats(len_tp, len_fp, len_fn)
            stats_bin[(elem,method)].extend(x)
            len_tp = bins[elem][(method,'tp_u')] + bins[elem][(method,'tp_b')]
            len_fp = bins[elem][(method,'fp_u')] + bins[elem][(method,'fp_b')]
            len_fn = bins[elem][(method,'fn_u')] + bins[elem][(method,'fn_b')]
            x = comp_stats(len_tp, len_fp, len_fn)
            stats_bin[(elem,method)].extend(x)
    return stats_bin


def comp_stats(len_tp,len_fp,len_fn):
    if len_tp > 0:
        precision = len_tp / float(len_fp + len_tp)
    elif len_fp > 0:
        precision = 0
    else:
        precision = -1
    if len_tp > 0:
        sensitivity = len_tp / float(len_tp + len_fn)
    elif len_fn > 0:
        sensitivity = 0
    else:
        sensitivity = -1
    stats = [precision,sensitivity]
    return stats

out = open(outfile,"w")
for chunk in chunks:
	bins = {}
	for i in range(0,2100,100):
		bins[i] = collections.defaultdict(int)
	methods = set()
	for elem in chunk:	
		f = open(elem,"r")
		for line in f:
			if not line.startswith("#"):
				arr = line.rstrip("\n").split("\t")
				method = arr[0].split("_")[4].split(".")[0]
				methods.add(method)
				bin = int(arr[1])
                #tp_b,fp_b, fn_b,tp_u,fp_u,fn_u
				bins[bin][(method,'tp_b')] += int(arr[2])
				bins[bin][(method,'fp_b')] += int(arr[3])
				bins[bin][(method,'fn_b')] += int(arr[4])
				bins[bin][(method,'tp_u')] += int(arr[5])
				bins[bin][(method,'fp_u')] += int(arr[6])
				bins[bin][(method,'fn_u')] += int(arr[7])
		f.close()

    #compute stats
	stats_bin = comp_stats_per_bin(bins,methods)

	for elem in stats_bin:
		method = elem[1]
		out.write(method+"\t"+str(elem[0])+"\t"+"B"+"\t"+"precision\t"+str(stats_bin[elem][0])+"\n")
		out.write(method+"\t"+str(elem[0]) + "\t"+"B" +"\t"+ "sensitivity\t" + str(stats_bin[elem][1]) + "\n")
		out.write(method+"\t"+str(elem[0]) + "\t" + "U" +"\t"+ "precision\t" + str(stats_bin[elem][2]) + "\n")
		out.write(method+"\t"+str(elem[0]) + "\t" + "U" +"\t"+ "sensitivity\t" + str(stats_bin[elem][3]) + "\n")
		out.write("#"+method+"\t"+str(elem[0]) + "\t" + "precision\t" + str(stats_bin[elem][4]) + "\n")
		out.write("#"+method+"\t"+str(elem[0]) + "\t" + "sensitivity\t" + str(stats_bin[elem][5]) + "\n")

out.close()
