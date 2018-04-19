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

**For a formal description, please see the preprint: [https://www.biorxiv.org/content/early/2017/11/09/216788](https://www.biorxiv.org/content/early/2017/11/09/216788)**

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

GrapeTree requires [Python 2.7](https://www.python.org/downloads/release/python-2712/) 
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
\GrapeTree>python main.py
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
usage: grapetree [-h] --profile PROFILE [--method METHOD]
                  [--matrix MATRIX_TYPE] [--recraft]
                  [--missing HANDLE_MISSING] [--wgMLST]
                  [--heuristic HEURISTIC] [--n_proc N_PROC] [--check]

Parameters for command line version of GrapeTree. 
You can drag the Newick output into the web interface. 

optional arguments:
  -h, --help            show this help message and exit
  --profile PROFILE, -p PROFILE
                        A file contains either MLST / SNP profiles or multile aligned sequences in fasta format.
  --method METHOD, -m METHOD
                        backend algorithms to call. Allowed values are "MSTreeV2" [default], "MSTree" and "NJ"
  --matrix MATRIX_TYPE, -x MATRIX_TYPE
                        Either "symmetric" [default for MSTree and NJ] 
                        or "asymmetric" [default for MSTreeV2]. 
  --recraft, -r         Allows local branch recrafting after tree construction. Default in MSTreeV2. 
  --missing HANDLE_MISSING, -y HANDLE_MISSING
                        Alternative ways of handling missing data.
                        0: missing data are ignored in pairwise comparisons [default]. 
                        1: Columns that have missing data are ignored in the whole analysis. 
                        2: missing data are treated as a special value (allele). 
                        3: Naive counting of absolute differences between profiles. 
  --wgMLST, -w          Experimental option for a better support of wgMLST schemes.
  --heuristic HEURISTIC, -t HEURISTIC
                        Tiebreak rules between co-optimal edges. Only used in MSTree [default: eBurst] and MSTreeV2 [default: harmonic]
  --n_proc N_PROC, -n N_PROC
                        Number of processes. Default: 5. 
  --check, -c           Do not calculate the tree but only show the expected time/memory consumption. 
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


## Citation 
EnteroMSTree - GrapeTree has not been formally published yet. If
you use GrapeTree please cite the preprint:

Z Zhou, NF Alikhan, MJ Sergeant, N Luhmann, C Vaz, AP Francisco, JA Carrico,
M Achtman (2017) "GrapeTree: Visualization of core genomic relationships
among 100,000 bacterial pathogens", bioRxiv 216788; doi:
[https://doi.org/10.1101/216788](https://doi.org/10.1101/216788)
