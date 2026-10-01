"""Additional arguments for the installed GrapeTree application."""

import os
import sys

from ._version import __version__
from .module.MSTrees import normalise_tree_arguments, tree_argument_parser


def add_args():
    program_name = os.path.splitext(os.path.basename(sys.argv[0]))[0]
    parser = tree_argument_parser(
        require_profile=False,
        version='{0} {1}'.format(program_name, __version__),
    )
    parser.add_argument('--treefile', help='Existing Newick tree used by --json or --network-format.')
    parser.add_argument('--metadata', '--meta', help='CSV/TSV metadata included by --json.')
    parser.add_argument('--json', dest='visualisation_json', action='store_true', help='Write a reloadable GrapeTree JSON document from --treefile (or a calculated --profile).')
    parser.add_argument('--network-format', choices=['graphml', 'csv', 'json'], help='Export an existing or calculated tree as an analysis-ready network.')
    parser.add_argument('--clusters', '--cluster-threshold', nargs='+', type=float, help='Write UI-equivalent cluster assignments for one or more branch cutoffs.')

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

    return normalise_tree_arguments(args, parser)
