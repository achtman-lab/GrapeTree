#Defs
MSTREES_INDELS=["MSA","MSTreeV2","goeMST","iMST","NJ"]
MSTREES=["MSA","MSTreeV2","goeMST","NJ"]


SCRIPTS="~/evaluation/"

FORM, = glob_wildcards("./indels/sim99_00005_00_2000.profile.{form}.V1")

NUMS = range(1,100)
SAMPLES_INDELS = []
for i in range(1,101):
    SAMPLES_INDELS.append("sim"+str(i)+"_00005_00_2000")

SAMPLES, = glob_wildcards("./{samples}.global")


rule all:
    input:
        "indels_badseq.pdf",
        "indels_random.pdf",
        "indels_badsite.pdf",
        "rates.pdf",
        "binned.pdf",
        "divided_rates.pdf",
        "divided_binned.pdf"



#takes tree file for all samples and produces X tree files
rule parse_trees_indels:
    input:
        "indels/{sample_in}.profile.{form}.trees"
    output:
        temp("indels/{sample_in}.profile.{form}_{type,\w+}")
    shell:
        "python2 {SCRIPTS}/parse_trees.py {input} {wildcards.type}"

#takes each tree file for each sample and computes splits
rule compare_trees_mst_indels:
    input:
        "indels/{sample_in}.profile.{form}_{type}",
        "{sample_in}.global"
    output:
        "indels/{sample_in}.profile.{form}_{type}.splits"
    shell:
        "python2 {SCRIPTS}/compare_trees.py {input} 'MST'"


#takes all splits on the same sample and produces one outfile per sample
rule compare_splits_indels:
    input:
        ref="{sample_in}.global.splits",
	profile="indels/{sample_in}.profile",
        splits=expand("indels/{{sample_in}}.profile.{{form}}_{type}.splits", type=MSTREES_INDELS)
    output:
        temp("indels/{sample_in}.profile.{form}.sum")
    shell:
        "python2 {SCRIPTS}/compare.py {input.ref} {input.profile} {output} {input.splits}"


rule collectTrees_indels:
    input:
        "indels/{sample_in}.profile.{form}.V1",
        "indels/{sample_in}.profile.{form}.V2"
    output:
        temp("indels/{sample_in}.profile.{form}.trees")
    shell:
        """
        cat {input} > {wildcards.sample_in}.{wildcards.form}.tmp; for TREE in {MSTREES_INDELS}; do grep " ${{TREE}} " {wildcards.sample_in}.{wildcards.form}.tmp >> {output}; done; rm {wildcards.sa\
mple_in}.{wildcards.form}.tmp
        """



rule collectTrees:
	input:
		"{sample}.profile.V1",
		"{sample}.profile.V2"
	output:
		temp("{sample}.profile.trees")
	shell:
		"""
		cat {input} > {wildcards.sample}.tmp; for TREE in {MSTREES}; do grep " ${{TREE}} " {wildcards.sample}.tmp >> {output}; done; rm {wildcards.sample}.tmp
		"""




#takes tree file for all samples and parse them into X tree files
rule parse_trees:
	input:
		ancient("{sample}.profile.trees")
	output:
		temp("{sample}.profile_{type,\w+}")
	shell:
		"python2 {SCRIPTS}/parse_trees.py {input} {wildcards.type}"



#takes each tree file for each sample and computes splits
rule compare_trees_mst:
	input:
		ancient("{sample}.profile_{type}"),
		"{sample}.global"
	output:
		"{sample}.profile_{type,\w+}.splits"
	shell:
		"python2 {SCRIPTS}/compare_trees.py {input} 'MST'"




rule compute_ref_splits:
    input:
        "{sample}.global",
        "{sample}.global"
    output:
        "{sample}.global.splits"
    shell:
        "python2 {SCRIPTS}/compare_trees.py {input} 'hierarc'"





#takes all outfiles per sample and produces one summary file
rule summary_indels:
    input:
        expand("indels/{sample_in}.profile.{form}.sum", sample_in=SAMPLES_INDELS, form=FORM)
    output:
        "summary_indels_tab_0"
    shell:
        """
	find ./indels/*sum | xargs cat > summary_indels.txt
	grep "#" summary_indels.txt | awk -v OFS='\t' 'BEGIN{{FS="_"}} {{print $4,$5}}' > summary_indels_tab.txt
	sed s/".splits"/""/g summary_indels_tab.txt | grep 'pre\|sens' | paste - - > summary_indels_tab_0
	"""


		
rule divide_quartets:
    input:
        "{sample}.global"
    output:
        temp("{sample}.global.splits_div")
    shell:
        "python2 {SCRIPTS}/divide_quartets.py {input} {output}"
                  


rule sum_binning:
    input:
        expand("{sample}.splits.sum_div", sample=SAMPLES)
    output:
        "summary_binning_50" 
    shell:
        "python2 {SCRIPTS}/sum_binning.py {output} {input}"		

rule compare_divide:
    input:
        ref="{sample}.global.splits_div",
        profile = "{sample}.profile",
        splits=expand("{{sample}}.profile_{type}.splits", type=MSTREES)
    output:
        temp("{sample}.splits.sum_div")
    shell:
        "python2 {SCRIPTS}/compare_divide.py {input.ref} {input.profile} {output} {input.splits}"

rule sum_divided:
    input:
        expand("{sample}.splits.sum_div", sample=SAMPLES)  
    output:
        "summary_divided.txt"
    shell:
        "find ./*sum_div | xargs cat > tmp; grep '#' tmp > summary_divided.txt; rm tmp"


###### PLOTTING #####

rule plot_divided_binned:
    input:
        "summary_binning_50"
    output:
        "divided_binned.pdf"
    priority: 10
    shell:
        """
        grep -v "#" {input} | paste - - > summary_binning_50_divided
        python2 {SCRIPTS}/plot_divided_binned.py summary_binning_50_divided
        """

rule plot_divided:
    input:
        "summary_divided.txt"
    output:
        "divided_rates.pdf"
    priority: 20
    shell:
        """
        grep 'balanced\|unbalanced' {input} | awk -v OFS='\t' 'BEGIN{{FS="_"}} {{print $2,$5}}' | grep 'pre\|sens' | sed s/^0/"0.0"/g | sed s/".splits"/""/g | paste - - > summary_divided_rates
        python2 {SCRIPTS}/plot_divided.py summary_divided_rates
        """
        

rule plot_sens_pre_binned:
    input:
        "summary_binning_50"
    output:
        "binned.pdf"
    priority: 30
    shell:
        """
        grep "#" {input} | cut -c 2- | grep -v 'balanced\|unbalanced' | paste - - > summary_binning_50_undivided 
        python2 {SCRIPTS}/plot_sens_pre_binned.py summary_binning_50_undivided
        """


rule plot_sens_pre:
    input:
        "summary_divided.txt"
    output:
        "rates.pdf"
    priority: 40
    shell:
        """
        grep -v 'balanced\|unbalanced' {input} | awk -v OFS='\t' 'BEGIN{{FS="_"}} {{print $2,$5}}' | sed s/^0/"0.0"/g | sed s/".splits"/""/g | paste - - > summary_tab_0_pre_sens
        python2 {SCRIPTS}/plot_sens_pre.py summary_tab_0_pre_sens
        """


rule plot_indels_sens_pre:
    input:
        "summary_indels_tab_0"
    output:
        "indels_badsite.pdf",
        "indels_random.pdf",
        "indels_badseq.pdf"
    priority: 100
    shell:
        "python2 {SCRIPTS}/plot_indels_sens_pre.py {input}"






