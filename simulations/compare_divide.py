import sys
import collections
import itertools
import numpy as np
from scipy import spatial

def read_splits(file):
    f = open(file,"r")
    splits_hash = collections.defaultdict(list)
    for line in f:
        s = line.rstrip("\n").split("|")
        left = s[0].split(",")
        tup1 = sorted(map(int, left))
        right = s[1].split(",")
        tup2 = sorted(map(int, right))
        elems = tuple(sorted(tup1 + tup2))

        tup1 = tuple(tup1)
        tup2 = tuple(tup2)
        splits_hash[elems].append((tup1,tup2))
    f.close()
    return splits_hash


def read_splits_ref(file):
    f = open(file,"r")
    splits_hash = collections.defaultdict(list)
    type_hash = {}
    for line in f:
        arr = line.split("\t")
        if arr[0] == "BALANCED":
            b = "B"
        elif arr[0] == "UNBALANCED":
            b = "U"
        else:
            print "ERROR"
        s = arr[1].rstrip("\n").split("|")
        left = s[0].split(",")
        tup1 = sorted(map(int, left))
        right = s[1].split(",")
        tup2 = sorted(map(int, right))
        elems = tuple(sorted(tup1 + tup2))

        tup1 = tuple(tup1)
        tup2 = tuple(tup2)
        splits_hash[elems].append((tup1, tup2))
        type_hash[elems] = b
    f.close()
    return splits_hash, type_hash



def read_splits_old(file):
    f = open(file,"r")
    splits_hash = collections.defaultdict(list)
    for line in f:
        s = line.rstrip("\n").split("|")
        left = s[0].split(",")
        tup1 = tuple(sorted(map(int, left)))
        right = s[1].split(",")
        tup2 = tuple(sorted(map(int, right)))
        splits_hash[tup1].append(tup2)
    f.close()
    return splits_hash

#for each quartet, compute bin according to allel diff rate
def binning(quartet, profile):
    dists = []
    for pair in itertools.combinations(quartet, 2):
        prof1 = profile[pair[0]]
        prof2 = profile[pair[1]]
        dist = spatial.distance.hamming(prof1, prof2)
        dists.append(dist*2000)
    avg_dist = float(sum(dists))/6

    return avg_dist



def read_profile(file):
    f = open(file,"r")
    profile = {}
    for line in f:
        if not line.startswith("#"):
            arr = line.rstrip("\n").split("\t")
            id = int(arr[0])
            allels = np.array(arr[1:])
            profile[id] = allels
    f.close()
    return profile


def bin_avg(avg):
    bin = 0
    if 0 <= avg < 50:
        bin = 0
    elif 50 <= avg < 150:
        bin = 100
    elif 150 <= avg < 250:
        bin = 200
    elif 250 <= avg < 350:
        bin = 300
    elif 350 <= avg < 450:
        bin = 400
    elif 450 <= avg < 550:
        bin = 500
    elif 550 <= avg < 650:
        bin = 600
    elif 650 <= avg < 750:
        bin = 700
    elif 750 <= avg < 850:
        bin = 800
    elif 850 <= avg < 950:
        bin = 900
    elif 950 <= avg < 1050:
        bin = 1000
    elif 1050 <= avg < 1150:
        bin = 1100
    elif 1150 <= avg < 1250:
        bin = 1200
    elif 1250 <= avg < 1350:
        bin = 1300
    elif 1350 <= avg < 1450:
        bin = 1400
    elif 1450 <= avg < 1550:
        bin = 1500
    elif 1550 <= avg < 1650:
        bin = 1600
    elif 1650 <= avg < 1750:
        bin = 1700
    elif 1750 <= avg < 1850:
        bin = 1800
    elif 1850 <= avg <= 1950:
        bin = 1900
    else:
        bin = 2000

    return bin


def compare_with_binning(ms_splits,ref_splits,profile,type):
    splits = collections.defaultdict(list)

    #each bin contains 3 list: tp, fp, fn
    bins = {}
    for i in range(0,2100,100):
        bins[i] = collections.defaultdict(list)


    counter = 0
    for quartet in ref_splits:
        quartet_type = type[quartet]
        counter += 1
        avg_dist = binning(quartet,profile)
        b = bin_avg(avg_dist)
        if quartet in ms_splits:
            #it is a positive, determine if false or correct
            ref_split = ref_splits[quartet]
            ms_split = ms_splits[quartet]
            if ref_split[0][0] in ms_split[0]:
                #just to double check:
                if ref_split[0][1] in ms_split[0]:
                    if quartet_type == "B":
                        splits['tp_b'].append((quartet,avg_dist))
                        bins[b]['tp_b'].append((quartet, avg_dist))
                    elif quartet_type == "U":
                        splits['tp_u'].append((quartet, avg_dist))
                        bins[b]['tp_u'].append((quartet, avg_dist))
                    else:
                        print "ERROR"
                    #tp.append((quartet,avg_dist))
                    #bins[b]['tp'].append((quartet,avg_dist))
                else:
                    print "ERROR"
            else:
                #we have a false positive
                if quartet_type == "B":
                    splits['fp_b'].append((quartet, avg_dist))
                    bins[b]['fp_b'].append((quartet, avg_dist))
                    splits['fn_b'].append((quartet, avg_dist))
                    bins[b]['fn_b'].append((quartet, avg_dist))
                elif quartet_type == "U":
                    splits['fp_u'].append((quartet, avg_dist))
                    bins[b]['fp_u'].append((quartet, avg_dist))
                    splits['fn_u'].append((quartet, avg_dist))
                    bins[b]['fn_u'].append((quartet, avg_dist))
                else:
                    print "ERROR"
                #fp.append((quartet,avg_dist))
                #fn.append((quartet,avg_dist))
                #bins[b]['fp'].append((quartet, avg_dist))
                #bins[b]['fn'].append((quartet, avg_dist))
        else:
            if quartet_type == "B":
                splits['fn_b'].append((quartet, avg_dist))
                bins[b]['fn_b'].append((quartet, avg_dist))
            elif quartet_type == "U":
                splits['fn_u'].append((quartet, avg_dist))
                bins[b]['fn_u'].append((quartet, avg_dist))
            #fn.append((quartet,avg_dist))
            #bins[b]['fn'].append((quartet, avg_dist))


    return splits, bins


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
    if precision > 0 and sensitivity > 0:
        f1score = 2 * ((precision * sensitivity) / (precision + sensitivity))
        f05score = (1 + 0.5 ** 2) * ((precision * sensitivity) / (((0.5 ** 2) * precision) + sensitivity))
    else:
        f1score = -1
        f05score = -1
    stats = [precision,sensitivity]
    return stats



#t0 = time.time()

ref = sys.argv[1]
outfile = sys.argv[3]
pro = sys.argv[2]
others = sys.argv[4:]

ref_splits, split_types = read_splits_ref(ref)
profile = read_profile(pro)

out = open(outfile,"w")



for elem in others:
        
        ms_splits = read_splits(elem)
        splits, bins = compare_with_binning(ms_splits,ref_splits, profile,split_types)
		
		#divided+rates
        len_tp = len(splits['tp_b'])
        len_fp = len(splits['fp_b'])
        len_fn = len(splits['fn_b'])
        stats = comp_stats(len_tp,len_fp,len_fn)
        out.write("#"+elem + "\t"+"balanced"+"\t"+"precision\t" + str(stats[0])+"\n")
        out.write("#"+elem + "\t"+"balanced"+"\t"+"sensitivity\t" + str(stats[1])+"\n")
        len_tp = len(splits['tp_u'])
        len_fp = len(splits['fp_u'])
        len_fn = len(splits['fn_u'])
        stats = comp_stats(len_tp, len_fp, len_fn)
        out.write("#"+elem + "\t" + "unbalanced" + "\t" + "precision\t" + str(stats[0]) + "\n")
        out.write("#"+elem + "\t" + "unbalanced" +"\t"+ "sensitivity\t" + str(stats[1]) + "\n")

	    #undivided+rates
        len_tp = len(splits['tp_u']) + len(splits['tp_b'])
        len_fp = len(splits['fp_u']) + len(splits['fp_b'])
        len_fn = len(splits['fn_u']) + len(splits['fn_b'])
        stats = comp_stats(len_tp, len_fp, len_fn)
        out.write("#"+elem + "\t" + "precision\t" + str(stats[0]) + "\n")
        out.write("#"+elem + "\t" + "sensitivity\t" + str(stats[1]) + "\n")
		
			
        for bin in bins:
            out.write(elem+"\t"+str(bin)+"\t"+str(len(bins[bin]['tp_b']))+"\t"+str(len(bins[bin]['fp_b']))
        		+"\t"+str(len(bins[bin]['fn_b']))+"\t"+
                  str(len(bins[bin]['tp_u'])) + "\t" + str(len(bins[bin]['fp_u']))
                  +"\t"+str(len(bins[bin]['fn_u']))+"\n")


out.close()








#print time.time() - t0, "seconds process time"
