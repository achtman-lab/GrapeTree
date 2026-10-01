"""Independent acceptance cases added during the PR #118 review."""

import csv
import io
import json
from itertools import combinations

import networkx as nx
import pytest
from ete3 import Tree

from grapetree.export import cluster_document, network_document, parse_metadata


@pytest.mark.parametrize('output_format', ['graphml', 'json', 'csv'])
@pytest.mark.parametrize('newick', [
    '((a:0,b:1):2,(c:3,d:4):5);',
    '(_hypo_0:1,(_hypo_1:2,beta:0):3);',
])
def test_export_roundtrip_preserves_all_leaf_path_lengths(output_format, newick):
    """Exported networks must retain scientific distances and real sample IDs."""
    output = network_document(newick, output_format)
    if output_format == 'graphml':
        graph = nx.parse_graphml(output)
    elif output_format == 'json':
        document = json.loads(output)
        graph = nx.Graph()
        graph.add_nodes_from((node['id'], node) for node in document['nodes'])
        graph.add_edges_from((edge['source'], edge['target'],
                              {'distance': edge['distance']})
                             for edge in document['links'])
    else:
        graph = nx.Graph()
        for edge in csv.DictReader(io.StringIO(output)):
            graph.add_edge(edge['source'], edge['target'],
                           distance=float(edge['distance']))
    tree = Tree(newick, format=1)
    assert nx.is_tree(graph)
    for left, right in combinations(tree.get_leaf_names(), 2):
        assert nx.shortest_path_length(graph, left, right, weight='distance') == (
            pytest.approx(tree.get_distance(left, right), abs=1e-9)
        )


def test_csv_metadata_preserves_quoted_multiline_values():
    metadata, headers = parse_metadata(
        'ID,Note,Country\r\nalpha,"line one\n\nline two, quoted ""text""",UK\r\n'
    )
    assert headers == ['ID', 'Note', 'Country']
    assert metadata['alpha']['Note'] == 'line one\n\nline two, quoted "text"'


def test_cluster_threshold_is_inclusive_and_memberships_are_nested():
    document = cluster_document(
        '((a:0,b:1):2,(c:0,d:1):3);', [0, 0.999, 1, 2, 3]
    )
    rows = {row['ID']: row for row in csv.DictReader(
        io.StringIO(document), delimiter='\t'
    )}
    assert set(rows) == {'a', 'b', 'c', 'd'}
    expected = [
        [{'a'}, {'b'}, {'c'}, {'d'}],
        [{'a'}, {'b'}, {'c'}, {'d'}],
        [{'a', 'b'}, {'c', 'd'}],
        [{'a', 'b'}, {'c', 'd'}],
        [{'a', 'b', 'c', 'd'}],
    ]
    for column, groups in zip(list(rows['a'])[1:], expected):
        observed = {}
        for name, row in rows.items():
            observed.setdefault(row[column], set()).add(name)
        assert {frozenset(group) for group in observed.values()} == {
            frozenset(group) for group in groups
        }
