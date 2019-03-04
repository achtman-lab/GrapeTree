# GrapeTree

[![Build Status](https://travis-ci.org/achtman-lab/GrapeTree.svg?branch=master)](https://travis-ci.org/achtman-lab/GrapeTree)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Docs Status](https://readthedocs.org/projects/enterobase/badge/)](http://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html)

**[Click here for the live demo of GrapeTree!](https://achtman-lab.github.io/GrapeTree/MSTree_holder.html)**

GrapeTree is an integral part of EnteroBase and we advise that you use GrapeTree
through EnteroBase for the best results. However, many people have asked for a
stand-alone GrapeTree version that they could use offline or integrate into the
other applications.

The stand-alone version emulates the EnteroBase version through a lightweight
webserver running on your local computer.  You will be interacting with the
program as you would in EnteroBase; through a web browser. We recommend
[Google Chrome](https://www.google.com/chrome/index.html) for best results.

**For detailed help please see: [http://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html](http://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html)**

**For a formal description, please see the accepted manuscript in Genome Research: [https://doi.org/10.1101/gr.232397.117
](https://doi.org/10.1101/gr.232397.117
)**

## Installing and Running GrapeTree
There are number of different ways to interact with GrapeTree, for **best results install via pip** :

```
pip install grapetree
grapetree
```

**We also have ready-made binaries for download here: [https://github.com/achtman-lab/GrapeTree/releases](https://github.com/achtman-lab/GrapeTree/releases)**

**Running on Mac: Download GrapeTree_mac.zip**

You will need to unzip GrapeTree_mac.zip (just double click). Inside there will
be an app you can drag into your Applications folder. You may be warned about
Security settings, if you right click on the GrapeTree app and then click "Open"
it should be fine.

**Running on Windows: Download GrapeTree_win.zip**

Once downloaded, you will need to untzip GrapeTree_win.zip and then open the
extracted folder and  run GrapeTree_win.exe. When you run it the first time on
windows you might get a prompt about security. On Windows 10, click the small
text: "More info", and then the button "Run Anyway".

**Running from Source code**

GrapeTree requires [Python 2.7](https://www.python.org/downloads/release/python-2712/) or [Python 3.6](https://www.python.org/downloads/release/python-360/)
and some additional python modules (listed in requirements.txt). The easiest way
to install these modules is with pip:

```
pip install -r requirements.txt
chmod +x binaries/
```
On Linux or MacOSX you need to make sure the binaries in binaries/ can be
executed. To run GrapeTree;

1. Navigate to the directory where you installed GrapeTree.
1. Run it through python as below.

```
\GrapeTree>python grapetree.py
 * Running on http://127.0.0.1:8000/ (Press CTRL+C to quit)
```

The program will automatically open your web browser and you will see the
GrapeTree Splash Screen. If at anytime you want to restart the page you can
visit [http://localhost:8000](http://localhost:8000) in your web browser. To
view a tree (newick or Nexus) or create a tree from an allele profile, just drag
and drop the file into the browser window.

### Configuration
Runtime behaviour can be configured in grapetree/config.py.

Developers may wish to look at the [JavaScript documentation](https://achtman-lab.github.io/GrapeTree/documentation/developer/index.html) (JSDoc).

### Tests
To run tests, run pytests in the top level directory.
```
pytest

```

## Usage - Command line module for generating Trees
```
>grapetree -h
usage: MSTrees.py [-h] --profile FNAME [--method TREE] [--matrix MATRIX_TYPE]
                  [--recraft] [--missing HANDLER] [--wgMLST]
                  [--heuristic HEURISTIC] [--n_proc NUMBER_OF_PROCESSES]
                  [--check]

For details, see "https://github.com/achtman-lab/GrapeTree/blob/master/README.md".
In brief, GrapeTree generates a NEWICK tree to the default output (screen)
or a redirect output, e.g., a file.

optional arguments:
  -h, --help            show this help message and exit
  --profile FNAME, -p FNAME
                        [REQUIRED] An input filename of a file containing MLST or SNP character data, 
                        OR a fasta file containing aligned sequences.
  --method TREE, -m TREE
                        "MSTreeV2" [DEFAULT]
                        "MSTree"
                        "NJ": FastME V2 NJ tree
                        "RapidNJ": RapidNJ for very large datasets
                        "distance": p-distance matrix in PHYLIP format.
  --matrix MATRIX_TYPE, -x MATRIX_TYPE
                        "symmetric": [DEFAULT: MSTree and NJ]
                        "asymmetric": [DEFAULT: MSTreeV2].
  --recraft, -r         Triggers local branch recrafting. [DEFAULT: MSTreeV2].
  --missing HANDLER, -y HANDLER
                        ONLY FOR symmetric DISTANCE MATRIX.
                        0: [DEFAULT] ignore missing data in pairwise comparison.
                        1: Remove column with missing data.
                        2: treat data as an allele.
                        3: Absolute number of allelic differences.
  --heuristic HEURISTIC, -t HEURISTIC
                        Tiebreak heuristic used only in MSTree and MSTreeV2
                        "eBurst" [DEFAULT: MSTree]
                        "harmonic" [DEFAULT: MSTreeV2]
  --n_proc NUMBER_OF_PROCESSES, -n NUMBER_OF_PROCESSES
                        Number of CPU processes in parallel use. [DEFAULT]: 5.
  --check, -c           Only calculate the expected time/memory requirements.
```
NOTE:
* Detailed descriptions for [--matrix](https://github.com/achtman-lab/GrapeTree/blob/master/documentation/asymmetricDistances.pdf), [--recraft](https://github.com/achtman-lab/GrapeTree/blob/master/documentation/branchRecrafting.pdf) and [--heuristic](https://github.com/achtman-lab/GrapeTree/blob/master/documentation/tiebreak.pdf)

## Inputs
#### profile
The profile file is a tab-delimited text file.

Follow an example here: https://github.com/achtman-lab/GrapeTree/blob/master/examples/simulated_data.profile
```
#Strain	Gene_1	Gene_2	Gene_3	Gene_4	Gene_5	Gene_6	Gene_7	...
0	1	1	1	1	1	1	1	...
1	1	1	1	1	1	1	1	...
2	1	2	2	2	2	2	2	...
...
```
The first row is required and represents column labels. It has to start with a '#'. Collumn labels that start with a '#' are treated as comments and will not be used in downstream analysis. The first column needs to be unique identifiers for strains.
Each of the remaining rows presents a different strain.

Use '-' or '0' to represent missing alleles. 

#### Aligned FASTA
An aligned FASTA file contains multiple sequences of the same length in FASTA format. Many sequence alignment tools, e.g., MAFFT and MUSCLE, use FASTA as a default format for their outputs. 

Find an example here: http://wwwabi.snv.jussieu.fr/public/Clustal2Dna/fastali.html

Note that GrapeTree supports only p-distance for the moment.  

#### metadata
The metadata file is either a tab-delimited or a comma-delimited text file. This is only used for tree presentation in the standardalone version.

Follow an example here: https://github.com/achtman-lab/GrapeTree/blob/master/examples/simulated_data.metadata.txt
```
ID	Country	Year
0	China	1983
1	China	1984
...
```
The first row is required and describes the labels of the columns. If a column labeled with "ID" presents, it will be used to correlate metadata with profiles, otherwise the first column will be used.

## outputs
#### tree
The tree is described in NEWICK format. https://en.wikipedia.org/wiki/Newick_format

#### distance matrix
Use the option '--method distance' to generate a distance matrix without calculating the tree.
The matrix is presented in PHYLIP format. http://evolution.genetics.washington.edu/phylip/doc/distance.html

## Command line examples
#### MSTree V2
```
python grapetree.py -p examples/simulated_data.profile -m MSTreeV2
```
#### NJ tree
```
python grapetree.py -p examples/simulated_data.profile -m NJ
```
#### distance matrix
```
python grapetree.py -p examples/simulated_data.profile -m distance
```

## License
Copyright Warwick University This program is free software: you can
redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but without
any warranty; without even the implied warranty of merchantability or fitness
for a particular purpose. See the GNU General Public License for more
details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <http://www.gnu.org/licenses/>.

## External programs
Detailed information for the standard NJ implemented in FastME V2: http://www.atgc-montpellier.fr/fastme/

## Citation
EnteroMSTree - GrapeTree has been formally accepted by Genome Research. Please use the citation:

Z Zhou, NF Alikhan, MJ Sergeant, N Luhmann, C Vaz, AP Francisco, JA Carrico,
M Achtman (2018) "GrapeTree: Visualization of core genomic relationships among 
100,000 bacterial pathogens", Genome Res; doi:
[https://doi.org/10.1101/gr.232397.117](https://doi.org/10.1101/gr.232397.117)
