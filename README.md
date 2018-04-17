# GrapeTree

[Click here for the live demo of GrapeTree!](https://achtman-lab.github.io/GrapeTree/MSTree_holder.html)

GrapeTree is an integral part of EnteroBase and we advise that you use GrapeTree
through EnteroBase for the best results. However, many people have asked for a 
stand-alone GrapeTree version that they could use offline or integrate into the
other applications. 

The stand-alone version emulates the EnteroBase version through a lightweight 
webserver running on your local computer.  You will be interacting with the 
program as you would in EnteroBase; through a web browser. We recommend 
[Google Chrome](https://www.google.com/chrome/index.html) for best results.

**For detailed help please see: http://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html**

**For a formal description, please see the preprint:  https://www.biorxiv.org/content/early/2017/11/09/216788**

## Installing and Running GrapeTree
There are number of different ways to interact with GrapeTree, the easiest to 
download the software here: [https://github.com/achtman-lab/GrapeTree/releases](https://github.com/achtman-lab/GrapeTree/releases)

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

EnteroMSTree - GrapeTree requires [Python 2.7](https://www.python.org/downloads/release/python-2712/) 
and some additional python modules (listed in requirements.txt). The easiest way
to install these modules is with pip:

```
#!bash

pip install -r requirements.txt
chmod +x binaries/
```
On Linux or MacOSX you need to make sure the binaries in binaries/ can be
executed. To run GrapeTree;

1. Navigate to the directory where you installed GrapeTree. 
1. Run it through python as below. 

```
#!bash

\GrapeTree>python main.py
 * Running on http://127.0.0.1:8000/ (Press CTRL+C to quit)
```

**Running GrapeTree with no installation**

The program will automatically open your web browser and you will see the 
GrapeTree Splash Screen. If at anytime you want to restart the page you can 
visit [http://localhost:8000](http://localhost:8000) in your web browser. To 
view a tree (newick or Nexus) or create a tree from an allele profile, just drag
and drop the file into the browser window. 

### Configuration
Runtime behaviour can be configured in grapetree/config.py 

### Tests
To run tests, run pytests in the top level directory.
```bash
pytest

```

## Usage - Command line module for generating Trees - MSTrees.py
### parameters :
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
https://doi.org/10.1101/216788
