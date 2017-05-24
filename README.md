# EnteroMSTree - GrapeTree

[![Build Status](https://travis-ci.org/martinSergeant/EnteroMSTree.svg?branch=master)](https://travis-ci.org/martinSergeant/EnteroMSTree)

## Installation 
EnteroMSTree - GrapeTree requires on Python 2.7 and some additional python
modules (listed in requirements.txt), easiest way to install these modules is
with pip:

```bash
pip install -r requirements.txt
chmod +x binaries/

```
On Linx or MacOSX you need to make sure the binaries in binaries/ can be executed.


## Usage - Webapplication (GrapeTree)
Running main.py will launch the application. This will run the lightweight webserver 
```bash
python main.py

```

The application should open your browser to the correct page, but you can navigate 
there yourself (usually http://localhost:8000/). 

To view a tree (newick or Nexus), just drag and drop the file into the browser 
window. 

### Configuration
Runtime behaviour can be configured in grapetree/config.py 

### Precompiled binaries 
Binaries will be made available for Windows and MacOSX (see Releases).


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
Copyright Warwick University
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but without any warranty; without even the implied warranty of merchantability or fitness for a particular purpose. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


## Citation
EnteroMSTree - GrapeTree has not been formally published yet. If you use GrapeTree please cite the website directly: https://github.com/martinSergeant/EnteroMSTree.

An extended citation could be:
Z Zhou,  MJ Sergeant, NF Alikhan, M Achtman  (2017) "GrapeTree: Phylogenetic visualisation for large genomic datasets", Available: https://github.com/martinSergeant/EnteroMSTree
