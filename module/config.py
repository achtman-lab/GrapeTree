import os 

VERSION = '1.3.5'
JAVASCRIPT_VERSION = '0.1.8'
DEBUG = False
PORT = 8000

# MS Tree generation options
PARAMS = dict(method='MST', #MST, NJ
              matrix_type='asymmetric',
              edge_weight = 'harmonic',
              neighbor_branch_reconnection='T',
              ninja = 'ninja',
              NJ_Windows = os.path.join('binaries', 'fastme.exe'), 
              NJ_Darwin = os.path.join('binaries', 'fastme-2.1.5-osx'), 
              NJ_Linux = os.path.join('binaries', 'fastme-2.1.5-linux32'),
              edmonds_Windows = os.path.join('binaries', 'edmonds.exe'), 
              edmonds_Darwin = os.path.join('binaries', 'edmonds-osx'), 
              edmonds_Linux = os.path.join('binaries', 'edmonds-linux')
              )