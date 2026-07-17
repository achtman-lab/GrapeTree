"""Command-line argument parsing for GrapeTree."""

import argparse
import os
import sys

from ._version import __version__


def add_args():
    parser = argparse.ArgumentParser(
        description=(
            'For details, see "https://github.com/achtman-lab/GrapeTree/blob/master/README.md".\n'
            'In brief, GrapeTree generates a NEWICK tree to the default output (screen) \n'
            'or a redirect output, e.g., a file. '
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )
    program_name = os.path.splitext(os.path.basename(sys.argv[0]))[0]
    parser.add_argument(
        '--version',
        action='version',
        version='{0} {1}'.format(program_name, __version__),
    )
    parser.add_argument('--profile', '-p', dest='fname', help='An input filename containing MLST/SNP characters or aligned FASTA, or - for standard input. Required unless --treefile is supplied.\n')
    parser.add_argument('--treefile', help='Existing Newick tree used by --json or --network-format.')
    parser.add_argument('--metadata', '--meta', help='CSV/TSV metadata included by --json.')
    parser.add_argument('--json', dest='visualisation_json', action='store_true', help='Write a reloadable GrapeTree JSON document from --treefile (or a calculated --profile).')
    parser.add_argument('--network-format', choices=['graphml', 'csv', 'json'], help='Export an existing or calculated tree as an analysis-ready network.')
    parser.add_argument('--clusters', '--cluster-threshold', nargs='+', type=float, help='Write UI-equivalent cluster assignments for one or more branch cutoffs.')
    parser.add_argument('--method', '-m', dest='tree', help='"MSTreeV2" [DEFAULT]\n"MSTree"\n"NJ": FastME V2 NJ tree\n"RapidNJ": RapidNJ for very large datasets\n"ninja": Alternative NJ algorithm for very large datasets\n"distance": allelic distance matrix in PHYLIP format.', choices=['MSTreeV2', 'MSTree', 'NJ', 'RapidNJ', 'ninja', 'distance'], default='MSTreeV2')
    parser.add_argument('--matrix', '-x', dest='matrix_type', help='"symmetric": [DEFAULT: MSTree, NJ and RapidNJ] \n"asymmetric": [DEFAULT: MSTreeV2].\n"blockwise": (experimental for ordered loci) A different locus is given less penalty (defined by -b) if the previous locus is also different\n', choices=['symmetric', 'asymmetric', 'blockwise'], default='symmetric')
    parser.add_argument('--recraft', '-r', dest='branch_recraft', help='Triggers local branch recrafting. [DEFAULT: MSTreeV2]. ', default=False, action='store_true')
    parser.add_argument('--missing', '-y', dest='handler', help='ONLY FOR symmetric DISTANCE MATRIX. \n0: [DEFAULT] ignore missing data in pairwise comparison. \n1: Remove column with missing data. \n2: treat data as an allele. \n3: Absolute number of allelic differences. ', choices=range(4), default=0, type=int)
    parser.add_argument('--wgMLST', '-w', help='[EXPERIMENTAL] a better support of wgMLST schemes.', default=False, action='store_true')
    parser.add_argument('--heuristic', '-t', dest='heuristic', help='Tiebreak heuristic used only in MSTree and MSTreeV2\n"eBurst" [DEFAULT: MSTree]\n"harmonic" [DEFAULT: MSTreeV2]', choices=['eBurst', 'harmonic'], default='eBurst')
    parser.add_argument('--n_proc', '-n', dest='number_of_processes', help='Number of CPU processes in parallel use. [DEFAULT]: 5. ', type=int, default=5)
    parser.add_argument('--check', '-c', dest='checkEnv', help='Only calculate the expected time/memory requirements. ', default=False, action='store_true')
    parser.add_argument('--block_penalty', '-b', dest='block_penalty', help='[DEFAULT: 0.01] The penalty that is given to a different locus if it is led by another difference. Only works for "-x blockwise"', default=0.01)
    parser.add_argument('--total-loci', type=int, help='Original alignment length when a SNP-only alignment is supplied; used by MSTreeV2 branch recrafting.')

    args = parser.parse_args()
    export_modes = sum(bool(mode) for mode in (
        args.visualisation_json, args.network_format, args.clusters
    ))
    if export_modes > 1:
        parser.error('--json, --network-format, and --clusters are exclusive')
    if args.metadata and not args.visualisation_json:
        parser.error('--metadata requires --json')
    for argument, label in (
        (args.treefile, 'tree'),
        (args.metadata, 'metadata'),
    ):
        if argument and not os.path.isfile(argument):
            parser.error('{0} file does not exist: {1}'.format(label, argument))
    if args.treefile and not export_modes:
        parser.error('--treefile requires --json, --network-format, or --clusters')
    if not args.fname and not args.treefile:
        parser.error('--profile is required unless --treefile is supplied')

    if args.fname == '-':
        args.profile = sys.stdin.read()
        if not args.profile.strip():
            parser.error('standard input is empty')
    elif args.fname and os.path.isfile(args.fname):
        args.profile = args.fname
    elif args.fname:
        parser.error('profile file does not exist: {0}'.format(args.fname))
    args.method = args.tree
    args.n_proc = args.number_of_processes
    args.handle_missing = ['pair_delete', 'complete_delete', 'as_allele', 'absolute_distance'][args.handler]

    if args.matrix_type == 'blockwise':
        if args.method == 'MSTreeV2':
            args.method = 'MSTree'
        sys.stderr.write('You have chosen the "blockwise" matrix. The --recraft option will be disabled and all values in the profile will be treated as real alleles\n\n')
        args.branch_recraft = False
        args.handle_missing = args.block_penalty
    if args.method == 'MSTreeV2':
        args.method = 'MSTree'
        args.matrix_type = 'asymmetric'
        args.heuristic = 'harmonic'
        args.branch_recraft = True
    return args.__dict__
