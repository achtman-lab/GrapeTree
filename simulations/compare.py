import sys
import collections
import itertools
import time
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


def compare_with_binning(ms_splits,ref_splits,profile):
    tp = []
    fp = []
    fn = []

    #each bin contains 3 list: tp, fp, fn
    bins = {}
    for i in range(0,2100,100):
        bins[i] = collections.defaultdict(list)


    counter = 0
    for quartet in ref_splits:
        counter += 1
        avg_dist = 0
        avg_dist = binning(quartet,profile)
        b = bin_avg(avg_dist)
        if quartet in ms_splits:
            #it is a positive, determine if false or correct
            ref_split = ref_splits[quartet]
            ms_split = ms_splits[quartet]
            if ref_split[0][0] in ms_split[0]:
                #just to double check:
                if ref_split[0][1] in ms_split[0]:
                    tp.append((quartet,avg_dist))
                    bins[b]['tp'].append((quartet,avg_dist))
                else:
                    print "ERROR"
            else:
                #we have a false positive
                fp.append((quartet,avg_dist))
                fn.append((quartet,avg_dist))
                bins[b]['fp'].append((quartet, avg_dist))
                bins[b]['fn'].append((quartet, avg_dist))
        else:
            fn.append((quartet,avg_dist))
            bins[b]['fn'].append((quartet, avg_dist))


    return tp, fp, fn, bins


def comp_stats_per_bin(bins):
    stats_bin = {}
    for elem in bins:
        len_tp = len(bins[elem]['tp'])
        len_fp = len(bins[elem]['fp'])
        len_fn = len(bins[elem]['fn'])
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

        stars = len_fn - len_fp
        if (len_tp + stars + len_fp) > 0:
            accuracy = (len_tp + stars)/ float(len_tp + stars + len_fp)
        else:
            accuracy = -1
        stats_bin[elem] = [precision,sensitivity,f1score,f05score, accuracy]
    return stats_bin


#t0 = time.time()

ref = sys.argv[1]
outfile = sys.argv[3]
pro = sys.argv[2]
others = sys.argv[4:]

ref_splits = read_splits(ref)
ref_splits_old = read_splits_old(ref)
profile = read_profile(pro)

out = open(outfile,"w")
for other in others:
    ms_splits = read_splits(other)
    tp, fp, fn, bins = compare_with_binning(ms_splits,ref_splits, profile)
    stats_bin = comp_stats_per_bin(bins)
    len_ref_splits = 0
    for elem in ref_splits:
        len_ref_splits += len(ref_splits[elem])
    s = 0
    for elem in ms_splits:
        s += len(ms_splits[elem])
    diff = len_ref_splits - s
    tn = 2*len_ref_splits - len(fp)
    len_fp = len(fp)
    len_tp = len(tp)
    len_fn = len(fn)
    precision = len_tp/float(len_fp+len_tp)
    sensitivity = len_tp/float(len_tp+len_fn)
    out.write("#"+other + "\t"+"precision\t" + str(precision)+"\n")
    out.write("#"+other + "\t"+"sensitivity\t" + str(sensitivity)+"\n")
    f1score = 2*((precision*sensitivity)/(precision+sensitivity))
    f05score = (1 + 0.5**2) * ((precision*sensitivity)/(((0.5**2)*precision)+sensitivity))
    f2score = (1 + 2**2) * ((precision*sensitivity)/(((2**2)*precision)+sensitivity))
    accuracy = (len_tp+diff)/float(len_tp+len_fp+diff)

    out.write("#"+other + "\t"+"F1score\t"+str(f1score)+"\n")
    out.write("#"+other + "\t"+"F0.5score\t"+str(f05score)+"\n")
    out.write("#" + other + "\t" + "accuracy\t" + str(accuracy) + "\n")

out.close

#print time.time() - t0, "seconds process time"
