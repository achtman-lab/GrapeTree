VERSION = '0.0.1'
DEBUG = False
PORT = 8000

# MS Tree generation options
PARAMS = dict(method='MST',
              matrix_type='asymmetric', 
              edge_weight = 'harmonic', 
              neighbor_branch_reconnection='T',
              ninja = 'ninja')